"use strict";

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

module.exports = {
  name: "queue",
  description: "Show the current queue",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      const now = client.audio?.current?.get(guildId);
      const queue = client.audio?.queues?.getQueue(guildId) || [];

      const items = queue.map((t, i) => `${i + 1}. ${t.title || 'Unknown'}${t.duration ? ` (${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,'0')})` : ''}`);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
      let page = 1;

      const render = () => {
        const start = (page - 1) * pageSize;
        const slice = items.slice(start, start + pageSize);
        const desc = [
          now ? `Now Playing: **${now.title || 'Unknown'}**` : 'Now Playing: **Nothing**',
          '',
          slice.length ? 'Up Next:' : 'Queue is empty.',
          slice.join('\n')
        ].filter(Boolean).join('\n');

        return new EmbedBuilder()
          .setColor('#4d9fd6')
          .setTitle(`Queue — Page ${page}/${totalPages}`)
          .setDescription(desc);
      };

      const controls = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setStyle(ButtonStyle.Secondary).setLabel('Prev').setDisabled(page <= 1),
        new ButtonBuilder().setCustomId('next').setStyle(ButtonStyle.Secondary).setLabel('Next').setDisabled(page >= totalPages)
      );

      const message = await interaction.reply({ embeds: [render()], components: [controls()], fetchReply: true });
      if (totalPages === 1) return;

      const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return i.deferUpdate();
        if (i.customId === 'prev' && page > 1) page--;
        if (i.customId === 'next' && page < totalPages) page++;
        await i.update({ embeds: [render()], components: [controls()] });
      });
      collector.on('end', async () => {
        try { await message.edit({ components: [] }); } catch {}
      });
    } catch (e) {
      console.error("queue command error:", e);
      return interaction.reply({ content: "Failed to show queue.", ephemeral: true });
    }
  }
};


