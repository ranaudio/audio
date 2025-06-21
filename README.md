# AI Audio Generator

A modern, animated web application for generating high-quality audio from text using **MiniMax** and **ElevenLabs** TTS providers with intelligent chunk-based batch processing.

## Features

- 🎵 **Multiple TTS Providers**: MiniMax and ElevenLabs support
- 📝 **Smart Text Chunking**: Automatic text splitting with sentence boundary preservation
  - **MiniMax**: 3,000 characters per chunk
  - **ElevenLabs**: 3,000 characters per chunk
- 🔄 **Frontend Batch Processing**: Process chunks in batches of 10 with progress tracking
- 🎨 **Modern UI**: Beautiful, animated interface built with Framer Motion
- 📊 **Real-time Progress**: Visual progress tracking for batches and individual chunks
- 🎯 **Individual Chunk Display**: Each audio chunk displayed separately with controls
- 📦 **ZIP Downloads**: Download all audio chunks as an ordered ZIP file
- ⏸️ **Pause/Resume**: Control batch processing with pause/resume functionality
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔍 **Detailed Status**: Real-time status for each chunk (pending, generating, completed, failed)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **File Processing**: JSZip, FileSaver
- **TTS Providers**: MiniMax, ElevenLabs

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd audio-standalone
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# MiniMax API Configuration (required for MiniMax TTS)
MINIMAX_GROUP_ID=your_minimax_group_id
MINIMAX_API_KEY=your_minimax_api_key

# ElevenLabs API Key (required for ElevenLabs TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

**Getting API Keys:**

- **MiniMax**: Get your Group ID and API key from [MiniMax AI Platform](https://www.minimaxi.com/)
- **ElevenLabs**: Get your API key from [ElevenLabs](https://elevenlabs.io/) → Settings → API Keys

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Chunk-Based Processing System

The app handles long text through an intelligent chunking system:

1. **Text Analysis**: Input text is analyzed and split into optimal chunks
2. **Smart Splitting**: Preserves sentence boundaries when possible
3. **Provider Optimization**: 
   - MiniMax: 3,000 character chunks for optimal quality
   - ElevenLabs: 3,000 character chunks for efficiency
4. **Batch Processing**: Chunks processed in batches of 10 from the frontend
5. **Individual Display**: Each chunk displayed separately with its own controls

### Batch Processing Flow

- **Batch Size**: 10 chunks per batch
- **Delay**: 3-second delay between batches to respect rate limits
- **Progress Tracking**: Real-time progress for both batches and individual chunks
- **Error Handling**: Failed chunks are marked and can be retried
- **Pause/Resume**: Users can pause and resume batch processing

### Status Management

Each chunk has one of four statuses:
- **Pending**: Waiting to be processed
- **Generating**: Currently being generated
- **Completed**: Successfully generated with audio available
- **Failed**: Generation failed with error message

## Usage

1. **Paste Your Text**: Enter or paste your script (up to 50,000 characters)
2. **Select Provider**: Choose between MiniMax or ElevenLabs
3. **Choose Voice**: Select from available voices for your chosen provider
4. **Review Chunks**: See how your text will be chunked
5. **Generate**: Start batch processing and watch real-time progress
6. **Control Process**: Pause/resume as needed
7. **Individual Access**: Play, download, or review each chunk separately
8. **Bulk Download**: Download all successful chunks as an ordered ZIP file

## API Endpoints

### `/api/generate-audio-comprehensive`

Single chunk audio generation.

**Request:**
```json
{
  "text": "Text chunk to convert to speech",
  "provider": "minimax", // or "elevenlabs"
  "voice": "voice_id", // for MiniMax
  "elevenLabsVoiceId": "voice_id", // for ElevenLabs
  "model": "speech-02-hd", // optional, for MiniMax
  "chunkIndex": 0,
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "/api/temp-audio/filename.mp3",
  "duration": 15,
  "provider": "minimax",
  "voice": "voice_id",
  "chunkIndex": 0,
  "filename": "filename.mp3"
}
```

### `/api/generate-audio-batch`

Batch processing of multiple chunks (called from frontend).

**Request:**
```json
{
  "chunks": [
    {"index": 0, "text": "First chunk text"},
    {"index": 1, "text": "Second chunk text"}
  ],
  "provider": "minimax",
  "voice": "voice_id",
  "model": "speech-02-hd",
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "totalChunks": 2,
  "successfulChunks": 2,
  "failedChunks": 0,
  "results": [
    {
      "chunkIndex": 0,
      "success": true,
      "audioUrl": "/api/temp-audio/file1.mp3",
      "duration": 15,
      "filename": "file1.mp3"
    }
  ]
}
```

## Project Structure

```
audio-standalone/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate-audio-comprehensive/
│   │   │   │   └── route.ts              # Single chunk generation
│   │   │   ├── generate-audio-batch/
│   │   │   │   └── route.ts              # Batch processing endpoint
│   │   │   └── temp-audio/
│   │   │       └── [filename]/
│   │   │           └── route.ts          # Audio file serving
│   │   ├── page.tsx                      # Main UI component
│   │   ├── layout.tsx                    # App layout
│   │   └── globals.css                   # Global styles
├── temp-audio-processing/                # Temporary audio files
├── package.json
└── README.md
```

## Voice Options

### MiniMax Voices
- **Female**: Radiant Girl, Captivating Female, Steady Women, etc.
- **Male**: Captivating Storyteller, Man With Deep Voice, Magnetic-voiced Male, etc.
- **Models**: Speech 02 HD, Speech 02 Turbo, Speech 01 HD, Speech 01 Turbo

### ElevenLabs Voices
- **Popular**: Rachel, Domi, Bella, Antoni, Elli, Josh
- **Model**: Multilingual V2 (automatic)

## Features in Detail

### Intelligent Chunking
- Respects sentence boundaries
- Provider-optimized chunk sizes
- Real-time chunk preview
- Character and word count tracking

### Batch Processing
- Frontend-controlled batching
- Configurable batch sizes (default: 10)
- Rate limit compliance with delays
- Progress visualization

### Individual Chunk Management
- Status tracking for each chunk
- Individual audio controls
- Download capabilities
- Error handling and retry options

### ZIP Export
- Ordered file naming (001_, 002_, etc.)
- Metadata in filenames
- Selective download (completed chunks only)
- Progress feedback during ZIP creation

## Limitations

- **File Storage**: Audio files are stored temporarily on the server
- **Rate Limits**: Respects API provider rate limits through batching and delays
- **Audio Format**: Outputs MP3 format only
- **Text Length**: Maximum 50,000 characters per generation
- **Chunk Processing**: No automatic retry for failed chunks (manual restart required)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter issues:

1. Verify your API keys are correct and have sufficient credits
2. Check the console for detailed error messages
3. Ensure your text is within character limits
4. Try reducing batch sizes if encountering rate limits
