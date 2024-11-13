const queues = {};

module.exports = {
    addToQueue(guildId, song) {
        if (!queues[guildId]) queues[guildId] = [];
        queues[guildId].push(song);
    },
    getQueue(guildId) {
        return queues[guildId] || [];
    },
    clearQueue(guildId) {
        if (queues[guildId]) queues[guildId] = [];
    }
};
