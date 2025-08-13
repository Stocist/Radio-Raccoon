"use strict";

const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType
} = require("@discordjs/voice");

class AudioPlayerWrapper {
  constructor() {
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    this.player.on("error", () => {});
  }

  subscribe(connection) {
    return connection.subscribe(this.player);
  }

  play(stream) {
    const resource = createAudioResource(stream, {
      inputType: StreamType.Opus
    });
    this.player.play(resource);
  }

  pause() {
    this.player.pause(true);
  }

  resume() {
    this.player.unpause();
  }

  stop() {
    this.player.stop(true);
  }
}

module.exports = { AudioPlayerWrapper };


