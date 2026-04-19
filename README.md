# Discord Music Bot

A self-hosted Discord music bot using discord.js v14, @discordjs/voice, and play-dl (YouTube audio, no API key required).

## Features

| Command | Description |
|---|---|
| `/play <query or URL>` | Search YouTube or pass a direct URL |
| `/skip` | Skip the current track |
| `/stop` | Stop and disconnect |
| `/pause` / `/resume` | Pause / resume |
| `/nowplaying` | Show current track info |
| `/queue` | Display the queue |
| `/volume <0–100>` | Set volume |
| `/loop` | Toggle loop on current track |
| `/shuffle` | Shuffle the queue |
| `/remove <position>` | Remove a track by queue position |

---

## Prerequisites

- **Node.js v18+**
- **FFmpeg** installed and on PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: download from https://ffmpeg.org/download.html and add to PATH
- A Discord bot application (see below)

---

## Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications → **New Application**
2. In the left sidebar → **Bot** → **Add Bot**
3. Under **Token**, click **Reset Token** and copy it — this is your `DISCORD_TOKEN`
4. Copy the **Application ID** from the **General Information** page — this is your `CLIENT_ID`
5. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent** (Voice States is enabled by default)
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Use Slash Commands`
   - Copy the generated URL and use it to invite the bot to your server

### 2. Configure the Bot

```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here   # right-click server → Copy Server ID (developer mode must be on)
```

> Setting `GUILD_ID` registers slash commands instantly to one server (great for testing).  
> Remove it (or leave blank) to register globally — takes up to 1 hour to propagate.

### 3. Install Dependencies

```bash
npm install
```

> If `sodium-native` or `@discordjs/opus` fail to build, they are optional — the bot will fall back to pure-JS implementations. You can remove them from `package.json` if needed.

### 4. Register Slash Commands

```bash
npm run deploy
```

Run this once. Re-run whenever you add or rename commands.

### 5. Start the Bot

```bash
npm start
```

---

## Running Persistently

Use **PM2** to keep the bot running after you close your terminal:

```bash
npm install -g pm2
pm2 start src/index.js --name music-bot
pm2 save
pm2 startup   # follow the printed instructions
```

Or use a simple systemd service / Docker container on a VPS.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ERR_SODIUM_UNAVAILABLE` | Install `libsodium`: `npm install sodium-native` |
| No audio / silent | Ensure FFmpeg is on PATH: `ffmpeg -version` |
| `play-dl` age-restricted errors | Some videos are blocked; try a different track |
| Slash commands not showing | Wait up to 1 hour (global) or re-run `npm run deploy` with `GUILD_ID` set |
