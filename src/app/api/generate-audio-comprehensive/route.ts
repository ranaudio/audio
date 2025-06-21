import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabs = elevenLabsApiKey ? new ElevenLabsClient({ apiKey: elevenLabsApiKey }) : null;

const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

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

  try {
    console.log(`🔊 [Chunk ${chunkIndex}] Generating for provider: ${provider}, length: ${text.length}`);
    
    let audioBuffer: Buffer;
    const filename = `${provider}-${voice?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}-chunk${chunkIndex}-${Date.now()}.mp3`;

    switch (provider) {
      case "minimax":
        const minimaxTTSModel = model || "speech-02-hd";
        console.log(`🤖 [Chunk ${chunkIndex}] MiniMax: voice=${voice}, model=${minimaxTTSModel}`);
        const minimaxResponse = await fetch(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
          body: JSON.stringify({
            model: minimaxTTSModel, 
            text: text, 
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
        if (!elevenLabsVoiceId) throw new Error(`Missing elevenLabsVoiceId [Chunk ${chunkIndex}]`);
        
        console.log(`🧪 [Chunk ${chunkIndex}] ElevenLabs: voiceId=${elevenLabsVoiceId}`);
        
        const elAudioStream = await elevenlabs.textToSpeech.convert(elevenLabsVoiceId, {
          text: text,
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

    // Convert audio buffer to base64 data URL
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    const duration = Math.ceil(text.length / 15); // Rough estimate

    console.log(`✅ [Chunk ${chunkIndex}] Audio generated successfully as data URL (${audioBuffer.length} bytes)`);
    
    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      audioData: base64Audio,
      duration: duration,
      provider,
      voice,
      chunkIndex,
      filename: filename,
      size: audioBuffer.length
    });

  } catch (error: any) {
    console.error(`❌ Error generating audio for chunk ${chunkIndex}:`, error.message);
    return NextResponse.json(
      { error: `Failed to generate audio: ${error.message}` },
      { status: 500 }
    );
  }
} 