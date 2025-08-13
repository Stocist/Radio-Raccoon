"use strict";

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "pause",
  description: "Pause the native audio player",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      const player = client.audio?.players?.get(guildId);
      if (!player) {
        return interaction.reply({ content: "Nothing is playing.", ephemeral: true });
      }
      client.audio.player.pause();
      const embed = new EmbedBuilder().setColor("#ffaa00").setTitle("Paused");
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("pause_native error:", e);
      return interaction.reply({ content: "Failed to pause.", ephemeral: true });
    }
  }
};


