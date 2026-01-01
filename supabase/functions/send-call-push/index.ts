/**
 * Send Call Push Notification - Supabase Edge Function
 * Sends a high-priority push notification to trigger native call UI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body
        const { recipient_id, caller_name, conversation_id } = await req.json();

        if (!recipient_id || !caller_name || !conversation_id) {
            return new Response(
                JSON.stringify({ error: "recipient_id, caller_name, and conversation_id are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Sending call push to ${recipient_id} from ${caller_name}`);

        // Get recipient's push token from profiles
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("push_token, username")
            .eq("id", recipient_id)
            .single();

        if (profileError || !profile?.push_token) {
            console.error("No push token found for user:", recipient_id);
            return new Response(
                JSON.stringify({ error: "No push token found for recipient" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Found push token for ${profile.username}`);

        // Send push notification via Expo Push API
        const expoPushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
            body: JSON.stringify({
                to: profile.push_token,
                title: "📞 Chamada de Vídeo",
                body: `${caller_name} está a ligar...`,
                sound: "default",
                priority: "high",
                channelId: "calls", // Android notification channel
                categoryId: "call", // iOS notification category
                data: {
                    type: "call_invite",
                    callerId: recipient_id,
                    callerName: caller_name,
                    conversationId: conversation_id,
                    timestamp: Date.now(),
                },
                // Android specific - high priority for background wakeup
                _contentAvailable: true,
                // iOS specific - for background processing
                _displayInForeground: true,
            }),
        });

        const pushResult = await expoPushResponse.json();
        console.log("Push notification result:", pushResult);

        if (pushResult.data?.[0]?.status === "error") {
            console.error("Push notification error:", pushResult.data[0].message);
            return new Response(
                JSON.stringify({ error: pushResult.data[0].message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Call notification sent",
                recipient: profile.username,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Error sending call push:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
