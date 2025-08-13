# Testing & Deployment Guide

## Prerequisites
- Node.js 20.x
- FFmpeg installed (required for native path)
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt-get update && sudo apt-get install -y ffmpeg`
- Discord bot token with required intents

## Local Run
```bash
npm ci
export TOKEN=your_token_here
npm start
```
Use `/play` in a voice-enabled channel. Other controls: `/pause`, `/resume`, `/skip [track_no]`, `/stop`, `/clear`, `/queue`.

## Docker
`Dockerfile` installs FFmpeg and runs the bot.
```bash
docker build -t radio-raccoon .
docker run --rm -e TOKEN="your_token" radio-raccoon
```
Compose:
```yaml
services:
  bot:
    image: radio-raccoon
    build: .
    environment:
      TOKEN: ${TOKEN}
    restart: unless-stopped
```
Run:
```bash
export TOKEN=your_token
docker compose up --build
```

## Deployment (VPS example)
- Provision Ubuntu 22.04 (1 vCPU/1GB)
- Install Node 20, FFmpeg
- Clone repo, set TOKEN env (systemd or pm2)
- Optionally run via Docker/Compose

## Common Pitfalls
- FFmpeg missing → native path fails to play
- Token/Intents misconfigured → bot won’t log in or join voice
- YouTube throttling → consider caching/limiting queries
