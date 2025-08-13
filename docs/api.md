# Commands & External API Reference

## Slash Commands
- `/play [query:<string>]` — Play or resume using native pipeline
- `/pause`, `/resume`, `/skip [track_no]`, `/stop`, `/clear`, `/queue`

## Native Pipeline Interfaces
- `client.audio.joinChannel(guildId, channelId, { selfDeaf })`
- `client.audio.playTrack(guildId, track)`
- `client.audio.addToQueue(guildId, track)`
- `client.audio.queues.getQueue(guildId)`
- `client.audio.encoder.createOpusStream(inputStream)`
- `client.audio.resolver.resolve(query)` → track or array of tracks

## External APIs
- Discord Gateway: intents, voice UDP, RTP Opus
- YouTube via play-dl + yt-dlp fallback
- Spotify metadata via spotify-url-info (no credentials required)

### Rate Limits & Notes
- YouTube may throttle or block heavy scraping; prefer cached/limited requests
- Discord: Respect rate limits for interactions and avoid long-running blocking tasks on main thread
