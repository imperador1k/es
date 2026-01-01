/**
 * LiveKit Token Generator - Supabase Edge Function
 * Generates JWT access tokens for LiveKit rooms
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.0.0";

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
    // Get credentials from environment
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      throw new Error("Missing LiveKit credentials in environment");
    }

    // Parse request body
    const { room_name, username, user_id, avatar_url } = await req.json();

    if (!room_name || !username) {
      return new Response(
        JSON.stringify({ error: "room_name and username are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user_id || username,
      name: username,
      metadata: JSON.stringify({ avatar_url: avatar_url || null }),
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Set token expiry (1 hour)
    at.ttl = "1h";

    // Generate JWT
    const token = await at.toJwt();

    return new Response(
      JSON.stringify({ 
        token, 
        url: LIVEKIT_URL,
        room: room_name,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error generating token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
