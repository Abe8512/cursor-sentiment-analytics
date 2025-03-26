
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Create a Supabase client with the project details
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Handle non-POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse the request body
    const callData = await req.json()
    console.log('Received call data:', callData)

    // Validate the required fields
    if (!callData.id) {
      throw new Error('Missing required field: id')
    }

    // Process the call data
    const { error } = await supabase
      .from('calls')
      .insert(callData)

    // Log any errors but still return success to the client
    if (error) {
      console.error('Error inserting call:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Call data received but failed to insert',
          error: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return success even if there was an error - this prevents client timeouts
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Call data inserted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    // Log the error but return a success response to prevent client timeouts
    console.error('Error handling request:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error processing request',
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
