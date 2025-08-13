
const { EmbedBuilder } = require('discord.js');


module.exports = {
  name: "help",
  description: "Get information about the bot",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
     

      const embed = new EmbedBuilder()
         .setColor('#0099ff')
      .setTitle('🦝 Radio Raccoon')
      .setDescription('Commands:\n' +
        '**/play query:** — Play (native).\n' +
        '**/pause** — Pause.\n' +
        '**/resume** — Resume.\n' +
        '**/skip** — Skip to next in queue.\n' +
        '**/clear** — Clear queue.\n' +
        '**/queue** — Show queue.\n' +
        '**/stop** — Stop and clear queue.\n' +
        '**/ping** — Bot latency.\n' +
        '**/support** — Support/GitHub.');

      return interaction.reply({ embeds: [embed] });
    } catch (e) {
    console.error(e); 
  }
  },
};
