"use strict";

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "skip",
  description: "Skip current track (native)",
  permissions: "0x0000000000000800",
  options: [
    {
      name: 'track_no',
      description: 'Skip directly to this queue index (1-based)',
      type: 4,
      required: false
    }
  ],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      const index = interaction.options.getInteger?.('track_no');
      let next;
      if (index && index > 0) {
        next = client.audio?.queues?.skipToIndex(guildId, index);
      } else {
        next = client.audio?.queues?.nextTrack(guildId);
      }
      if (!next) {
        client.audio?.player?.stop();
        return interaction.reply({ content: "Queue empty. Stopped.", ephemeral: true });
      }
      await client.audio.playTrack(guildId, next);
      const embed = new EmbedBuilder().setColor("#4d9fd6").setTitle("Skipped").setDescription(`Now playing: ${next.title}`);
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error("skip_native error:", e);
      return interaction.reply({ content: "Failed to skip.", ephemeral: true });
    }
  }
};


