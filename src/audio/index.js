"use strict";

const { VoiceConnectionManager } = require("./VoiceConnectionManager");
const { AudioPlayerWrapper } = require("./AudioPlayer");
const { AudioEncoder } = require("./AudioEncoder");
const { QueueManager } = require("./QueueManager");
const TrackResolver = require("./TrackResolver");
const playdl = require("play-dl");
const { spawn } = require("child_process");

function initializeAudio(client, options = {}) {
  const voice = new VoiceConnectionManager();
  const player = new AudioPlayerWrapper();
  const encoder = new AudioEncoder(options.encoder);
  const queues = new QueueManager();
  const resolver = new TrackResolver();
  const players = new Map();
  const current = new Map();

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
      try {
        const subprocess = spawn("yt-dlp", ["-o", "-", "-f", "bestaudio/best", "-r", "2M", urlToStream], {
          stdio: ["ignore", "pipe", "ignore"]
        });
        const opusStream = encoder.createOpusStream(subprocess.stdout);
        player.play(opusStream);
        current.set(guildId, track);
      } catch (e1) {
        // Fallback to play-dl
        const info = await playdl.video_info(urlToStream);
        const { stream } = await playdl.stream_from_info(info, { quality: 2 });
        const opusStream = encoder.createOpusStream(stream);
        player.play(opusStream);
        current.set(guildId, track);
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
