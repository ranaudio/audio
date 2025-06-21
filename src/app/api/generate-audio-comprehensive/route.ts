import { NextResponse } from "next/server";
import { OpenAI } from 'openai';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { v4 as uuidv4 } from 'uuid';

// Constants for batching and rate limiting
const AUDIO_CHUNK_MAX_LENGTH = 2800;
const ELEVENLABS_AUDIO_CHUNK_MAX_LENGTH = 1000;
const MAX_CHUNK_GENERATION_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

const DEFAULT_CHUNK_PROCESSING_BATCH_SIZE = 5;
const DEFAULT_DELAY_AFTER_CHUNK_BATCH_MS = 60 * 1000;

const ELEVENLABS_CHUNK_PROCESSING_BATCH_SIZE = 3;
const ELEVENLABS_DELAY_AFTER_CHUNK_BATCH_MS = 60 * 1000;

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabs = elevenLabsApiKey ? new ElevenLabsClient({ apiKey: elevenLabsApiKey }) : null;

const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

// Helper Functions
async function ensureDir(dirPath: string) {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function generateSingleAudioChunk(
  textChunk: string,
  provider: string,
  providerArgs: any,
  baseTempDir: string,
  chunkIndex: number
): Promise<string> {
  console.log(`🔊 [Chunk ${chunkIndex}] Generating for provider: ${provider}, length: ${textChunk.length}`);
  const { voice, model } = providerArgs;
  
  const tempFileName = `${provider}-${voice?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}-chunk${chunkIndex}-${Date.now()}.mp3`;
  const tempFilePath = path.join(baseTempDir, tempFileName);
  
  let audioBuffer: Buffer;

  try {
    switch (provider) {
      case "minimax":
        const minimaxTTSModel = model || "speech-02-hd";
        console.log(`🤖 [Chunk ${chunkIndex}] MiniMax: voice=${voice}, model=${minimaxTTSModel}`);
        const minimaxResponse = await fetch(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
          body: JSON.stringify({
            model: minimaxTTSModel, 
            text: textChunk, 
            stream: false, 
            subtitle_enable: false,
            voice_setting: { voice_id: voice, speed: 1, vol: 1, pitch: 0 },
            audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 }
          })
        });
        if (!minimaxResponse.ok) {
          let errorBody = '';
          try { errorBody = await minimaxResponse.text(); } catch (e) { /* ignore */ }
          throw new Error(`MiniMax API error [Chunk ${chunkIndex}]: ${minimaxResponse.status} ${minimaxResponse.statusText}. Body: ${errorBody}`);
        }
        const minimaxData = await minimaxResponse.json();
        if (!minimaxData.data?.audio) throw new Error(`No audio data from MiniMax [Chunk ${chunkIndex}]. Response: ${JSON.stringify(minimaxData)}`);
        const hexString = minimaxData.data.audio;
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        audioBuffer = Buffer.from(bytes);
        break;

      case "elevenlabs":
        if (!elevenlabs) throw new Error(`ElevenLabs client not initialized [Chunk ${chunkIndex}]`);
        const elevenLabsVoiceId = providerArgs.elevenLabsVoiceId;
        if (!elevenLabsVoiceId) throw new Error(`Missing elevenLabsVoiceId [Chunk ${chunkIndex}]`);
        
        console.log(`🧪 [Chunk ${chunkIndex}] ElevenLabs: voiceId=${elevenLabsVoiceId}`);
        
        const elAudioStream = await elevenlabs.textToSpeech.convert(elevenLabsVoiceId, {
          text: textChunk,
          modelId: "eleven_multilingual_v2",
          outputFormat: "mp3_44100_128"
        });

        // Convert ReadableStream to async iterator and collect chunks
        const elStreamChunks: Uint8Array[] = [];
        const reader = elAudioStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) elStreamChunks.push(value);
        }
        const elConcatenatedUint8Array = new Uint8Array(elStreamChunks.reduce((acc, streamChunk) => acc + streamChunk.length, 0));
        let offset = 0;
        for (const streamChunk of elStreamChunks) { 
          elConcatenatedUint8Array.set(streamChunk, offset); 
          offset += streamChunk.length; 
        }
        audioBuffer = Buffer.from(elConcatenatedUint8Array);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider} [Chunk ${chunkIndex}]`);
    }

    await fsp.writeFile(tempFilePath, audioBuffer); 
    console.log(`💾 [Chunk ${chunkIndex}] Saved to: ${tempFilePath}`);
    return tempFilePath;

  } catch (error: any) {
    console.error(`❌ Error in generateSingleAudioChunk for provider ${provider} [Chunk ${chunkIndex}]: ${error.message}`);
    try { 
      if (fs.existsSync(tempFilePath)) await fsp.rm(tempFilePath); 
    } catch (e) { 
      console.warn(`🧹 Failed to cleanup temp file ${tempFilePath} after error:`, e); 
    }
    throw error; 
  }
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  const { text, provider, voice, model, elevenLabsVoiceId, chunkIndex = 0, userId = "unknown_user" } = requestBody;

  console.log("📥 Received single chunk audio generation request");
  console.log(`🔍 Request details: provider=${provider}, voice=${voice}, chunkIndex=${chunkIndex}, text length=${text?.length || 0}`);

  if (!text || !provider) {
    return NextResponse.json({ error: "Missing required fields: text and provider are required" }, { status: 400 });
  }

  // Provider-specific validation
  switch (provider) {
    case "minimax":
      if (!voice) {
        return NextResponse.json({ error: "Missing required field 'voice' for MiniMax" }, { status: 400 });
      }
      break;
    case "elevenlabs":
      if (!elevenLabsVoiceId) {
        return NextResponse.json({ error: "Missing required field 'elevenLabsVoiceId' for ElevenLabs" }, { status: 400 });
      }
      break;
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const baseTempDirRoot = path.join(process.cwd(), 'temp-audio-processing');
  const tempDirForRequest = path.join(baseTempDirRoot, `chunk-${userId}-${Date.now()}`);

  await ensureDir(tempDirForRequest);

  try {
    const providerSpecificArgs: any = { voice, model, elevenLabsVoiceId, provider };
    
    const audioFilePath = await generateSingleAudioChunk(
      text, 
      provider, 
      providerSpecificArgs, 
      tempDirForRequest,
      chunkIndex
    );

    const audioUrl = `/api/temp-audio/${path.basename(audioFilePath)}`;
    const duration = Math.ceil(text.length / 15); // Rough estimate

    console.log(`✅ Single chunk audio generated successfully: ${audioUrl}`);
    return NextResponse.json({
      success: true,
      audioUrl: audioUrl,
      duration: duration,
      provider,
      voice,
      chunkIndex,
      filename: path.basename(audioFilePath)
    });

  } catch (error: any) {
    console.error("❌ Error generating single chunk audio:", error.message);
    return NextResponse.json(
      { error: `Failed to generate audio: ${error.message}` },
      { status: 500 }
    );
  } finally {
    // Note: We don't cleanup the temp directory here since the file needs to be served
    // The temp files should be cleaned up by a separate cleanup job in production
  }
} 