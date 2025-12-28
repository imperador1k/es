// AI Tutor Edge Function - Gemini 1.5 Flash
// https://deno.land/manual/getting_started/setup_your_environment

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API key from env
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ 
          response: '❌ A API key do Gemini não está configurada. Contacta o administrador.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Parse request body
    const { prompt, imageBase64, mimeType } = await req.json()
    console.log('Received request - prompt length:', prompt?.length, 'hasImage:', !!imageBase64)

    if (!prompt && !imageBase64) {
      return new Response(
        JSON.stringify({ response: '❌ Envia uma mensagem ou imagem para eu ajudar!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Build content parts - include system context in the prompt itself
    const systemContext = `[CONTEXTO: Tu és o EscolaAI, um tutor de estudo virtual. Ajudas estudantes portugueses. Responde SEMPRE em português de Portugal. Sê claro, conciso e pedagógico. Usa emojis ocasionalmente. Se não souberes, diz honestamente.]

`
    const parts: any[] = []
    
    // Add text prompt with system context
    if (prompt) {
      parts.push({ text: systemContext + prompt })
    }
    
    // Add image if present
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType || 'image/jpeg',
          data: imageBase64
        }
      })
      if (!prompt) {
        parts.unshift({ text: systemContext + 'Analisa esta imagem e explica o que vês. Se for um exercício, ajuda-me a resolvê-lo passo a passo.' })
      }
    }

    // Call Gemini API directly via REST (v1 API)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)
      
      // Check for specific errors
      if (errorText.includes('API_KEY_INVALID')) {
        return new Response(
          JSON.stringify({ response: '❌ A API key do Gemini é inválida. Verifica a configuração.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      
      return new Response(
        JSON.stringify({ response: `❌ Erro ao contactar o Gemini (${geminiResponse.status}). Tenta novamente.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response received')

    // Extract the response text
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text 
      || 'Desculpa, não consegui gerar uma resposta. Tenta reformular a pergunta.'

    return new Response(
      JSON.stringify({ response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('AI Tutor Error:', error)
    
    return new Response(
      JSON.stringify({ 
        response: '❌ Ocorreu um erro inesperado. Tenta novamente em alguns segundos.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
