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
      const resolved = await client.audio.resolver.resolve(query);

      const enqueueTrack = async (track) => {
        if (player && player.state?.status && player.state.status !== 'idle') {
          client.audio.addToQueue(interaction.guildId, track);
          return 'queued';
        } else {
          await client.audio.playTrack(interaction.guildId, track);
          return 'now';
        }
      };

      if (Array.isArray(resolved)) {
        let firstPlayed = null;
        for (let i = 0; i < resolved.length; i++) {
          const r = await enqueueTrack(resolved[i]);
          if (!firstPlayed && r === 'now') firstPlayed = resolved[i];
        }
        const count = resolved.length;
        const embed = new EmbedBuilder()
          .setColor('#4d9fd6')
          .setTitle('Playlist Added')
          .setDescription(`Enqueued ${count} tracks${firstPlayed ? `, now playing: [${firstPlayed.title}](${firstPlayed.url})` : ''}`);
        await interaction.editReply({ embeds: [embed] });
      } else {
        const r = await enqueueTrack(resolved);
        const embed = new EmbedBuilder()
          .setColor(r === 'now' ? '#00cc88' : '#4d9fd6')
          .setTitle(r === 'now' ? 'Now Playing' : 'Queued')
          .setDescription(`[${resolved.title}](${resolved.url})`)
          .setThumbnail(resolved.thumbnail || null);
        await interaction.editReply({ embeds: [embed] });
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
