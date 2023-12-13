import fs, { createReadStream } from "fs";
import "openai/shims/node";
import OpenAI from "openai";
import { OpusEncoder } from "@discordjs/opus";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

const openai = new OpenAI({
  apiKey: "sk-", //key from https://platform.openai.com/api-keys
});

const speechFile = path.resolve("./speech.ogg");
const speechFilePCM = path.resolve(__dirname, "./speech.wav");
const speechFilePCMdiscord = path.resolve(__dirname, "./speech-dicord.wav");

console.log({ speechFilePCM });

const opusEncoder = new OpusEncoder(24000, 1);
(async () => {
  const opus = await openai.audio.speech.create({
    response_format: "opus",
    model: "tts-1",
    voice: "alloy",
    input: "Hello my name is matthias, I am a developper of 31 years old.",
  });

  const buffer = Buffer.from(await opus.arrayBuffer());
  const fileWrote = await fs.promises.writeFile(speechFile, buffer);

  // convert to pcm via ffmpeg
  const command = convertOggToWav(speechFile);
  command.pipe(fs.createWriteStream(speechFilePCM));

  // conver to pcm via OpusEncoder
  const decoded = opusEncoder.decode(buffer);
  const fileWroteDiscord = await fs.promises.writeFile(
    speechFilePCMdiscord,
    buffer
  );
})();

function convertOggToWav(oggFilePath: string) {
  const command = ffmpeg()
    .input(createReadStream(oggFilePath))
    .audioCodec("pcm_alaw")
    .audioFrequency(24000)
    .audioChannels(1)
    .toFormat("wav")
    .on("data", (data) => {
      console.log("receiving data");
    })
    .on("end", () => {
      console.log("end");
    })
    .on("error", (err) => {
      console.error(err);
    });
  const stream = command.pipe();
  command.run();
  return stream;
}
