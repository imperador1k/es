import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = "re_FJtuRnS6_MrUAdT3XJvQeEN4DxpcL8yQD"
const ADMIN_EMAIL = "contacto@miguelweb.dev" // Email pessoal do admin

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_email, user_id, subject, message } = await req.json()
    console.log(`Sending support ticket from ${user_email} to ${ADMIN_EMAIL}`)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Suporte Escola+ <suporte@miguelweb.dev>',
        to: [ADMIN_EMAIL],
        reply_to: user_email,
        subject: `[Suporte] ${subject} - ${user_email}`,
        text: `Escola+ Suporte\n\nAssunto: ${subject}\nDe: ${user_email} (${user_id})\n\n${message}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f3f4f6; margin: 0; padding: 0;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
        <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <tr>
                    <td style="background-color: #111827; padding: 30px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Escola+</h1>
                        <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Support Ticket</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px;">
                        
                        <div style="text-align: center; margin-bottom: 30px;">
                             <span style="background-color: #EEF2FF; color: #6366f1; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #E0E7FF;">
                                ${subject}
                            </span>
                        </div>

                        <p style="color: #374151; font-size: 16px; margin-bottom: 10px;">
                            <strong>Recebeste uma nova mensagem:</strong>
                        </p>
                        
                        <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 20px; margin-bottom: 25px; color: #4b5563; font-style: italic; font-size: 15px;">
                            "${message.replace(/\n/g, '<br>')}"
                        </div>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                            <tr>
                                <td style="padding: 15px 0; color: #6b7280; font-size: 14px;"><strong>Enviado por:</strong></td>
                                <td style="padding: 15px 0; text-align: right; color: #111827; font-size: 14px;">${user_email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0; color: #6b7280; font-size: 14px;"><strong>User ID:</strong></td>
                                <td style="padding: 15px 0; text-align: right; color: #6b7280; font-size: 12px; font-family: monospace;">${user_id}</td>
                            </tr>
                        </table>

                        <div style="text-align: center;">
                            <a href="mailto:${user_email}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                                Responder Agora
                            </a>
                        </div>
                    </td>
                </tr>

                <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                            Enviado via sistema automático <strong>Escola+ App</strong>
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
