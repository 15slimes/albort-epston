// src/commands/index.js
import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube (URL or search query)")
    .addStringOption((o) =>
      o.setName("query").setDescription("YouTube URL or search terms").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and disconnect the bot"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume a paused track"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue"),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show what's currently playing"),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set playback volume (0–100)")
    .addIntegerOption((o) =>
      o.setName("level").setDescription("Volume level 0–100").setRequired(true).setMinValue(0).setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Toggle loop mode for the current track"),

  new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffle the queue"),

  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a track from the queue by position")
    .addIntegerOption((o) =>
      o.setName("position").setDescription("Position in queue (1-based)").setRequired(true).setMinValue(1)
    ),
].map((c) => c.toJSON());
