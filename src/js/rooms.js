import { supabase } from './supabase.js'


/**
 * Get all rooms the current user belongs to.
 */
export const getMyRooms = async () => {

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

  const roomIds =
    memberships.map(
      membership => membership.room_id
    )

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
    .order('created_at', {
      ascending: true
    })

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
export const joinRoom = async (
  inviteCode
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
      error: 'You must be logged in.'
    }
  }

  const cleanInviteCode =
    inviteCode
      .trim()
      .toUpperCase()

  if (!cleanInviteCode) {

    return {
      success: false,
      error: 'Please enter an invite code.'
    }
  }


  // Find the room using the invite code.
  const {
    data: rooms,
    error: roomError
  } = await supabase
    .rpc(
      'get_room_by_invite_code',
      {
        code: cleanInviteCode
      }
    )

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

  const room =
    rooms?.[0]

  if (!room) {

    return {
      success: false,
      error: 'Invalid invite code.'
    }
  }


  // Join the room.
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

    // Already a member.
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

  const cleanName =
    name.trim()

  const cleanDescription =
    description.trim() || null

  if (!cleanName) {

    return {
      success: false,
      room: null,
      error: 'Room name is required.'
    }
  }

  // Prefer the SECURITY DEFINER RPC from migration 005.
  // It creates the room and owner membership in one database
  // transaction, avoiding INSERT ... RETURNING RLS edge cases.
  const {
    data: rpcRooms,
    error: rpcError
  } = await supabase
    .rpc(
      'create_room_with_owner',
      {
        room_name: cleanName,
        room_description: cleanDescription
      }
    )

  if (!rpcError) {

    return {
      success: true,
      room: rpcRooms?.[0] || null,
      error: null
    }
  }

  // Backward-compatible fallback for databases that have not
  // applied migration 005 yet. Do not request the inserted row:
  // some RLS setups allow INSERT for owners but block RETURNING
  // until the room_members trigger has completed.
  if (
    rpcError.code !== '42883' &&
    !String(rpcError.message || '')
      .includes('create_room_with_owner')
  ) {

    console.error(
      'Error creating room with RPC:',
      rpcError
    )

    return {
      success: false,
      room: null,
      error: rpcError.message
    }
  }

  const roomPayload = {
    name: cleanName,
    description: cleanDescription,
    owner_id: user.id
  }

  const {
    error
  } = await supabase
    .from('rooms')
    .insert(roomPayload)

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
    room: roomPayload,
    error: null
  }
}


/**
 * Get all channels in a room.
 */
export const getChannels = async (
  roomId
) => {

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
    .eq(
      'room_id',
      roomId
    )
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
export const deleteRoom = async (
  roomId
) => {

  const {
    error
  } = await supabase
    .from('rooms')
    .delete()
    .eq(
      'id',
      roomId
    )

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
export const deleteChannel = async (
  channelId
) => {

  const {
    error
  } = await supabase
    .from('channels')
    .delete()
    .eq(
      'id',
      channelId
    )

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