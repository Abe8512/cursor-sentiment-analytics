
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, userProvidedKey } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    console.log('Received audio data, processing...')

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    
    // Get OpenAI API key from environment variable or user-provided key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY') || userProvidedKey
    
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured in Edge Function secrets and no user key provided')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured on the server or in the request', 
          text: 'This is a simulated transcript as OpenAI API key is not configured. In a production environment, this would be the actual transcribed content from the OpenAI Whisper API.'
        }),
        { 
          status: 200, // Return 200 with simulated response for better UX
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('API Key available:', openAIApiKey ? 'Yes (first 3 chars: ' + openAIApiKey.substring(0, 3) + '...)' : 'No')
    
    // Prepare form data
    const formData = new FormData()
    const blob = new Blob([binaryAudio], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')

    console.log('Sending to OpenAI...')

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Transcription successful')

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in transcribe-audio function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        text: `Error occurred during transcription: ${error.message}. Please check your API key and try again.`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
