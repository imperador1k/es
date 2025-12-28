/**
 * Push Sender Edge Function
 * Sends push notifications for:
 * - Chat: DMs, Teams, Study Rooms
 * - Engagement: Friend requests, Task assignments, Grades
 * 
 * Called via Supabase Database Webhooks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  schema: string
  old_record: Record<string, unknown> | null
}

// Helper: Get user display name
async function getUserName(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', userId)
    .single()
  return data?.full_name || data?.username || 'Alguém'
}

// Helper: Send push notifications
async function sendPushNotifications(
  supabase: any,
  recipientIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  if (recipientIds.length === 0) {
    return { sent: 0, message: 'No recipients' }
  }

  const { data: tokensData } = await supabase
    .from('user_push_tokens')
    .select('token')
    .in('user_id', recipientIds)

  const tokens = tokensData?.map((t: any) => t.token).filter(Boolean) || []

  if (tokens.length === 0) {
    return { sent: 0, message: 'No push tokens' }
  }

  const messages = tokens.map((token: string) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
    badge: 1,
  }))

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await expoResponse.json()
  console.log(`📲 Sent ${tokens.length} notifications`)
  
  return { sent: tokens.length, result }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: WebhookPayload = await req.json()
    const { type, table, record, old_record } = payload

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let recipientIds: string[] = []
    let notificationTitle = ''
    let notificationBody = ''
    let notificationData: Record<string, unknown> = {}

    // ============================================
    // CHAT NOTIFICATIONS
    // ============================================

    if (table === 'dm_messages') {
      const senderId = record.sender_id as string
      const conversationId = record.conversation_id as string
      const content = record.content as string || ''
      const attachmentType = record.attachment_type as string | null

      const senderName = await getUserName(supabase, senderId)
      let preview = content
      if (attachmentType === 'image') preview = '📷 Imagem'
      else if (attachmentType === 'gif') preview = '🎬 GIF'
      else if (attachmentType === 'file') preview = '📎 Ficheiro'
      else if (content.length > 40) preview = content.substring(0, 40) + '...'

      const { data: conv } = await supabase
        .from('dm_conversations')
        .select('user1_id, user2_id')
        .eq('id', conversationId)
        .single()

      if (conv) {
        recipientIds = [conv.user1_id === senderId ? conv.user2_id : conv.user1_id]
      }

      notificationTitle = `💬 ${senderName}`
      notificationBody = preview
      notificationData = { type: 'dm', conversationId }

    } else if (table === 'messages') {
      const senderId = record.user_id as string
      const channelId = record.channel_id as string
      const content = record.content as string || ''

      const senderName = await getUserName(supabase, senderId)
      const preview = content.length > 40 ? content.substring(0, 40) + '...' : content

      const { data: channel } = await supabase
        .from('channels')
        .select('team_id, name')
        .eq('id', channelId)
        .single()

      if (channel) {
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', channel.team_id)
          .neq('user_id', senderId)

        recipientIds = members?.map((m: any) => m.user_id) || []
        notificationTitle = `📢 #${channel.name}`
        notificationBody = `${senderName}: ${preview}`
        notificationData = { type: 'team', teamId: channel.team_id, channelId }
      }

    } else if (table === 'study_room_messages') {
      const senderId = record.user_id as string
      const roomId = record.room_id as string
      const content = record.content as string || ''

      const senderName = await getUserName(supabase, senderId)
      const preview = content.length > 40 ? content.substring(0, 40) + '...' : content

      const { data: room } = await supabase
        .from('study_rooms')
        .select('name')
        .eq('id', roomId)
        .single()

      const { data: participants } = await supabase
        .from('study_room_participants')
        .select('user_id')
        .eq('room_id', roomId)
        .neq('user_id', senderId)

      recipientIds = participants?.map((p: any) => p.user_id) || []
      notificationTitle = `📚 ${room?.name || 'Study Room'}`
      notificationBody = `${senderName}: ${preview}`
      notificationData = { type: 'study_room', roomId }

    // ============================================
    // FRIENDSHIP NOTIFICATIONS
    // ============================================

    } else if (table === 'friendships') {
      const requesterId = record.requester_id as string
      const addresseeId = record.addressee_id as string
      const status = record.status as string
      const oldStatus = old_record?.status as string | undefined

      if (type === 'INSERT' && status === 'pending') {
        // New friend request
        const requesterName = await getUserName(supabase, requesterId)
        recipientIds = [addresseeId]
        notificationTitle = '👋 Novo Pedido de Amizade'
        notificationBody = `${requesterName} quer ser teu amigo.`
        notificationData = { type: 'friend_request', requesterId }

      } else if (type === 'UPDATE' && status === 'accepted' && oldStatus === 'pending') {
        // Friend request accepted
        const addresseeName = await getUserName(supabase, addresseeId)
        recipientIds = [requesterId]
        notificationTitle = '🎉 Pedido Aceite!'
        notificationBody = `Tu e ${addresseeName} agora são amigos.`
        notificationData = { type: 'friend_accepted', friendId: addresseeId }
      }

    // ============================================
    // TASK ASSIGNMENT NOTIFICATIONS
    // ============================================

    } else if (table === 'task_assignments') {
      if (type === 'INSERT') {
        const userId = record.user_id as string
        const taskId = record.task_id as string

        // Get task details
        const { data: task } = await supabase
          .from('tasks')
          .select('title, team_id')
          .eq('id', taskId)
          .single()

        if (task && userId) {
          recipientIds = [userId]
          notificationTitle = '📝 Nova Tarefa'
          notificationBody = `Tens uma nova tarefa: ${task.title}`
          notificationData = { type: 'task_assigned', taskId, teamId: task.team_id }
        }
      }

    // ============================================
    // GRADE/FEEDBACK NOTIFICATIONS
    // ============================================

    } else if (table === 'task_submissions') {
      const userId = record.user_id as string
      const taskId = record.task_id as string
      const newStatus = record.status as string
      const oldStatus = old_record?.status as string | undefined
      const score = record.score as number | null

      // Only notify when graded
      const wasGraded = type === 'UPDATE' && (
        (newStatus === 'graded' && oldStatus !== 'graded') ||
        (score !== null && old_record?.score === null)
      )

      if (wasGraded) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title, team_id')
          .eq('id', taskId)
          .single()

        if (task) {
          recipientIds = [userId]
          notificationTitle = '✅ Nota Lançada'
          notificationBody = score !== null 
            ? `Recebeste ${score} pontos em "${task.title}"`
            : `O professor avaliou a tua entrega em "${task.title}"`
          notificationData = { type: 'grade', taskId, teamId: task.team_id, score }
        }
      }
    }

    // ============================================
    // SEND NOTIFICATIONS
    // ============================================

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No action needed' }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result = await sendPushNotifications(
      supabase,
      recipientIds,
      notificationTitle,
      notificationBody,
      notificationData
    )

    return new Response(JSON.stringify({ 
      success: true, 
      table,
      ...result 
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Push sender error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
