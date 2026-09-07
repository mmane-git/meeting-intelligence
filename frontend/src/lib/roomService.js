import { supabase } from './supabaseClient'

export async function getMeetingParticipants(meetingId) {
  const { data, error } = await supabase
    .from('meeting_participants')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      left_at,
      profiles (
        display_name
      )
    `)
    .eq('meeting_id', meetingId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function markParticipantPresent(meetingId, userId) {
  const { error } = await supabase
    .from('meeting_participants')
    .update({
      joined_at: new Date().toISOString(),
      left_at: null,
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function leaveMeeting(meetingId, userId) {
  const { error } = await supabase
    .from('meeting_participants')
    .update({
      left_at: new Date().toISOString(),
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function startMeeting(meetingId) {
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'live',
      started_at: new Date().toISOString(),
    })
    .eq('id', meetingId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function endMeeting(meetingId) {
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', meetingId)

  if (error) {
    throw new Error(error.message)
  }
}

export function subscribeToParticipants(meetingId, callback) {
  const channel = supabase
    .channel(`participants:${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'meeting_participants',
        filter: `meeting_id=eq.${meetingId}`,
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToMeeting(meetingId, callback) {
  const channel = supabase
    .channel(`meeting:${meetingId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'meetings',
        filter: `id=eq.${meetingId}`,
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}