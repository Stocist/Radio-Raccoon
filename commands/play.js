const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const queue = require("./queue");

async function play(client, interaction) {
    try {
        await interaction.deferReply();

        console.log('Guild ID:', interaction.guildId);
        console.log('Voice Channel ID:', interaction.member.voice.channelId);
        console.log('Text Channel ID:', interaction.channelId);

        if (!interaction.member.voice.channelId) {
            return await interaction.editReply({ 
                content: "❌ You must be in a voice channel to use this command!", 
                ephemeral: true 
            });
        }

        let player = client.riffy.players.get(interaction.guildId);
        if (!player) {
            try {
                const playerOptions = {
                    guildId: interaction.guildId,
                    voiceChannel: interaction.member.voice.channelId,
                    textChannel: interaction.channelId,
                    selfDeaf: true,
                    selfMute: false
                };

                console.log('Creating player with options:', playerOptions);

                player = client.riffy.createPlayer(playerOptions);

                if (!player) {
                    throw new Error('Failed to create player object');
                }

                await player.connect();
            } catch (error) {
                console.error('Detailed error creating player:', error);
                return await interaction.editReply({
                    content: "❌ Failed to create music player. Please try again.",
                    ephemeral: true
                });
            }
        }

        if (player.voiceChannel && interaction.member.voice.channelId !== player.voiceChannel) {
            return await interaction.editReply({ 
                content: "❌ You must be in the same voice channel as the bot!", 
                ephemeral: true 
            });
        }

        const query = interaction.options.getString('name');

        const resolve = await client.riffy.resolve({ query: query, requester: interaction.user });
        
        if (!resolve || !resolve.tracks || !resolve.tracks.length) {
            return await interaction.editReply({ 
                content: "❌ No results found for your search.", 
                ephemeral: true 
            });
        }

        const { loadType, tracks, playlistInfo } = resolve;

        if (loadType === 'PLAYLIST_LOADED') {
            for (const track of tracks) {
                track.info.requester = interaction.user;
                player.queue.add(track);
                queue.addToQueue(player.guildId, track.info.title);
            }

            if (!player.playing && !player.paused) {
                player.play();
            }

        } else if (loadType === 'SEARCH_RESULT' || loadType === 'TRACK_LOADED') {
            const track = tracks.shift();
            track.info.requester = interaction.user;

            player.queue.add(track);
            queue.addToQueue(player.guildId, track.info.title);

            if (!player.playing && !player.paused) {
                player.play();
            }
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('There are no results found.');

            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const embeds = [
            new EmbedBuilder()
                .setColor('#4d9fd6')
                .setAuthor({
                    name: 'Request Update!',
                    iconURL: 'https://cdn.discordapp.com/attachments/1230824451990622299/1236794583732457473/7828-verify-ak.gif',
                    url: 'https://discord.gg/xQF9f9yUEM'
                })
                .setDescription('➡️ **Your request has been successfully processed.**\n➡️** Please use the buttons to control the queue**'),

            new EmbedBuilder()
                .setColor('#ffea00')
                .setAuthor({
                    name: 'Request Update!',
                    iconURL: 'https://cdn.discordapp.com/attachments/1230824451990622299/1236802032938127470/4104-verify-yellow.gif',
                    url: 'https://discord.gg/xQF9f9yUEM'
                })
                .setDescription('➡️ **Your request has been successfully processed.**\n➡️** Please use the buttons to control the queue**'),

            new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({
                    name: 'Request Update!',
                    iconURL: 'https://cdn.discordapp.com/attachments/1230824451990622299/1236802049190920202/4104-verify-red.gif',
                    url: 'https://discord.gg/xQF9f9yUEM'
                })
                .setDescription('➡️ **Your request has been successfully processed.**\n➡️** Please use the buttons to control the queue**')
        ];

        const randomIndex = Math.floor(Math.random() * embeds.length);
        await interaction.followUp({ embeds: [embeds[randomIndex]] });

    } catch (error) {
        console.error('Error in play command:', error);
        if (interaction.deferred) {
            await interaction.editReply({ 
                content: "❌ An error occurred while processing your request.", 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: "❌ An error occurred while processing your request.", 
                ephemeral: true 
            });
        }
    }
}

module.exports = {
    name: "play",
    description: "Add songs to the queue",
    permissions: "0x0000000000000800",
    options: [{
        name: 'name',
        description: 'Enter song name / link or playlist',
        type: ApplicationCommandOptionType.String,
        required: true
    }],
    run: play
};
