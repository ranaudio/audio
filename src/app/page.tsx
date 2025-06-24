'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import mammoth from 'mammoth'
import { 
  Volume2, 
  Download, 
  PlayCircle, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Settings,
  Sparkles,
  AudioLines,
  Archive,
  Clock,
  Hash,
  Pause,
  Play,
  Upload,
  File
} from 'lucide-react'

// TTS Provider configurations
interface TTSProvider {
  name: string
  voices: { id: string; name: string }[]
  models?: { id: string; name: string }[]
  chunkSize: number
}

const TTS_PROVIDERS: Record<string, TTSProvider> = {
  minimax: {
    name: "MiniMax",
    chunkSize: 3000,
    voices: [
      // Prioritized Female
      { id: "English_radiant_girl", name: "Radiant Girl" },
      { id: "English_captivating_female1", name: "Captivating Female" },
      { id: "English_Steady_Female_1", name: "Steady Women" },
      { id: "moss_audio_aae8a176-3932-11f0-b24c-2e48b7cbf811", name: "Jane - Older Woman" },
      // Prioritized Male
      { id: "English_CaptivatingStoryteller", name: "Captivating Storyteller" },
      { id: "English_Deep-VoicedGentleman", name: "Man With Deep Voice" },
      { id: "English_magnetic_voiced_man", name: "Magnetic-voiced Male" },
      { id: "English_ReservedYoungMan", name: "Reserved Young Man" },
      // Custom/Cloned voices
      { id: "moss_audio_5e17ecb2-3bd8-11f0-b24c-2e48b7cbf811", name: "Sleep Channel History" },
      { id: "moss_audio_094b69ed-4da5-11f0-a6ae-72d5dcf0f535", name: "SSS Cloned Voice" },
      // Remaining voices
      { id: "English_expressive_narrator", name: "Expressive Narrator" },
      { id: "English_compelling_lady1", name: "Compelling Lady" },
      { id: "English_CalmWoman", name: "Calm Woman" },
      { id: "English_Graceful_Lady", name: "Graceful Lady" },
      { id: "English_MaturePartner", name: "Mature Partner" },
      { id: "English_MatureBoss", name: "Bossy Lady" },
      { id: "English_Wiselady", name: "Wise Lady" },
      { id: "English_patient_man_v1", name: "Patient Man" },
      { id: "English_Female_Narrator", name: "Female Narrator" },
      { id: "English_Trustworth_Man", name: "Trustworthy Man" },
      { id: "English_Gentle-voiced_man", name: "Gentle-voiced Man" },
      { id: "English_Upbeat_Woman", name: "Upbeat Woman" },
      { id: "English_Friendly_Female_3", name: "Friendly Women" }
    ],
    models: [
      { id: "speech-02-hd", name: "Speech 02 HD" },
      { id: "speech-02-turbo", name: "Speech 02 Turbo" },
      { id: "speech-01-hd", name: "Speech 01 HD" },
      { id: "speech-01-turbo", name: "Speech 01 Turbo" }
    ]
  },
  elevenlabs: {
    name: "ElevenLabs",
    chunkSize: 3000,
    voices: [
      // Priority voices
      { id: "GUDYcgRAONiI1nXDcNQQ", name: "Milo - Calm, Soothing, Meditative" },
      { id: "alFofuDn3cOwyoz1i44T", name: "Dallin - Storyteller" },
      { id: "IRHApOXLvnW57QJPQH2P", name: "Adam - Brooding, Dark, Tough American" },
      { id: "LJ50GMZgI96epJOJ3cIe", name: "Yousef - Passionate, Sympathetic" },
      { id: "EiNlNiXeDU1pqqOPrYMO", name: "John Doe - Deep" },
      { id: "LqB03n4OKhdBACxFjR4j", name: "Bateman - Deep, Masculine and Authoritative" },
      { id: "lkVAP8k5tC0Wr1dYyQZH", name: "Brittany - Warm, Bright, Gentle female narrative" },
      { id: "hT1hqZXZ2elc9oTXrfyC", name: "Chuck - True Crime" },
      { id: "dY9fWBb7TNkZB7UPeFK1", name: "Scoobie - American Male, Enthusiastic, Sharp, Smart" },
      { id: "PXqWM9QeiFqCKCnfnytd", name: "Carmen - Calm, thoughtful" },
      { id: "mUfWEBhcigm8YlCDbmGP", name: "Joey - Upbeat Popular News Host" },
      // Additional voices
      { id: "NNl6r8mD7vthiJatiJt1", name: "Bradford" },
      { id: "QwvsCFsQcnpWxmP1z7V9", name: "LavenderLessons" },
      { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
      { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
      { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
      { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
      { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde" },
      { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
      { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy" },
      { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
      { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
      { id: "ODq5zmih8GrVes37Dizd", name: "Patrick" },
      { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
      { id: "knrPHWnBmmDHMoiMeP3l", name: "Santa Claus" },
      { id: "XN5MUfNpmfCV6rvigVhs", name: "Giselle Marie" },
      { id: "y6WtESLj18d0diFRruBs", name: "David Martin 2" },
      { id: "Nh2zY9kknu6z4pZy6FhD", name: "David Martin .1" },
      { id: "sTgjlXyTKe3nwbzzjDAZ", name: "Austin The Cowboy" },
      { id: "sPzOOqSRgtzdT8DPbJYh", name: "Matt Snowden" },
      { id: "zMcCxfDuIMwFtpHQSMWz", name: "Youness Elhouari" },
      // Original ElevenLabs voices
      { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
      { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
      { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
      { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
      { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" }
    ]
  }
}

interface TextChunk {
  index: number
  text: string
  startChar: number
  endChar: number
}

interface AudioChunk {
  chunkIndex: number
  audioUrl: string
  duration: number
  filename: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
  text: string
}

interface BatchProgress {
  totalBatches: number
  completedBatches: number
  currentBatch: number
  totalChunks: number
  completedChunks: number
  failedChunks: number
}

export default function AudioGenerator() {
  // State management
  const [text, setText] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('minimax')
  const [selectedVoice, setSelectedVoice] = useState<string>('English_radiant_girl')
  const [selectedModel, setSelectedModel] = useState<string>('speech-02-hd')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [textChunks, setTextChunks] = useState<TextChunk[]>([])
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadedText, setUploadedText] = useState<string>('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const [delayCountdown, setDelayCountdown] = useState<number>(0)

  // Helper functions
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    if (type !== 'error') {
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const getWordCount = () => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getEstimatedDuration = () => {
    return Math.ceil(text.length / 15) // Rough estimate: 15 characters per second
  }

  // Text chunking function
  function chunkText(text: string, maxLength: number): TextChunk[] {
    if (!text || text.length <= maxLength) {
      return [{
        index: 0,
        text: text,
        startChar: 0,
        endChar: text.length
      }];
    }

    const chunks: TextChunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < text.length) {
      let chunkEnd = currentPosition + maxLength;
      if (chunkEnd >= text.length) {
        chunks.push({
          index: chunkIndex,
          text: text.substring(currentPosition),
          startChar: currentPosition,
          endChar: text.length
        });
        break;
      }

      let splitPosition = -1;
      const sentenceEndChars = /[.?!]\s+|[\n\r]+/g;
      let match;
      let lastMatchPosition = -1;
      
      const searchSubstr = text.substring(currentPosition, chunkEnd);
      while((match = sentenceEndChars.exec(searchSubstr)) !== null) {
          lastMatchPosition = currentPosition + match.index + match[0].length;
      }

      if (lastMatchPosition > currentPosition && lastMatchPosition <= chunkEnd) {
          splitPosition = lastMatchPosition;
      } else {
          let spacePosition = text.lastIndexOf(' ', chunkEnd);
          if (spacePosition > currentPosition) {
              splitPosition = spacePosition + 1;
          } else {
              splitPosition = chunkEnd;
          }
      }
      
      const chunkText = text.substring(currentPosition, splitPosition).trim();
      if (chunkText.length > 0) {
        chunks.push({
          index: chunkIndex,
          text: chunkText,
          startChar: currentPosition,
          endChar: splitPosition
        });
        chunkIndex++;
      }
      currentPosition = splitPosition;
    }
    return chunks;
  }

  // Handle provider change
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    const firstVoice = TTS_PROVIDERS[provider as keyof typeof TTS_PROVIDERS]?.voices[0]
    if (firstVoice) {
      setSelectedVoice(firstVoice.id)
    }
    if (provider === 'minimax') {
      setSelectedModel('speech-02-hd')
    }
    
    // Rechunk text if it exists
    if (text.trim()) {
      const provider_info = TTS_PROVIDERS[provider as keyof typeof TTS_PROVIDERS]
      if (provider_info) {
        const chunks = chunkText(text.trim(), provider_info.chunkSize)
        setTextChunks(chunks)
      }
    }
  }

  // Handle text change
  const handleTextChange = (newText: string) => {
    setText(newText)
    if (newText.trim()) {
      const provider_info = TTS_PROVIDERS[selectedProvider as keyof typeof TTS_PROVIDERS]
      if (provider_info) {
        const chunks = chunkText(newText.trim(), provider_info.chunkSize)
        setTextChunks(chunks)
      }
    } else {
      setTextChunks([])
    }
    // Reset audio chunks when text changes
    setAudioChunks([])
  }

  // Process batch of chunks - now orchestrated entirely from frontend
  const processBatch = async (batchChunks: TextChunk[], batchIndex: number) => {
    console.log(`🚀 [BATCH ${batchIndex + 1}] Starting batch processing:`, {
      batchIndex: batchIndex + 1,
      chunkCount: batchChunks.length,
      provider: selectedProvider,
      voice: selectedVoice,
      model: selectedModel,
      chunks: batchChunks.map(c => ({ index: c.index, textLength: c.text.length }))
    });

    // Process all chunks in this batch in parallel
    const chunkPromises = batchChunks.map(async (chunk, i) => {
      try {
        console.log(`📡 [CHUNK ${chunk.index}] Starting generation:`, {
          chunkIndex: chunk.index,
          textLength: chunk.text.length,
          provider: selectedProvider,
          voice: selectedVoice
        });

        const requestBody: any = {
          text: chunk.text,
          provider: selectedProvider,
          chunkIndex: chunk.index,
          userId: 'demo_user'
        };

        // Add provider-specific parameters
        if (selectedProvider === 'minimax') {
          requestBody.voice = selectedVoice;
          requestBody.model = selectedModel;
        } else if (selectedProvider === 'elevenlabs') {
          requestBody.elevenLabsVoiceId = selectedVoice;
        }

        const response = await fetch('/api/generate-audio-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log(`📡 [CHUNK ${chunk.index}] Response received:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error(`❌ [CHUNK ${chunk.index}] Server error response:`, errorData);
          } catch (parseError) {
            console.error(`❌ [CHUNK ${chunk.index}] Failed to parse error response:`, parseError);
            const responseText = await response.text();
            console.error(`❌ [CHUNK ${chunk.index}] Raw error response:`, responseText);
            errorData = { error: `HTTP ${response.status}: ${responseText || response.statusText}` };
          }
          throw new Error(errorData.error || `Chunk ${chunk.index} failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ [CHUNK ${chunk.index}] Success response:`, {
          chunkIndex: data.chunkIndex,
          success: data.success,
          audioUrl: data.audioUrl ? 'data-url-received' : 'no-audio-url',
          filename: data.filename,
          size: data.size
        });

        return {
          chunkIndex: chunk.index,
          success: true,
          audioUrl: data.audioUrl,
          duration: data.duration,
          filename: data.filename,
          size: data.size
        };

      } catch (error: any) {
        console.error(`❌ [CHUNK ${chunk.index}] Generation failed:`, {
          chunkIndex: chunk.index,
          error: error.message,
          stack: error.stack
        });
        
        return {
          chunkIndex: chunk.index,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for all chunks in this batch to complete
    const results = await Promise.allSettled(chunkPromises);
    
    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const chunk = batchChunks[index];
        console.error(`❌ [CHUNK ${chunk.index}] Promise rejected:`, result.reason);
        return {
          chunkIndex: chunk.index,
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    console.log(`📊 [BATCH ${batchIndex + 1}] Batch completed:`, {
      totalChunks: processedResults.length,
      successful: processedResults.filter(r => r.success).length,
      failed: processedResults.filter(r => !r.success).length,
      results: processedResults.map(r => ({
        chunkIndex: r.chunkIndex,
        success: r.success,
        error: r.error
      }))
    });

    return processedResults;
  }

  // Generate audio with batching
  const handleGenerateAudio = async () => {
    console.log('🎬 [GENERATION] Starting audio generation process');
    
    if (!text.trim()) {
      console.warn('⚠️ [GENERATION] No text provided');
      showMessage('Please enter some text to generate audio', 'error')
      return
    }

    if (!selectedVoice) {
      console.warn('⚠️ [GENERATION] No voice selected');
      showMessage('Please select a voice', 'error')
      return
    }

    if (textChunks.length === 0) {
      console.warn('⚠️ [GENERATION] No text chunks available');
      showMessage('No text chunks to process', 'error')
      return
    }

    console.log('📋 [GENERATION] Generation parameters:', {
      textLength: text.length,
      wordCount: getWordCount(),
      estimatedDuration: getEstimatedDuration(),
      chunksCount: textChunks.length,
      provider: selectedProvider,
      voice: selectedVoice,
      model: selectedModel,
      chunks: textChunks.map(c => ({ 
        index: c.index, 
        textLength: c.text.length, 
        preview: c.text.substring(0, 50) + '...' 
      }))
    });

    setIsGenerating(true)
    setIsPaused(false)
    setMessage('')
    setDelayCountdown(0)

    // Initialize audio chunks
    const initialAudioChunks: AudioChunk[] = textChunks.map(chunk => ({
      chunkIndex: chunk.index,
      audioUrl: '',
      duration: 0,
      filename: '',
      status: 'pending',
      text: chunk.text
    }))
    setAudioChunks(initialAudioChunks)

    try {
      const batchSize = 5;
      const totalBatches = Math.ceil(textChunks.length / batchSize)
      
      console.log('📊 [GENERATION] Batch processing setup:', {
        totalChunks: textChunks.length,
        batchSize: batchSize,
        totalBatches: totalBatches
      });
      
      setBatchProgress({
        totalBatches,
        completedBatches: 0,
        currentBatch: 1,
        totalChunks: textChunks.length,
        completedChunks: 0,
        failedChunks: 0
      })

      showMessage(`Starting batch processing: ${totalBatches} batches, ${textChunks.length} chunks total`, 'info')

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (isPaused) {
          console.log('⏸️ [GENERATION] Generation paused by user');
          showMessage('Generation paused by user', 'info')
          break
        }

        // Add delay BEFORE sending the batch (except for the first batch)
        if (batchIndex > 0 && !isPaused) {
          const delaySeconds = 65; // 1:05 minutes
          console.log(`⏱️ [GENERATION] Waiting ${delaySeconds} seconds before sending batch ${batchIndex + 1}...`);
          
          // Wait with countdown and pause checking
          for (let i = delaySeconds; i > 0; i--) {
            if (isPaused) {
              console.log('⏸️ [GENERATION] Generation paused during delay');
              showMessage('Generation paused during delay', 'info')
              setDelayCountdown(0)
              break
            }
            
            setDelayCountdown(i)
            const minutes = Math.floor(i / 60)
            const seconds = i % 60
            showMessage(`Waiting ${minutes}:${seconds.toString().padStart(2, '0')} before sending next batch...`, 'info')
            
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          setDelayCountdown(0)
          if (isPaused) break; // Exit if paused during delay
        }

        const batchStart = batchIndex * batchSize
        const batchEnd = Math.min(batchStart + batchSize, textChunks.length)
        const batchChunks = textChunks.slice(batchStart, batchEnd)

        console.log(`🔄 [GENERATION] Processing batch ${batchIndex + 1}/${totalBatches}:`, {
          batchIndex: batchIndex + 1,
          batchStart,
          batchEnd,
          chunkCount: batchChunks.length,
          chunkIndexes: batchChunks.map(c => c.index),
          sentAt: new Date().toISOString()
        });

        // Update progress
        setBatchProgress(prev => prev ? {
          ...prev,
          currentBatch: batchIndex + 1
        } : null)

        // Mark chunks as generating
        setAudioChunks(prev => prev.map(chunk => 
          batchChunks.some(bc => bc.index === chunk.chunkIndex)
            ? { ...chunk, status: 'generating' }
            : chunk
        ))

        try {
          const batchSentTime = Date.now();
          console.log(`🚀 [GENERATION] Batch ${batchIndex + 1} sent at: ${new Date(batchSentTime).toISOString()}`);
          
          const results = await processBatch(batchChunks, batchIndex)
          
          const batchCompletedTime = Date.now();
          const processingDuration = (batchCompletedTime - batchSentTime) / 1000;
          
          console.log(`📊 [GENERATION] Batch ${batchIndex + 1} results:`, {
            totalResults: results.length,
            successful: results.filter((r: any) => r.success).length,
            failed: results.filter((r: any) => !r.success).length,
            processingDuration: `${processingDuration.toFixed(1)}s`,
            sentAt: new Date(batchSentTime).toISOString(),
            completedAt: new Date(batchCompletedTime).toISOString(),
            results: results.map((r: any) => ({
              chunkIndex: r.chunkIndex,
              success: r.success,
              audioUrl: r.audioUrl,
              error: r.error
            }))
          });
          
          // Update chunks with results
          setAudioChunks(prev => prev.map(chunk => {
            const result = results.find((r: any) => r.chunkIndex === chunk.chunkIndex)
            if (result) {
              console.log(`🔄 [CHUNK ${result.chunkIndex}] Updating status:`, {
                chunkIndex: result.chunkIndex,
                success: result.success,
                audioUrl: result.audioUrl,
                filename: result.filename,
                error: result.error
              });
              
              return {
                ...chunk,
                status: result.success ? 'completed' : 'failed',
                audioUrl: result.audioUrl || '',
                duration: result.duration || 0,
                filename: result.filename || '',
                error: result.error
              }
            }
            return chunk
          }))

          // Update progress
          const successfulResults = results.filter((r: any) => r.success)
          const failedResults = results.filter((r: any) => !r.success)

          setBatchProgress(prev => prev ? {
            ...prev,
            completedBatches: batchIndex + 1,
            completedChunks: prev.completedChunks + successfulResults.length,
            failedChunks: prev.failedChunks + failedResults.length
          } : null)

          console.log(`✅ [GENERATION] Batch ${batchIndex + 1}/${totalBatches} completed: ${successfulResults.length} successful, ${failedResults.length} failed`)

        } catch (error: any) {
          console.error(`❌ [GENERATION] Batch ${batchIndex + 1} failed:`, {
            batchIndex: batchIndex + 1,
            error: error.message,
            stack: error.stack,
            batchChunks: batchChunks.map(c => ({ index: c.index, textLength: c.text.length }))
          });
          
          // Mark all chunks in this batch as failed
          setAudioChunks(prev => prev.map(chunk => 
            batchChunks.some(bc => bc.index === chunk.chunkIndex)
              ? { ...chunk, status: 'failed', error: error.message }
              : chunk
          ))

          setBatchProgress(prev => prev ? {
            ...prev,
            completedBatches: batchIndex + 1,
            failedChunks: prev.failedChunks + batchChunks.length
          } : null)
        }
      }

      const finalProgress = batchProgress
      if (finalProgress) {
        const successRate = ((finalProgress.completedChunks / finalProgress.totalChunks) * 100).toFixed(1)
        console.log(`🏁 [GENERATION] Generation completed:`, {
          totalChunks: finalProgress.totalChunks,
          completedChunks: finalProgress.completedChunks,
          failedChunks: finalProgress.failedChunks,
          successRate: successRate + '%'
        });
        showMessage(`Generation completed! ${finalProgress.completedChunks}/${finalProgress.totalChunks} chunks successful (${successRate}%)`, finalProgress.failedChunks === 0 ? 'success' : 'info')
      }

    } catch (error: any) {
      console.error('💥 [GENERATION] Fatal error in audio generation:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
        currentProvider: selectedProvider,
        currentVoice: selectedVoice,
        textLength: text.length,
        chunksCount: textChunks.length
      });
      showMessage(`Audio generation failed: ${error.message}`, 'error')
    } finally {
      console.log('🔚 [GENERATION] Audio generation process ended');
      setIsGenerating(false)
      setIsPaused(false)
      setDelayCountdown(0)
    }
  }

  // Pause/Resume generation
  const handlePauseResume = () => {
    setIsPaused(!isPaused)
    if (!isPaused) {
      showMessage('Generation paused', 'info')
    } else {
      showMessage('Generation resumed', 'info')
    }
  }

  // Download individual audio
  const handleDownloadAudio = (audioUrl: string, filename: string) => {
    console.log('📥 [DOWNLOAD] Starting individual audio download:', {
      audioUrl: audioUrl.substring(0, 50) + '...', // Don't log full base64
      filename,
      timestamp: new Date().toISOString()
    });

    try {
      // Check if it's a data URL (base64)
      if (audioUrl.startsWith('data:')) {
        // Convert data URL to blob
        const byteCharacters = atob(audioUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        
        console.log('📥 [DOWNLOAD] Triggering download click for data URL');
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ [DOWNLOAD] Individual download completed successfully');
      } else {
        // Fallback for regular URLs
        const link = document.createElement('a')
        link.href = audioUrl
        link.download = filename
        document.body.appendChild(link)
        
        console.log('📥 [DOWNLOAD] Triggering download click for regular URL');
        link.click()
        
        document.body.removeChild(link)
        console.log('✅ [DOWNLOAD] Individual download completed successfully');
      }
    } catch (error: any) {
      console.error('❌ [DOWNLOAD] Individual download failed:', {
        error: error.message,
        stack: error.stack,
        audioUrl: audioUrl.substring(0, 50) + '...',
        filename
      });
      showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  // Download all audio as ZIP
  const handleDownloadAllAsZip = async () => {
    const completedChunks = audioChunks.filter(chunk => chunk.status === 'completed')
    
    console.log('📦 [ZIP] Starting ZIP download process:', {
      totalChunks: audioChunks.length,
      completedChunks: completedChunks.length,
      chunks: completedChunks.map(c => ({
        chunkIndex: c.chunkIndex,
        filename: c.filename,
        audioUrlType: c.audioUrl.startsWith('data:') ? 'data-url' : 'regular-url',
        audioSize: c.audioUrl.length
      }))
    });
    
    if (completedChunks.length === 0) {
      console.warn('⚠️ [ZIP] No completed chunks available for download');
      showMessage('No completed audio chunks to download', 'error')
      return
    }

    try {
      showMessage('Creating ZIP file...', 'info')
      
      const zip = new JSZip()
      console.log('📦 [ZIP] Created new JSZip instance');
      
      // Process each audio chunk
      for (const chunk of completedChunks) {
        try {
          console.log(`📥 [ZIP] Processing chunk ${chunk.chunkIndex}:`, {
            chunkIndex: chunk.chunkIndex,
            filename: chunk.filename,
            audioUrlType: chunk.audioUrl.startsWith('data:') ? 'data-url' : 'regular-url'
          });
          
          let audioBlob: Blob;
          
          if (chunk.audioUrl.startsWith('data:')) {
            // Handle base64 data URL
            console.log(`📦 [ZIP] Converting data URL to blob for chunk ${chunk.chunkIndex}`);
            const byteCharacters = atob(chunk.audioUrl.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });
          } else {
            // Handle regular URL (fallback)
            console.log(`📥 [ZIP] Fetching from URL for chunk ${chunk.chunkIndex}`);
            const response = await fetch(chunk.audioUrl)
            
            console.log(`📡 [ZIP] Fetch response for chunk ${chunk.chunkIndex}:`, {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            audioBlob = await response.blob();
          }
          
          console.log(`📦 [ZIP] Blob created for chunk ${chunk.chunkIndex}:`, {
            size: audioBlob.size,
            type: audioBlob.type
          });
          
          const paddedIndex = String(chunk.chunkIndex + 1).padStart(3, '0')
          const zipFilename = `${paddedIndex}_${chunk.filename}`;
          zip.file(zipFilename, audioBlob)
          
          console.log(`✅ [ZIP] Added chunk ${chunk.chunkIndex} to ZIP as ${zipFilename}`);
        } catch (error: any) {
          console.error(`❌ [ZIP] Failed to process chunk ${chunk.chunkIndex}:`, {
            chunkIndex: chunk.chunkIndex,
            audioUrl: chunk.audioUrl.substring(0, 50) + '...',
            error: error.message,
            stack: error.stack
          });
        }
      }

      console.log('📦 [ZIP] Generating ZIP blob...');
      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      console.log('📦 [ZIP] ZIP blob generated:', {
        size: zipBlob.size,
        type: zipBlob.type
      });
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const providerName = TTS_PROVIDERS[selectedProvider as keyof typeof TTS_PROVIDERS]?.name
      const zipFilename = `${providerName}_Audio_${timestamp}.zip`;
      
      console.log('📦 [ZIP] Saving ZIP file:', { zipFilename });
      saveAs(zipBlob, zipFilename)
      
      console.log('✅ [ZIP] ZIP download completed successfully');
      showMessage(`Downloaded ${completedChunks.length} audio files as ZIP`, 'success')
    } catch (error: any) {
      console.error('❌ [ZIP] Error creating ZIP:', {
        error: error.message,
        stack: error.stack,
        completedChunksCount: completedChunks.length
      });
      showMessage(`Failed to create ZIP: ${error.message}`, 'error')
    }
  }

  // File upload handler
  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      showMessage('Please select a DOCX file', 'error')
      return
    }

    setUploading(true)
    showMessage('Processing DOCX file...', 'info')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      if (result.value) {
        const extractedText = result.value.trim()
        setText(extractedText)
        handleTextChange(extractedText)
        showMessage(`Successfully extracted ${extractedText.length} characters from ${file.name}`, 'success')
      } else {
        showMessage('No text found in the DOCX file', 'error')
      }

      // Show warnings if any
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX parsing warnings:', result.messages)
      }

    } catch (error: any) {
      console.error('Error processing DOCX file:', error)
      showMessage(`Failed to process DOCX file: ${error.message}`, 'error')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const docxFile = files.find(file => file.name.toLowerCase().endsWith('.docx'))
    
    if (!docxFile) {
      showMessage('Please drop a DOCX file', 'error')
      return
    }

    await processFile(docxFile)
  }

  const currentProvider = TTS_PROVIDERS[selectedProvider as keyof typeof TTS_PROVIDERS]
  const completedChunks = audioChunks.filter(chunk => chunk.status === 'completed')

  // UseEffect to log environment and browser information when the component mounts
  useEffect(() => {
    console.log('🚀 [INIT] Audio Generator Component mounted');
    console.log('🌐 [INIT] Environment information:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      windowLocation: window.location.href,
      windowOrigin: window.location.origin,
      referrer: document.referrer
    });
    
    console.log('🎵 [INIT] Audio support check:', {
      audioElement: !!document.createElement('audio').canPlayType,
      mp3Support: document.createElement('audio').canPlayType('audio/mpeg'),
      webAudioAPI: !!(window.AudioContext || (window as any).webkitAudioContext),
      mediaDevices: !!navigator.mediaDevices
    });
    
    console.log('📡 [INIT] Network information:', {
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : 'Not available'
    });
    
    console.log('🔧 [INIT] TTS Providers configuration:', TTS_PROVIDERS);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: isGenerating ? 360 : 0 }}
              transition={{ duration: 2, repeat: isGenerating ? Infinity : 0 }}
            >
              <AudioLines className="h-8 w-8 text-purple-600" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Audio Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Chunk-based batch processing with individual downloads and ZIP export
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6"
        >
          {/* Text Input Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">Your Script</h2>
            </div>
            
            {/* File Upload Area */}
            <div className="mb-4">
              <div 
                className={`flex items-center gap-3 mb-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  isDragOver 
                    ? 'border-purple-400 bg-purple-100' 
                    : uploading
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-purple-300 bg-purple-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.button
                  whileHover={{ scale: uploading ? 1 : 1.02 }}
                  whileTap={{ scale: uploading ? 1 : 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    uploading 
                      ? 'bg-blue-100 cursor-not-allowed' 
                      : 'bg-white hover:bg-gray-50 cursor-pointer shadow-sm'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-blue-700 font-medium">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-purple-600" />
                      <span className="text-purple-700 font-medium">Upload DOCX</span>
                    </>
                  )}
                </motion.button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-600">
                    {isDragOver ? (
                      <span className="text-purple-700 font-medium">Drop DOCX file here</span>
                    ) : (
                      <span>Drag & drop a DOCX file here, or click Upload</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Supports Microsoft Word documents (.docx)
                  </div>
                </div>
                
                <File className={`h-6 w-6 ${isDragOver ? 'text-purple-600' : 'text-gray-400'}`} />
              </div>
            </div>
            
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste your script here or upload a DOCX file above... Text will be automatically chunked based on the selected provider's limits."
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400"
              maxLength={50000}
            />
            
            <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
              <div className="flex gap-4">
                <span>{text.length} characters</span>
                <span>{getWordCount()} words</span>
                <span>~{getEstimatedDuration()}s duration</span>
                {textChunks.length > 0 && (
                  <span className="text-purple-600 font-medium">
                    {textChunks.length} chunks ({currentProvider?.chunkSize} char limit)
                  </span>
                )}
              </div>
              <span>{text.length}/50,000</span>
            </div>
          </div>

          {/* Settings Section */}
          <div className="p-6 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">Voice Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TTS Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-700"
                >
                  {Object.entries(TTS_PROVIDERS).map(([key, provider]) => (
                    <option key={key} value={key}>
                      {provider.name} ({provider.chunkSize} chars/chunk)
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-700"
                >
                  {currentProvider?.voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Selection (for MiniMax) */}
              {selectedProvider === 'minimax' && currentProvider?.models && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-700">
                    Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    {currentProvider.models.map((model: { id: string; name: string }) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Batch Progress */}
          <AnimatePresence>
            {batchProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-blue-50 border-b border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: isGenerating && !isPaused ? 360 : 0 }}
                      transition={{ duration: 1, repeat: isGenerating && !isPaused ? Infinity : 0, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5 text-blue-600" />
                    </motion.div>
                    <span className="font-medium text-blue-800">
                      Batch {batchProgress.currentBatch}/{batchProgress.totalBatches} • 
                      {batchProgress.completedChunks}/{batchProgress.totalChunks} chunks
                      {batchProgress.failedChunks > 0 && ` • ${batchProgress.failedChunks} failed`}
                      {delayCountdown > 0 && (
                        <span className="text-orange-700 ml-2">
                          • Next batch in {Math.floor(delayCountdown / 60)}:{(delayCountdown % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </span>
                  </div>
                  {isGenerating && (
                    <button
                      onClick={handlePauseResume}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                </div>
                
                {/* Batch Progress Bar */}
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(batchProgress.completedBatches / batchProgress.totalBatches) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                {/* Chunk Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <motion.div
                    className="bg-green-500 h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(batchProgress.completedChunks / batchProgress.totalChunks) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <p className="text-sm text-blue-700 mt-2">
                  Processing in batches of 5 chunks with 1:05 minute delays between batch sends
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Display */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 border-b border-gray-100 ${
                  messageType === 'success' ? 'bg-green-50' :
                  messageType === 'error' ? 'bg-red-50' :
                  'bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {messageType === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {messageType === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {messageType === 'info' && <Volume2 className="h-4 w-4 text-blue-600" />}
                  <span className={`text-sm font-medium ${
                    messageType === 'success' ? 'text-green-800' :
                    messageType === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {message}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Control Buttons */}
          <div className="p-6">
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                onClick={handleGenerateAudio}
                disabled={isGenerating || !text.trim() || textChunks.length === 0}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  isGenerating || !text.trim() || textChunks.length === 0
                    ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl text-white'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing Batches...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Generate {textChunks.length} Audio Chunks
                  </div>
                )}
              </motion.button>

              {completedChunks.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadAllAsZip}
                  className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                >
                  <Archive className="h-5 w-5" />
                  Download ZIP ({completedChunks.length})
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Audio Chunks Display */}
        <AnimatePresence>
          {audioChunks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Audio Chunks</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    {completedChunks.length}/{audioChunks.length} completed
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {audioChunks.map((chunk) => (
                    <motion.div
                      key={chunk.chunkIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        chunk.status === 'completed' ? 'border-green-200 bg-green-50' :
                        chunk.status === 'failed' ? 'border-red-200 bg-red-50' :
                        chunk.status === 'generating' ? 'border-blue-200 bg-blue-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm text-gray-700">
                          Chunk {chunk.chunkIndex + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {chunk.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {chunk.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {chunk.status === 'generating' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                          {chunk.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 mb-3 line-clamp-3">
                        {chunk.text}
                      </p>

                      {chunk.status === 'completed' && (
                        <div className="space-y-2">
                          <audio 
                            controls 
                            className="w-full" 
                            style={{ height: '32px' }} 
                            preload="metadata"
                            onLoadStart={() => {
                              console.log(`🎵 [AUDIO] Load start for chunk ${chunk.chunkIndex}:`, {
                                chunkIndex: chunk.chunkIndex,
                                audioUrl: chunk.audioUrl,
                                filename: chunk.filename
                              });
                            }}
                            onLoadedData={() => {
                              console.log(`✅ [AUDIO] Loaded data for chunk ${chunk.chunkIndex}`);
                            }}
                            onError={(e) => {
                              const audioElement = e.target as HTMLAudioElement;
                              console.error(`❌ [AUDIO] Error loading chunk ${chunk.chunkIndex}:`, {
                                chunkIndex: chunk.chunkIndex,
                                audioUrl: chunk.audioUrl,
                                filename: chunk.filename,
                                error: audioElement.error,
                                networkState: audioElement.networkState,
                                readyState: audioElement.readyState,
                                currentSrc: audioElement.currentSrc
                              });
                            }}
                            onCanPlay={() => {
                              console.log(`🎵 [AUDIO] Can play chunk ${chunk.chunkIndex}`);
                            }}
                            onCanPlayThrough={() => {
                              console.log(`🎵 [AUDIO] Can play through chunk ${chunk.chunkIndex}`);
                            }}
                          >
                            <source src={chunk.audioUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{chunk.duration}s</span>
                            <button
                              onClick={() => handleDownloadAudio(chunk.audioUrl, chunk.filename)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      {chunk.status === 'failed' && chunk.error && (
                        <p className="text-xs text-red-600 mt-2">
                          Error: {chunk.error}
                        </p>
                      )}

                      {chunk.status === 'generating' && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
