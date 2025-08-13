const audioConfig = {
    // Audio quality settings
    defaultBitrate: 256,
    maxBitrate: 384,
    minBitrate: 96,
    sampleRate: 48000,
    channels: 2,
    
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
