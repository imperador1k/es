import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // 1. Configurar o Cliente Supabase interno
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usa a service role para ignorar permissões
    )

    // 2. Receber os dados do Webhook (a mensagem que foi inserida)
    const { record } = await req.json()

    // record contém os dados da tabela 'messages' (ex: record.content, record.user_id, record.squad_id)
    const messageContent = record.content
    const senderId = record.user_id

    // 3. Buscar todos os tokens de quem NÃO é o remetente
    // (Podes filtrar por squad_id aqui se quiseres enviar só para a turma)
    const { data: tokensData, error: dbError } = await supabaseClient
      .from('user_push_tokens')
      .select('token')
      .neq('user_id', senderId) 

    if (dbError) throw dbError

    const tokens = tokensData.map((t: any) => t.token)

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'Sem tokens para enviar' }), { status: 200 })
    }

    // 4. Enviar para a API da Expo
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: tokens,
        title: "Nova mensagem na Squad! 🚀",
        body: messageContent,
        data: { screen: 'Chat', messageId: record.id },
        sound: 'default',
      }),
    })

    const result = await expoResponse.json()

    return new Response(JSON.stringify(result), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 400 
    })
  }
})