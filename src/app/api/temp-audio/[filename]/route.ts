import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

async function findAudioFile(filename: string): Promise<string | null> {
  const tempAudioDir = path.join(process.cwd(), 'temp-audio-processing')
  
  try {
    // First try direct path
    const directPath = path.join(tempAudioDir, filename)
    await fs.access(directPath)
    return directPath
  } catch {
    // If not found directly, search in subdirectories
    try {
      const subdirs = await fs.readdir(tempAudioDir, { withFileTypes: true })
      
      for (const subdir of subdirs) {
        if (subdir.isDirectory()) {
          const subdirPath = path.join(tempAudioDir, subdir.name, filename)
          try {
            await fs.access(subdirPath)
            return subdirPath
          } catch {
            // Continue searching
          }
        }
      }
    } catch {
      // Directory doesn't exist or other error
    }
  }
  
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Find the audio file
    const filePath = await findAudioFile(filename)
    
    if (!filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath)
    
    // Return the audio file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Range',
      },
    })
  } catch (error) {
    console.error('Error serving audio file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 