import fs, { createReadStream } from "fs";
import "openai/shims/node";
import OpenAI from "openai";
import { OpusEncoder } from "@discordjs/opus";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

import prism from "prism-media";
import stream from "stream";
import { isBuffer } from "util";
const openai = new OpenAI({
  apiKey: "sk-", //key from https://platform.openai.com/api-keys
});

const speechFile = path.resolve("./speech.ogg");
const speechFilePCM = path.resolve(__dirname, "./speech.pcm1");
const speechFilePCM2 = path.resolve(__dirname, "./speech.pcm2");
const speechFileOpus = path.resolve(__dirname, "./speech.raw.opus");
const speechFilePCMdiscord = path.resolve(__dirname, "./speech-dicord.wav");

console.log({ speechFilePCM });

class PrintSizeTransform extends stream.Transform {
  // constructor(options: any) {
  //   super(options);
  // }

  _transform(chunk: Buffer, encoding: any, callback: any) {
    console.log(`Type of chunk: ${isBuffer(chunk)}`);
    console.log(`Type of chunk[0]: ${typeof chunk[0]}`);
    console.log(`Chunk size: ${chunk.length}`);
    console.log(`Encoding: ${encoding}`);
    callback(null, chunk);
  }
}

const opusEncoder = new OpusEncoder(24000, 1);
(async () => {
  console.time("Time to generate audio");
  const opus = await openai.audio.speech.create({
    response_format: "opus",
    model: "tts-1",
    voice: "alloy",
    input: `
Le gant est relevé. « Nous ne renoncerons jamais à trouver des compromis »,
clame la première ministre, Elisabeth Borne, lors des questions au gouvernement
à l’Assemblée nationale.`,
  });
  console.timeLog("Time to generate audio");

  const buffer = Buffer.from(await opus.arrayBuffer());
  const demuxer = new prism.opus.OggDemuxer();
  const decoder = new prism.opus.Decoder({
    rate: 24000,
    channels: 1,
    frameSize: 2 * 960, // 60ms = 2 Bytes * 60*1ms
  });
  demuxer.pipe(decoder);

  // collect all data from the stream into one single buffer
  const buffers: Buffer[] = [];
  decoder.on("data", (data) => {
    buffers.push(data);
  });
  demuxer.write(buffer);
  demuxer.end();
  // join all buffers into one single buffer
  const buffer2 = Buffer.concat(buffers);
  console.timeEnd("Time to generate audio");

  // conver to pcm via OpusEncoder
  // const decoded = opusEncoder.decode(buffer);
  // const fileWroteDiscord = await fs.promises.writeFile(
  //   speechFilePCMdiscord,
  //   buffer
  // );
})();

function convertOggToWav(oggFilePath: string) {
  const command = ffmpeg()
    .input(createReadStream(oggFilePath))
    .audioCodec("pcm_s16le")
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
