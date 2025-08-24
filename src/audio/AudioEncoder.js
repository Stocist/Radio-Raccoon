"use strict";

const prism = require("prism-media");

class AudioEncoder {
  constructor(options = {}) {
    const {
      bitrateKbps = 192,
      sampleRate = 48_000,
      channels = 2
    } = options;

    this.bitrateKbps = bitrateKbps;
    this.sampleRate = sampleRate;
    this.channels = channels;
  }

  createOpusStream(inputStream) {
    const ffmpeg = new prism.FFmpeg({
      args: [
        "-analyzeduration", "0",  // Skip duration analysis
        "-probesize", "32",       // Minimal probe size for faster start
        "-loglevel", "0",
        "-i", "pipe:0",
        "-f", "s16le",
        "-ar", String(this.sampleRate),
        "-ac", String(this.channels),
        "-b:a", `${this.bitrateKbps}k`,  // Ensure high bitrate
        "-compression_level", "10" // Maximum compression quality
      ]
    });

    const opus = new prism.opus.Encoder({
      rate: this.sampleRate,
      channels: this.channels,
      frameSize: 960,  // Standard 20ms frame size for best quality
      application: 2049, // AUDIO (optimized for music)
      bitrate: this.bitrateKbps * 1000  // 256kbps for high quality
    });

    const pipeline = inputStream.pipe(ffmpeg).pipe(opus);
    pipeline.on("error", () => pipeline.destroy());
    return pipeline;
  }
}

module.exports = { AudioEncoder };


