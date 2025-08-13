"use strict";

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "resume",
  description: "Resume the native audio player",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      const player = client.audio?.players?.get(guildId);
      if (!player) {
        return interaction.reply({ content: "Nothing is paused.", ephemeral: true });
      }
      client.audio.player.resume();
      const embed = new EmbedBuilder().setColor("#00cc88").setTitle("Resumed");
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("resume_native error:", e);
      return interaction.reply({ content: "Failed to resume.", ephemeral: true });
    }
  }
};


