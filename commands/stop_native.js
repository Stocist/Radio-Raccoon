"use strict";

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "stop",
  description: "Stop playback (queue is preserved)",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      client.audio?.player?.stop();
      const embed = new EmbedBuilder().setColor("#ff5555").setTitle("Stopped").setDescription("Queue preserved. Use /clear to empty queue.");
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("stop_native error:", e);
      return interaction.reply({ content: "Failed to stop.", ephemeral: true });
    }
  }
};


