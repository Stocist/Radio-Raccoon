"use strict";

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  getVoiceConnection
} = require("@discordjs/voice");

class VoiceConnectionManager {
  constructor() {
    this.guildIdToConnection = new Map();
  }

  getConnection(guildId) {
    return this.guildIdToConnection.get(guildId) || getVoiceConnection(guildId) || null;
  }

  async connect({ guildId, channelId, adapterCreator }) {
    const existing = this.getConnection(guildId);
    if (existing) return existing;

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    this.guildIdToConnection.set(guildId, connection);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
        ]);
        // Recovered
      } catch {
        this.destroy(guildId);
      }
    });

    connection.on("error", () => {
      this.destroy(guildId);
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    return connection;
  }

  destroy(guildId) {
    const connection = this.guildIdToConnection.get(guildId) || getVoiceConnection(guildId);
    if (connection) {
      try { connection.destroy(); } catch {}
    }
    this.guildIdToConnection.delete(guildId);
  }
}

module.exports = {
  VoiceConnectionManager
};
