"use strict";

class QueueManager {
  constructor() {
    this.guildIdToQueue = new Map();
  }

  getQueue(guildId) {
    if (!this.guildIdToQueue.has(guildId)) {
      this.guildIdToQueue.set(guildId, []);
    }
    return this.guildIdToQueue.get(guildId);
  }

  addTrack(guildId, track) {
    const queue = this.getQueue(guildId);
    queue.push(track);
  }

  nextTrack(guildId) {
    const queue = this.getQueue(guildId);
    return queue.shift() || null;
  }

  clear(guildId) {
    this.guildIdToQueue.set(guildId, []);
  }

  skipToIndex(guildId, indexOneBased) {
    const queue = this.getQueue(guildId);
    if (!Array.isArray(queue) || queue.length === 0) return null;
    const idx = Math.max(1, Math.min(indexOneBased, queue.length));
    // Remove items before the target
    queue.splice(0, idx - 1);
    // Pop the target to play now
    return queue.shift() || null;
  }
}

module.exports = { QueueManager };


