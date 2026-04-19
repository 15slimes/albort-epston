// src/MusicQueue.js
import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} from "@discordjs/voice";

export class MusicQueue {
  constructor(guildId, connection, textChannel) {
    this.guildId = guildId;
    this.connection = connection;
    this.textChannel = textChannel;
    this.tracks = [];           // { title, url, duration, requestedBy }
    this.current = null;
    this.volume = 0.5;
    this.loop = false;

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => this._onTrackEnd());
    this.player.on("error", (err) => {
      console.error(`[AudioPlayer] ${err.message}`);
      this.textChannel.send(`Playback error: \`${err.message}\`. Skipping…`);
      this._advance();
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  enqueue(track) {
    this.tracks.push(track);
    if (this.player.state.status === AudioPlayerStatus.Idle && !this.current) {
      this._play();
    }
  }

  async _play() {
    if (!this.tracks.length) {
      this.current = null;
      return;
    }
    const track = this.tracks.shift();
    this.current = track;

    try {
      const { spawn } = await import("child_process");
      const ytdlp = spawn("yt-dlp", [
        "-f", "bestaudio",
        "--no-playlist",
        "-o", "-",
        "--quiet",
        "--cookies", "/app/cookies.txt",
        track.url,
      ]);

      const resource = createAudioResource(ytdlp.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume);
      this.player.play(resource);
      this.textChannel.send(`Now playing: **${track.title}**`);
    } catch (err) {
      console.error(`[_play] ${err.message}`);
      this.textChannel.send(`Could not play **${track.title}**. Skipping…`);
      this._advance();
    }
  }

  _onTrackEnd() {
    if (this.loop && this.current) {
      this.tracks.unshift(this.current);
    }
    this._advance();
  }

  _advance() {
    this.current = null;
    this._play();
  }

  skip() {
    this.player.stop(true);   // triggers Idle → _onTrackEnd
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  setVolume(vol) {
    this.volume = vol;
    // If a resource is currently playing, adjust inline volume
    const state = this.player.state;
    if (state.status !== AudioPlayerStatus.Idle) {
      state.resource?.volume?.setVolume(vol);
    }
  }

  destroy() {
    this.tracks = [];
    this.current = null;
    this.player.stop(true);
    this.connection.destroy();
  }
}
