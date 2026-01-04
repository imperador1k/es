import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_BSMbHftb_FYcEaDUTGNxhrNbj58CnKcYT";
const ADMIN_EMAIL = "contacto@miguelweb.dev"; // Replace with actual admin email or keep generic if testing
 
interface ReportPayload {
  reporter_email: string;
  reported_id: string;
  reported_name: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { reporter_email, reported_id, reported_name, reason } = await req.json() as ReportPayload;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Escola+ Security <contacto@miguelweb.dev>",
        to: [ADMIN_EMAIL],
        subject: `🚨 REPORT: ${reported_name} foi denunciado`,
        html: `
          <!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Novo Report - Escola+</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content-padding { padding: 24px 20px !important; }
      .button-full { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1115; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <div style="display: none; max-height: 0; overflow: hidden;">
    🚨 Novo report recebido: ${reported_name} foi denunciado por ${reason}.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F1115;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" class="container" style="max-width: 560px;">
          
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%); border-radius: 20px; padding: 16px; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);">
                    <img src="https://img.icons8.com/fluency/96/appointment-reminders.png" alt="🔔" width="40" height="40" style="display: block;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #181A20; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
                
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #EF4444, #F87171, #FECACA);"></td>
                </tr>
                
                <tr>
                  <td class="content-padding" style="padding: 40px 40px 32px 40px;">
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 24px;">
                          <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.15); color: #F87171; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; letter-spacing: 0.5px;">
                            🛡️ ALERTA ADMIN
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <h1 style="margin: 0 0 8px 0; color: #FFFFFF; font-size: 24px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">
                      Novo Report Recebido
                    </h1>
                    <p style="margin: 0 0 32px 0; color: #6B7280; font-size: 14px; text-align: center;">
                      Ação necessária: verifica os detalhes abaixo.
                    </p>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px;">
                        <tr>
                            <td style="color: #A1A1AA; font-size: 13px;">Denunciado por:</td>
                            <td align="right" style="color: #FFFFFF; font-size: 13px; font-weight: 500;">${reporter_email}</td>
                        </tr>
                    </table>
                    
                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                        Utilizador Alvo
                    </p>
                    <div style="background-color: #1F2128; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05);">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td>
                                    <p style="margin: 0 0 4px 0; color: #FFFFFF; font-size: 16px; font-weight: 600;">
                                        ${reported_name}
                                    </p>
                                    <p style="margin: 0; color: #818CF8; font-size: 12px; font-family: monospace;">
                                        ID: ${reported_id}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                        Motivo da Denúncia
                    </p>
                    <div style="background-color: rgba(239, 68, 68, 0.05); border-left: 3px solid #EF4444; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                        <p style="margin: 0; color: #E5E7EB; font-size: 14px; line-height: 1.5; font-style: italic;">
                            "${reason}"
                        </p>
                    </div>
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="button-full">
                            <tr>
                              <td align="center" style="border-radius: 12px; background-color: #27272A; border: 1px solid rgba(255,255,255,0.1);">
                                <a href="https://supabase.com/dashboard/project/_/editor" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none;">
                                  Ver no Supabase ↗
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #4B5563; font-size: 11px;">
                      Gerado automaticamente em ${new Date().toLocaleString('pt-PT')}
                    </p>
                  </td>
                </tr>
              </table>
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
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
