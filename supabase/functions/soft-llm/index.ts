/**
 * Soft-LLM Edge Function
 *
 * Refines player vapor into character liquid.
 * Loads skill from coordinate 0.31 (Soft-LLM skill).
 *
 * Input: { text: string, coordinates: { t, s, i } }
 * Output: { refined: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SoftRequest {
  text: string
  coordinates: {
    t: string
    s: string
    i: string
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { text, coordinates }: SoftRequest = await req.json()

    if (!text || !coordinates) {
      return new Response(
        JSON.stringify({ error: 'Missing text or coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load Soft-LLM skill from 0.31
    const { data: skillData, error: skillError } = await supabase
      .from('content')
      .select('text')
      .eq('s', '0.31')
      .eq('shelf', 'solid')
      .single()

    if (skillError || !skillData) {
      console.error('Failed to load skill:', skillError)
      // Fallback: basic refinement without skill
      return new Response(
        JSON.stringify({ refined: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const skillPrompt = skillData.text

    // If no Anthropic key, return basic pass-through
    if (!anthropicKey) {
      console.log('No ANTHROPIC_API_KEY, returning original text')
      return new Response(
        JSON.stringify({ refined: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Claude to refine
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        system: skillPrompt,
        messages: [
          {
            role: 'user',
            content: `Player input (vapor): ${text}\n\nRefine this into character action (liquid).`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', errorText)
      return new Response(
        JSON.stringify({ refined: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const refined = result.content?.[0]?.text || text

    return new Response(
      JSON.stringify({ refined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
