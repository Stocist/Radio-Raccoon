"use strict";

const { VoiceConnectionManager } = require("./VoiceConnectionManager");
const { AudioPlayerWrapper } = require("./AudioPlayer");
const { AudioEncoder } = require("./AudioEncoder");
const { QueueManager } = require("./QueueManager");
const TrackResolver = require("./TrackResolver");
const playdl = require("play-dl");
const { spawn } = require("child_process");
const { AudioPlayerStatus } = require("@discordjs/voice");

function initializeAudio(client, options = {}) {
  const voice = new VoiceConnectionManager();
  const player = new AudioPlayerWrapper();
  const encoder = new AudioEncoder(options.encoder);
  const queues = new QueueManager();
  const resolver = new TrackResolver();
  const players = new Map();
  const current = new Map();
  
  // Auto-play next track when current ends
  player.player.on('stateChange', async (oldState, newState) => {
    if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
      // Song ended, play next in queue
      for (const [guildId, currentTrack] of current) {
        const next = queues.nextTrack(guildId);
        if (next) {
          console.log(`[AutoPlay] Playing next track: ${next.title}`);
          try {
            await client.audio.playTrack(guildId, next);
          } catch (err) {
            console.error('[AutoPlay] Failed to play next track:', err);
          }
        } else {
          console.log('[AutoPlay] Queue empty, stopping playback');
          current.delete(guildId);
        }
      }
    }
  });

  // Optional: configure Spotify credentials for play-dl if provided
  (async () => {
    try {
      const cid = process.env.SPOTIFY_CLIENT_ID;
      const secret = process.env.SPOTIFY_CLIENT_SECRET;
      const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
      if (cid && secret) {
        await playdl.setToken({
          spotify: {
            client_id: cid,
            client_secret: secret,
            refresh_token: refresh || undefined
          }
        });
        // eslint-disable-next-line no-console
        console.log("Spotify token configured for play-dl");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to configure Spotify token:", e?.message || e);
    }
  })();

  client.audio = {
    voice,
    player,
    encoder,
    queues,
    resolver,
    players,
    current,

    // Join a voice channel, creating or reusing an existing connection
    async joinChannel(guildId, channelId, { selfDeaf = true } = {}) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        throw new Error("Guild not found in cache");
      }
      const connection = await voice.connect({
        guildId,
        channelId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf
      });
      // Ensure the player is subscribed for this guild
      player.subscribe(connection);
      // Store the low-level @discordjs/voice AudioPlayer so callers can read .state.status
      players.set(guildId, player.player);
      return connection;
    },

    addToQueue(guildId, track) {
      queues.addTrack(guildId, track);
    },

    async playTrack(guildId, track) {
      // Ensure connection exists and player subscribed
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        throw new Error("Guild not found in cache");
      }

      let connection = voice.getConnection(guildId);
      if (!connection) {
        // Attempt to infer a channel from the requesting member is handled by caller via joinChannel
        throw new Error("No voice connection for guild. Call joinChannel first.");
      }

      player.subscribe(connection);
      players.set(guildId, player.player);
      
      // Resolve track if it's lazy-loaded (Spotify/playlist)
      if (track.needsResolve && track.spotifyQuery) {
        console.log(`[Perf] Lazy-resolving Spotify track: ${track.title}`);
        const tResolveStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
        const resolved = await resolver.searchYouTubeAsTrack(track.spotifyQuery);
        Object.assign(track, resolved, { needsResolve: false });
        if (tResolveStart) {
          const tResolveEnd = process.hrtime.bigint();
          const resolveMs = Number(tResolveEnd - tResolveStart) / 1e6;
          console.log(`[Perf] Lazy resolution took: ${resolveMs.toFixed(1)} ms`);
        }
      }

      // Stream audio: yt-dlp first, play-dl fallback
      const isValidHttpUrl = (value) => {
        try {
          const u = new URL(value);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      };

      let urlToStream = track?.url;
      if (!isValidHttpUrl(urlToStream) && track?.id) {
        urlToStream = `https://www.youtube.com/watch?v=${track.id}`;
      }
      if (!isValidHttpUrl(urlToStream)) {
        throw new Error("Resolved track has no valid URL");
      }

      // Try yt-dlp piping into ffmpeg via stdin (most resilient)
      const tStreamStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
      try {
        const subprocess = spawn("yt-dlp", [
          "-o", "-", 
          "-f", "bestaudio[acodec=opus]/bestaudio/best",  // Prefer Opus, then best available
          "--audio-quality", "0",  // Best audio quality
          "--no-part",  // Don't use .part files
          urlToStream
        ], {
          stdio: ["ignore", "pipe", "ignore"]
        });
        const opusStream = encoder.createOpusStream(subprocess.stdout);
        player.play(opusStream);
        current.set(guildId, track);
        if (tStreamStart) {
          const tStreamReady = process.hrtime.bigint();
          const startMs = Number(tStreamReady - tStreamStart) / 1e6;
          console.log(`[Perf] Stream started via yt-dlp -> ffmpeg -> opus in ${startMs.toFixed(1)} ms`);
        }
      } catch (e1) {
        // Fallback to play-dl
        const tFallbackStart = typeof process.hrtime === 'function' && process.hrtime.bigint ? process.hrtime.bigint() : null;
        const info = await playdl.video_info(urlToStream);
        const { stream } = await playdl.stream_from_info(info, { quality: 2 });
        const opusStream = encoder.createOpusStream(stream);
        player.play(opusStream);
        current.set(guildId, track);
        if (tFallbackStart) {
          const tFallbackEnd = process.hrtime.bigint();
          const fallbackMs = Number(tFallbackEnd - tFallbackStart) / 1e6;
          console.log(`[Perf] Stream started via play-dl fallback in ${fallbackMs.toFixed(1)} ms`);
        }
      }
    }
  };

  // Expose a lightweight helper for later commands to use
  client.audio.getOrConnect = async ({ guild, channelId }) => {
    return voice.connect({
      guildId: guild.id,
      channelId,
      adapterCreator: guild.voiceAdapterCreator
    });
  };
}

module.exports = { initializeAudio };
