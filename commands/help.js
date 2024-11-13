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
      .setDescription('Welcome to the Music Bot!\n\n- Here are the available commands:\n\n' +
        '**/play :** Start playing the songs.\n' +
        '**/ping :** check bot latency\n' +
        '**/support :** Get the bot\'s GitHub link');

      return interaction.reply({ embeds: [embed] });
    } catch (e) {
    console.error(e); 
  }
  },
};
