"use strict";

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "leave",
  description: "Disconnect the bot from the voice channel",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;

      const connection = client.audio?.voice?.getConnection(guildId);
      if (!connection) {
        return interaction.reply({ content: "I'm not connected to a voice channel.", ephemeral: true });
      }

      // Stop playback if any
      try { client.audio?.player?.stop(); } catch {}

      // Disconnect and cleanup
      try { client.audio?.voice?.destroy(guildId); } catch {}
      try { client.audio?.players?.delete?.(guildId); } catch {}
      try { client.audio?.current?.delete?.(guildId); } catch {}

      const embed = new EmbedBuilder().setColor("#ff5555").setTitle("Disconnected").setDescription("Left the voice channel.");
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("leave_native error:", e);
      return interaction.reply({ content: "Failed to disconnect.", ephemeral: true });
    }
  }
};



