// src/index.js
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
} from "discord.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import { create } from "yt-dlp-exec";
const ytDlp = create("/usr/local/bin/yt-dlp");

import "dotenv/config";
import { MusicQueue } from "./MusicQueue.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

/** @type {Map<string, MusicQueue>} */
const queues = new Map();

// ── Helpers ────────────────────────────────────────────────────────────────

function getQueue(guildId) {
  return queues.get(guildId) ?? null;
}

function requireQueue(interaction) {
  const q = getQueue(interaction.guildId);
  if (!q) {
    interaction.reply({ content: "I'm not playing anything right now.", ephemeral: true });
    return null;
  }
  return q;
}

function fmtDuration(seconds) {
  if (!seconds) return "?:??";
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Ready ──────────────────────────────────────────────────────────────────

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity("hi kitten", { type: ActivityType.Listening });
});

// ── Interaction Handler ────────────────────────────────────────────────────

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId, member } = interaction;

  // ── /play ──────────────────────────────────────────────────────────────
  if (commandName === "play") {
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: "Join a voice channel first.", ephemeral: true });
    }

    const query = interaction.options.getString("query");
    await interaction.deferReply();

    // ── Resolve tracks via yt-dlp ──────────────────────────────────────────
    const isUrl = /^https?:\/\//.test(query);
    const isPlaylist = /[?&]list=/.test(query);

    let tracks = [];

    try {
      if (isPlaylist) {
        const data = await ytDlp(query, {
          flatPlaylist: true,
          dumpSingleJson: true,
          noWarnings: true,
          cookies: "/app/cookies.txt",
        });
        const entries = data.entries ?? [];
        if (!entries.length) return interaction.editReply("Playlist appears to be empty or private.");
        tracks = entries.map((e) => ({
          title: e.title ?? e.id,
          url: e.url ?? `https://www.youtube.com/watch?v=${e.id}`,
          duration: e.duration ?? 0,
          requestedBy: interaction.user.toString(),
        }));
      } else {
        const data = await ytDlp(isUrl ? query : `ytsearch1:${query}`, {
          dumpSingleJson: true,
          noWarnings: true,
          noPlaylist: true,
          cookies: "/app/cookies.txt",
        });
        const v = data.entries ? data.entries[0] : data;
        if (!v) return interaction.editReply("No results found.");
        tracks = [{
          title: v.title,
          url: v.webpage_url ?? v.url,
          duration: v.duration ?? 0,
          requestedBy: interaction.user.toString(),
        }];
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply(`Failed to resolve: ${err.message}`);
    }

    // ── Connect if not already in a voice channel ──────────────────────────
    let queue = getQueue(guildId);
    if (!queue) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      } catch {
        connection.destroy();
        return interaction.editReply("Could not connect to the voice channel.");
      }

      queue = new MusicQueue(guildId, connection, interaction.channel);
      queues.set(guildId, queue);
      connection.on(VoiceConnectionStatus.Destroyed, () => queues.delete(guildId));
    }

    // ── Enqueue ────────────────────────────────────────────────────────────
    for (const track of tracks) queue.enqueue(track);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(tracks.length > 1 ? "Playlist Queued" : "Queued")
      .setDescription(
        tracks.length > 1
          ? `**${tracks.length} tracks** added to the queue`
          : `**[${tracks[0].title}](${tracks[0].url})**`
      )
      .addFields(
        tracks.length === 1
          ? [{ name: "Duration", value: fmtDuration(tracks[0].duration), inline: true }]
          : [{ name: "First track", value: tracks[0].title, inline: true }]
      );

    return interaction.editReply({ embeds: [embed] });
  }

  // ── /skip ──────────────────────────────────────────────────────────────
  if (commandName === "skip") {
    const q = requireQueue(interaction);
    if (!q) return;
    q.skip();
    return interaction.reply("Skipped.");
  }

  // ── /stop ──────────────────────────────────────────────────────────────
  if (commandName === "stop") {
    const q = requireQueue(interaction);
    if (!q) return;
    q.destroy();
    queues.delete(guildId);
    return interaction.reply("Stopped and disconnected.");
  }

  // ── /pause ─────────────────────────────────────────────────────────────
  if (commandName === "pause") {
    const q = requireQueue(interaction);
    if (!q) return;
    const ok = q.pause();
    return interaction.reply(ok ? "Paused." : "Could not pause.");
  }

  // ── /resume ────────────────────────────────────────────────────────────
  if (commandName === "resume") {
    const q = requireQueue(interaction);
    if (!q) return;
    const ok = q.resume();
    return interaction.reply(ok ? "Resumed." : "Could not resume.");
  }

  // ── /nowplaying ────────────────────────────────────────────────────────
  if (commandName === "nowplaying") {
    const q = requireQueue(interaction);
    if (!q) return;
    if (!q.current) return interaction.reply({ content: "Nothing is playing.", ephemeral: true });

    const t = q.current;
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Now Playing")
      .setDescription(`**[${t.title}](${t.url})**`)
      .addFields(
        { name: "Duration", value: fmtDuration(t.duration), inline: true },
        { name: "Loop", value: q.loop ? "On" : "Off", inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }

  // ── /queue ─────────────────────────────────────────────────────────────
  if (commandName === "queue") {
    const q = getQueue(guildId);
    if (!q || (!q.current && !q.tracks.length)) {
      return interaction.reply({ content: "The queue is empty.", ephemeral: true });
    }

    const lines = [];
    if (q.current) lines.push(`**${q.current.title}** — ${fmtDuration(q.current.duration)} [playing]`);
    q.tracks.slice(0, 15).forEach((t, i) => {
      lines.push(`\`${i + 1}.\` ${t.title} — ${fmtDuration(t.duration)} (${t.requestedBy})`);
    });
    if (q.tracks.length > 15) lines.push(`…and ${q.tracks.length - 15} more.`);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Queue — ${q.tracks.length} track(s) pending`)
      .setDescription(lines.join("\n"));
    return interaction.reply({ embeds: [embed] });
  }

  // ── /volume ────────────────────────────────────────────────────────────
  if (commandName === "volume") {
    const q = requireQueue(interaction);
    if (!q) return;
    const level = interaction.options.getInteger("level");
    q.setVolume(level / 100);
    return interaction.reply(`Volume set to **${level}%**.`);
  }

  // ── /loop ──────────────────────────────────────────────────────────────
  if (commandName === "loop") {
    const q = requireQueue(interaction);
    if (!q) return;
    q.loop = !q.loop;
    return interaction.reply(`Loop is now **${q.loop ? "on" : "off"}**.`);
  }

  // ── /shuffle ───────────────────────────────────────────────────────────
  if (commandName === "shuffle") {
    const q = requireQueue(interaction);
    if (!q) return;
    for (let i = q.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q.tracks[i], q.tracks[j]] = [q.tracks[j], q.tracks[i]];
    }
    return interaction.reply("Queue shuffled.");
  }

  // ── /remove ────────────────────────────────────────────────────────────
  if (commandName === "remove") {
    const q = requireQueue(interaction);
    if (!q) return;
    const pos = interaction.options.getInteger("position") - 1;
    if (pos < 0 || pos >= q.tracks.length) {
      return interaction.reply({ content: "Invalid position.", ephemeral: true });
    }
    const [removed] = q.tracks.splice(pos, 1);
    return interaction.reply(`Removed **${removed.title}** from the queue.`);
  }
});

// ── Login ──────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
