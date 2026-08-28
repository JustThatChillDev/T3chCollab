import { supabase } from './supabase.js'

/**
 * Get all rooms the current user belongs to.
 */
export const getMyRooms = async () => {
  // Get the current user
  const {
    data: {
      user
    },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      rooms: [],
      error: 'You must be logged in.'
    }
  }

  // Get the rooms this user belongs to
  const {
    data: memberships,
    error: membershipError
  } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error(
      'Error loading room memberships:',
      membershipError
    )

    return {
      success: false,
      rooms: [],
      error: membershipError.message
    }
  }

  if (!memberships || memberships.length === 0) {
    return {
      success: true,
      rooms: [],
      error: null
    }
  }

  // Extract room IDs
  const roomIds = memberships.map(
    membership => membership.room_id
  )

  // Get the actual rooms
  const {
    data: rooms,
    error: roomsError
  } = await supabase
    .from('rooms')
    .select(`
  id,
  name,
  description,
  owner_id,
  invite_code,
  created_at
`)
    .in('id', roomIds)
    .order('created_at', { ascending: true })

  if (roomsError) {
    console.error(
      'Error loading rooms:',
      roomsError
    )

    return {
      success: false,
      rooms: [],
      error: roomsError.message
    }
  }

  return {
    success: true,
    rooms: rooms || [],
    error: null
  }
}

/**
 * Join a room using its invite code.
 */
export const joinRoom = async (inviteCode) => {

  const {
    data: {
      user
    },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: 'You must be logged in.'
    }
  }

  const cleanInviteCode =
    inviteCode.trim().toUpperCase()

  if (!cleanInviteCode) {
    return {
      success: false,
      error: 'Please enter an invite code.'
    }
  }

  // Find the room using the invite code
  const {
    data: room,
    error: roomError
  } = await supabase
    .from('rooms')
    .select('id')
    .eq('invite_code', cleanInviteCode)
    .maybeSingle()

  if (roomError) {
    console.error(
      'Error finding room:',
      roomError
    )

    return {
      success: false,
      error: roomError.message
    }
  }

  if (!room) {
    return {
      success: false,
      error: 'Invalid invite code.'
    }
  }

  // Join the room
  const {
    error: joinError
  } = await supabase
    .from('room_members')
    .insert({
      room_id: room.id,
      user_id: user.id
    })

  if (joinError) {

    console.error(
      'Error joining room:',
      joinError
    )

    // Already a member
    if (
      joinError.code === '23505'
    ) {
      return {
        success: false,
        error: 'You are already a member of this room.'
      }
    }

    return {
      success: false,
      error: joinError.message
    }
  }

  return {
    success: true,
    error: null
  }
}


/**
 * Get all channels in a room.
 */
export const getChannels = async (roomId) => {
  const {
    data,
    error
  } = await supabase
    .from('channels')
    .select(`
      id,
      room_id,
      name,
      type,
      created_at
    `)
    .eq('room_id', roomId)
    .order('created_at', {
      ascending: true
    })

  if (error) {
    console.error(
      'Error loading channels:',
      error
    )

    return {
      success: false,
      channels: [],
      error: error.message
    }
  }

  return {
    success: true,
    channels: data || [],
    error: null
  }
}


/**
 * Create a new channel.
 */
export const createChannel = async (
  roomId,
  name
) => {
  const {
    data,
    error
  } = await supabase
    .from('channels')
    .insert({
      room_id: roomId,
      name: name.trim()
    })
    .select()
    .single()

  if (error) {
    console.error(
      'Error creating channel:',
      error
    )

    return {
      success: false,
      channel: null,
      error: error.message
    }
  }

  return {
    success: true,
    channel: data,
    error: null
  }
}

/**
 * Delete a room.
 */
export const deleteRoom = async (roomId) => {

  const {
    error
  } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)

  if (error) {

    console.error(
      'Error deleting room:',
      error
    )

    return {
      success: false,
      error: error.message
    }
  }

  return {
    success: true,
    error: null
  }
}


/**
 * Delete a channel.
 */
export const deleteChannel = async (channelId) => {

  const {
    error
  } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId)

  if (error) {

    console.error(
      'Error deleting channel:',
      error
    )

    return {
      success: false,
      error: error.message
    }
  }

  return {
    success: true,
    error: null
  }
}