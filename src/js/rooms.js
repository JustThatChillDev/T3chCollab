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
 * Join a room using its Room ID.
 */
export const joinRoom = async (roomId) => {

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

  const cleanRoomId =
    roomId.trim()

  if (!cleanRoomId) {
    return {
      success: false,
      error: 'Please enter a Room ID.'
    }
  }

  const { error } =
    await supabase
      .from('room_members')
      .insert({
        room_id: cleanRoomId,
        user_id: user.id
      })

  if (error) {

    console.error(
      'Error joining room:',
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
 * Create a new room.
 */
export const createRoom = async (
  name,
  description = ''
) => {
  const {
    data: {
      user
    },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      room: null,
      error: 'You must be logged in.'
    }
  }

  const { error } = await supabase
    .from('rooms')
    .insert({
      name,
      description: description || null,
      owner_id: user.id
    })

  if (error) {
    console.error(
      'Error creating room:',
      error
    )

    return {
      success: false,
      room: null,
      error: error.message
    }
  }

  return {
    success: true,
    room: null,
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