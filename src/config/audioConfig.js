const audioConfig = {
    // Audio quality settings (prioritizing quality)
    defaultBitrate: 256,  // High quality default
    maxBitrate: 510,      // Maximum Opus supports
    minBitrate: 128,      // Minimum for good music quality
    sampleRate: 48000,    // Standard Discord sample rate
    channels: 2,          // Stereo
    
    // Platform settings
    youtube: {
        enabled: true,
        quality: 'highestaudio'
    },
    
    spotify: {
        enabled: true,
        clientId: process.env.SPOTIFY_CLIENT_ID || '',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ''
    },
    
    // Queue settings
    maxQueueSize: 1000,
    defaultVolume: 1.0,
    
    // Connection settings
    timeout: 30000,
    reconnectAttempts: 3
};

module.exports = audioConfig;
