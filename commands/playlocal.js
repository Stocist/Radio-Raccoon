const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'play',
  description: 'Play or resume using the native pipeline (no Lavalink)',
  permissions: '0x0000000000000800',
  options: [
    {
      name: 'query',
      description: 'Song name or YouTube URL',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  run: async (client, interaction) => {
    try {
      const tCommandStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
      const member = interaction.member;
      const voiceChannelId = member?.voice?.channelId;
      if (!voiceChannelId) {
        return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
      }

      const query = interaction.options.getString('query');

      await interaction.deferReply();

      // Ensure audio system is initialized
      if (!client.audio) {
        const { initializeAudio } = require('../src/audio');
        initializeAudio(client);
      }

      await client.audio.joinChannel(interaction.guildId, voiceChannelId, { selfDeaf: true });

      // If no query is provided, attempt to resume or start next in queue
      const lowLevelPlayer = client.audio.players.get(interaction.guildId);
      if (!query) {
        if (lowLevelPlayer && lowLevelPlayer.state?.status === 'paused') {
          client.audio.player.resume();
          const embed = new EmbedBuilder().setColor('#00cc88').setTitle('Resumed');
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        const next = client.audio.queues.nextTrack(interaction.guildId);
        if (next) {
          await client.audio.playTrack(interaction.guildId, next);
          const embed = new EmbedBuilder()
            .setColor('#00cc88')
            .setTitle('Now Playing')
            .setDescription(`[${next.title}](${next.url})`)
            .setThumbnail(next.thumbnail || null);
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        const embed = new EmbedBuilder().setColor('#ffaa00').setTitle('Nothing to play').setDescription('Queue is empty. Provide a query to add and play.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Resolve may return a single track or an array (playlist/spotify)
      const player = client.audio.players.get(interaction.guildId);
      const tResolveStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
      const resolved = await client.audio.resolver.resolve(query);
      if (tResolveStart) {
        const tResolveEnd = process.hrtime.bigint();
        const resolveMs = Number(tResolveEnd - tResolveStart) / 1e6;
        console.log(`[Perf] Resolve time: ${resolveMs.toFixed(1)} ms`);
      }

      const enqueueTrack = async (track, resolveNow = false) => {
        // Only resolve if explicitly requested (for first track to play immediately)
        if (resolveNow && track.needsResolve && track.spotifyQuery) {
          try {
            const resolved = await client.audio.resolver.searchYouTubeAsTrack(track.spotifyQuery);
            Object.assign(track, resolved, { needsResolve: false });
          } catch (err) {
            console.error(`Failed to resolve track: ${track.title}`, err);
            return 'failed';
          }
        }
        
        if (player && player.state?.status && player.state.status !== 'idle') {
          client.audio.addToQueue(interaction.guildId, track);
          return 'queued';
        } else {
          await client.audio.playTrack(interaction.guildId, track);
          return 'now';
        }
      };

      if (Array.isArray(resolved)) {
        const count = resolved.length;
        
        // Determine if player is idle
        const isIdle = !player || !player.state?.status || player.state.status === 'idle';
        
        // Add ALL tracks to queue immediately (with placeholder metadata)
        let firstToPlay = null;
        resolved.forEach((track, index) => {
          if (index === 0 && isIdle) {
            firstToPlay = track;  // First track will be played
          } else {
            // Add to queue immediately without resolution
            client.audio.addToQueue(interaction.guildId, track);
          }
        });
        
        // Update UI immediately with full playlist info
        const embed = new EmbedBuilder()
          .setColor('#4d9fd6')
          .setTitle('Playlist Added')
          .setDescription(`Added ${count} tracks to queue${firstToPlay ? `, now playing: [${firstToPlay.title}](${firstToPlay.url || 'resolving...'})` : ''}`);
        await interaction.editReply({ embeds: [embed] });
        
        // If we need to play the first track, do it now
        if (firstToPlay) {
          await client.audio.playTrack(interaction.guildId, firstToPlay);
        }
        
        // Background resolution of remaining tracks (don't block)
        const resolveRemainingTracks = async () => {
          const startIdx = firstToPlay ? 1 : 0;
          for (let i = startIdx; i < resolved.length; i++) {
            const track = resolved[i];
            if (track.needsResolve && track.spotifyQuery) {
              try {
                const resolvedData = await client.audio.resolver.searchYouTubeAsTrack(track.spotifyQuery);
                Object.assign(track, resolvedData, { needsResolve: false });
                console.log(`[Background] Resolved track ${i + 1}/${count}: ${track.title}`);
              } catch (err) {
                console.error(`[Background] Failed to resolve track ${i}: ${track.title}`, err);
              }
              // Small delay to not overwhelm the API
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          console.log(`[Background] Finished resolving ${count} tracks`);
        };
        resolveRemainingTracks(); // Fire and forget
        
      } else {
        // Single track handling
        const isIdle = !player || !player.state?.status || player.state.status === 'idle';
        
        if (isIdle) {
          // Play immediately
          const tPlayScheduleStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
          await client.audio.playTrack(interaction.guildId, resolved);
          if (tPlayScheduleStart) {
            const tPlayScheduleEnd = process.hrtime.bigint();
            const scheduleMs = Number(tPlayScheduleEnd - tPlayScheduleStart) / 1e6;
            console.log(`[Perf] Scheduled single track for play in ${scheduleMs.toFixed(1)} ms`);
          }
          const embed = new EmbedBuilder()
            .setColor('#00cc88')
            .setTitle('Now Playing')
            .setDescription(`[${resolved.title}](${resolved.url || 'resolving...'})`)
            .setThumbnail(resolved.thumbnail || null);
          await interaction.editReply({ embeds: [embed] });
        } else {
          // Add to queue
          client.audio.addToQueue(interaction.guildId, resolved);
          const embed = new EmbedBuilder()
            .setColor('#4d9fd6')
            .setTitle('Queued')
            .setDescription(`[${resolved.title}](${resolved.url || 'resolving...'})`)
            .setThumbnail(resolved.thumbnail || null);
          await interaction.editReply({ embeds: [embed] });
          
          // Resolve in background if needed
          if (resolved.needsResolve && resolved.spotifyQuery) {
            client.audio.resolver.searchYouTubeAsTrack(resolved.spotifyQuery)
              .then(resolvedData => {
                Object.assign(resolved, resolvedData, { needsResolve: false });
                console.log(`[Background] Resolved queued track: ${resolved.title}`);
              })
              .catch(err => console.error(`[Background] Failed to resolve queued track: ${resolved.title}`, err));
          }
        }
      }
      if (tCommandStart) {
        const tCommandEnd = process.hrtime.bigint();
        const totalMs = Number(tCommandEnd - tCommandStart) / 1e6;
        console.log(`[Perf] Command total time (until reply queued): ${totalMs.toFixed(1)} ms`);
      }
    } catch (error) {
      console.error('playlocal error:', error);
      const embed = new EmbedBuilder().setColor('#ff0000').setTitle('Error').setDescription('Failed to play.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
