import { supabase } from './supabaseClient'

function generateMeetingCode() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint32Array(8)

  crypto.getRandomValues(array)

  return Array.from(
    array,
    (value) => characters[value % characters.length]
  ).join('')
}

export async function createMeeting(title, memoryMode) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in.')
  }

  let lastError = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const meetingCode = generateMeetingCode()

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        host_id: user.id,
        title,
        meeting_code: meetingCode,
        memory_mode: memoryMode,
        status: 'scheduled',
      })
      .select()
      .single()

    if (!error) {
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          role: 'host',
        })

      if (participantError) {
        await supabase
          .from('meetings')
          .delete()
          .eq('id', meeting.id)

        throw participantError
      }

      return meeting
    }

    lastError = error
  }

  throw lastError || new Error('Could not create meeting.')
}

export async function joinMeeting(code) {
  const { data, error } = await supabase.rpc(
    'join_meeting_by_code',
    {
      p_meeting_code: code,
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error('Meeting not found.')
  }

  return data[0]
}

export async function getMyMeetings() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in.')
  }

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}