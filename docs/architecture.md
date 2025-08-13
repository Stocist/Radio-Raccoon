# System Architecture & Flow

## Components
- Command Layer: dispatches slash commands to handlers
- Native Path: VoiceConnectionManager + AudioPlayerWrapper + AudioEncoder + TrackResolver -> Discord VC
- External Services: YouTube (play-dl/yt-dlp), Spotify metadata (spotify-url-info)

## Architecture Diagram
```mermaid
flowchart TD
  U[User] -->|/play| G[Gateway/discord.js]
  G --> CMD[Command Handler]
  CMD --> RES[TrackResolver]
  RES --> YT[YouTube (play-dl/yt-dlp)]
  RES --> SP[Spotify (spotify-url-info)]
  CMD --> VCX[VoiceConnectionManager]
  VCX --> SUB[AudioPlayerWrapper.subscribe]
  CMD --> ENC[AudioEncoder (FFmpeg -> Opus)]
  ENC --> SUB
  SUB -->|Opus RTP| VC[Discord Voice]
```

## Sequence — Play via Native Path
```mermaid
sequenceDiagram
  participant U as User
  participant D as Discord API
  participant B as Bot
  participant V as VoiceConnectionManager
  participant P as AudioPlayer
  participant E as AudioEncoder
  participant R as TrackResolver

  U->>D: /play query
  D->>B: InteractionCreate
  B->>R: resolve(query)
  R-->>B: track(url, meta)
  B->>V: connect(guildId, channelId)
  V-->>B: connection ready
  B->>E: createOpusStream(stream)
  E-->>P: opus stream
  B->>P: play(stream)
  P-->>D: RTP Opus packets
  D-->>U: Audio in voice channel
```

## Data Flow Diagram
```mermaid
flowchart LR
  U[User] -->|command| Bot
  Bot -->|resolve| Resolver
  Resolver -->|search/fetch| YouTube
  Bot -->|connect| VoiceManager
  VoiceManager -->|subscribe| Player
  Bot -->|encode| Encoder
  Encoder -->|opus stream| Player
  Player -->|RTP| DiscordVoice
```
