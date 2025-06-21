import { NextResponse } from "next/server";

interface ChunkResult {
  chunkIndex: number;
  success: boolean;
  audioUrl?: string;
  duration?: number;
  filename?: string;
  error?: string;
}

interface ChunkError {
  chunkIndex: number;
  error: string;
}

// Helper function to get the correct base URL
function getBaseUrl(request: Request): string {
  // Try to get from environment variable first
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Extract from the request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback for development
  return 'http://localhost:3000';
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  const { chunks, provider, voice, model, elevenLabsVoiceId, userId = "unknown_user" } = requestBody;

  console.log("📦 Received batch audio generation request");
  console.log(`🔍 Request details: provider=${provider}, voice=${voice}, chunks count=${chunks?.length || 0}`);

  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    return NextResponse.json({ error: "Missing required field: chunks array" }, { status: 400 });
  }

  if (!provider) {
    return NextResponse.json({ error: "Missing required field: provider" }, { status: 400 });
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
    const batchResults: ChunkResult[] = [];
    const errors: ChunkError[] = [];
    const baseUrl = getBaseUrl(request);

    console.log(`🚀 Processing ${chunks.length} chunks asynchronously in parallel`);
    console.log(`🌐 Using base URL: ${baseUrl}`);

    // Create all chunk generation promises
    const chunkPromises = chunks.map(async (chunk: any, i: number): Promise<ChunkResult> => {
      try {
        console.log(`🔄 Starting chunk ${i + 1}/${chunks.length} (${chunk.text.length} chars)`);
        
        const requestBody: any = {
          text: chunk.text,
          provider,
          chunkIndex: chunk.index,
          userId
        };

        // Add provider-specific parameters
        if (provider === 'minimax') {
          requestBody.voice = voice;
          requestBody.model = model;
        } else if (provider === 'elevenlabs') {
          requestBody.elevenLabsVoiceId = elevenLabsVoiceId;
        }

        // Call the single chunk generation endpoint
        const response = await fetch(`${baseUrl}/api/generate-audio-comprehensive`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'AudioGenerator-Batch/1.0'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Generation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`✅ Chunk ${i + 1}/${chunks.length} completed successfully`);
        
        return {
          chunkIndex: chunk.index,
          success: true,
          audioUrl: data.audioUrl,
          duration: data.duration,
          filename: data.filename
        };
        
      } catch (error: any) {
        console.error(`❌ Chunk ${i + 1}/${chunks.length} failed:`, error.message);
        return {
          chunkIndex: chunk.index,
          success: false,
          error: error.message
        };
      }
    });

    // Execute all chunk generation requests in parallel
    const results = await Promise.allSettled(chunkPromises);
    
    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batchResults.push(result.value);
        if (!result.value.success) {
          errors.push({
            chunkIndex: result.value.chunkIndex,
            error: result.value.error || 'Unknown error'
          });
        }
      } else {
        // Handle promise rejection (shouldn't happen since we catch errors in the promise)
        const chunk = chunks[index];
        const errorResult: ChunkResult = {
          chunkIndex: chunk.index,
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
        batchResults.push(errorResult);
        errors.push({
          chunkIndex: chunk.index,
          error: errorResult.error || 'Unknown error'
        });
      }
    });

    const successfulChunks = batchResults.filter(r => r.success);
    const failedChunks = batchResults.filter(r => !r.success);

    console.log(`📊 Batch completed: ${successfulChunks.length} successful, ${failedChunks.length} failed`);

    return NextResponse.json({
      success: true,
      totalChunks: chunks.length,
      successfulChunks: successfulChunks.length,
      failedChunks: failedChunks.length,
      results: batchResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error("❌ Error in batch processing:", error.message);
    return NextResponse.json(
      { error: `Batch processing failed: ${error.message}` },
      { status: 500 }
    );
  }
} 