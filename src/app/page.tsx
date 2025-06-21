'use client'

import { useState, useRef } from 'react'
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
      { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
      { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
      { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
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

  // Process batch of chunks
  const processBatch = async (batchChunks: TextChunk[], batchIndex: number) => {
    const requestBody: any = {
      chunks: batchChunks.map(chunk => ({
        index: chunk.index,
        text: chunk.text
      })),
      provider: selectedProvider,
      userId: 'demo_user'
    };

    // Add provider-specific parameters
    if (selectedProvider === 'minimax') {
      requestBody.voice = selectedVoice;
      requestBody.model = selectedModel;
    } else if (selectedProvider === 'elevenlabs') {
      requestBody.elevenLabsVoiceId = selectedVoice;
    }

    console.log(`🚀 Processing batch ${batchIndex + 1}: ${batchChunks.length} chunks`);

    const response = await fetch('/api/generate-audio-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Batch ${batchIndex + 1} failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results;
  }

  // Generate audio with batching
  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      showMessage('Please enter some text to generate audio', 'error')
      return
    }

    if (!selectedVoice) {
      showMessage('Please select a voice', 'error')
      return
    }

    if (textChunks.length === 0) {
      showMessage('No text chunks to process', 'error')
      return
    }

    setIsGenerating(true)
    setIsPaused(false)
    setMessage('')

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
      const batchSize = 10;
      const totalBatches = Math.ceil(textChunks.length / batchSize)
      
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
          showMessage('Generation paused by user', 'info')
          break
        }

        const batchStart = batchIndex * batchSize
        const batchEnd = Math.min(batchStart + batchSize, textChunks.length)
        const batchChunks = textChunks.slice(batchStart, batchEnd)

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
          const results = await processBatch(batchChunks, batchIndex)
          
          // Update chunks with results
          setAudioChunks(prev => prev.map(chunk => {
            const result = results.find((r: any) => r.chunkIndex === chunk.chunkIndex)
            if (result) {
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

          console.log(`✅ Batch ${batchIndex + 1}/${totalBatches} completed: ${successfulResults.length} successful, ${failedResults.length} failed`)

        } catch (error: any) {
          console.error(`❌ Batch ${batchIndex + 1} failed:`, error.message)
          
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

        // Delay between batches (except for the last batch)
        if (batchIndex < totalBatches - 1 && !isPaused) {
          showMessage(`Waiting 3 seconds before next batch...`, 'info')
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }

      const finalProgress = batchProgress
      if (finalProgress) {
        const successRate = ((finalProgress.completedChunks / finalProgress.totalChunks) * 100).toFixed(1)
        showMessage(`Generation completed! ${finalProgress.completedChunks}/${finalProgress.totalChunks} chunks successful (${successRate}%)`, finalProgress.failedChunks === 0 ? 'success' : 'info')
      }

    } catch (error: any) {
      console.error('Audio generation error:', error)
      showMessage(`Audio generation failed: ${error.message}`, 'error')
    } finally {
      setIsGenerating(false)
      setIsPaused(false)
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
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Download all audio as ZIP
  const handleDownloadAllAsZip = async () => {
    const completedChunks = audioChunks.filter(chunk => chunk.status === 'completed')
    
    if (completedChunks.length === 0) {
      showMessage('No completed audio chunks to download', 'error')
      return
    }

    try {
      showMessage('Creating ZIP file...', 'info')
      
      const zip = new JSZip()
      
      // Download each audio file and add to zip
      for (const chunk of completedChunks) {
        try {
          const response = await fetch(chunk.audioUrl)
          const audioBlob = await response.blob()
          const paddedIndex = String(chunk.chunkIndex + 1).padStart(3, '0')
          zip.file(`${paddedIndex}_${chunk.filename}`, audioBlob)
        } catch (error) {
          console.error(`Failed to fetch audio for chunk ${chunk.chunkIndex}:`, error)
        }
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const providerName = TTS_PROVIDERS[selectedProvider as keyof typeof TTS_PROVIDERS]?.name
      saveAs(zipBlob, `${providerName}_Audio_${timestamp}.zip`)
      
      showMessage(`Downloaded ${completedChunks.length} audio files as ZIP`, 'success')
    } catch (error: any) {
      console.error('Error creating ZIP:', error)
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
                  Processing in batches of 10 chunks with 3-second delays between batches
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
                          <audio controls className="w-full" style={{ height: '32px' }} preload="metadata">
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
