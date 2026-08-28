import { supabase } from './supabase.js'


// =====================================================
// GET MESSAGES
// =====================================================

export const getMessages = async (
  channelId
) => {

  if (!channelId) {

    return {
      success: false,
      messages: [],
      error: 'Channel ID is required.'
    }
  }


  const {
    data,
    error
  } = await supabase
    .from('messages')
    .select(`
      id,
      channel_id,
      user_id,
      content,
      created_at,
      files (
        id,
        message_id,
        channel_id,
        user_id,
        filename,
        storage_path,
        file_size,
        mime_type,
        created_at
      )
    `)
    .eq(
      'channel_id',
      channelId
    )
    .order(
      'created_at',
      {
        ascending: true
      }
    )


  if (error) {

    console.error(
      'Error loading messages:',
      error
    )

    return {
      success: false,
      messages: [],
      error: error.message
    }
  }


  return {
    success: true,
    messages: data || [],
    error: null
  }
}


// =====================================================
// SEND MESSAGE
// =====================================================

export const sendMessage = async (
  channelId,
  content
) => {

  if (!channelId) {

    return {
      success: false,
      message: null,
      error: 'Channel ID is required.'
    }
  }


  const {
    data: {
      user
    },
    error: userError
  } = await supabase.auth.getUser()


  if (userError || !user) {

    return {
      success: false,
      message: null,
      error: 'You must be logged in.'
    }
  }


  const cleanContent =
    String(content ?? '').trim()


  if (!cleanContent) {

    return {
      success: false,
      message: null,
      error: 'Message cannot be empty.'
    }
  }


  const {
    data,
    error
  } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      user_id: user.id,
      content: cleanContent
    })
    .select()
    .single()


  if (error) {

    console.error(
      'Error sending message:',
      error
    )

    return {
      success: false,
      message: null,
      error: error.message
    }
  }


  return {
    success: true,
    message: data,
    error: null
  }
}


// =====================================================
// EDIT MESSAGE
// =====================================================

export const editMessage = async (
  messageId,
  content
) => {

  if (!messageId) {

    return {
      success: false,
      message: null,
      error: 'Message ID is required.'
    }
  }


  const cleanContent =
    String(content ?? '').trim()


  if (!cleanContent) {

    return {
      success: false,
      message: null,
      error: 'Message cannot be empty.'
    }
  }


  const {
    data,
    error
  } = await supabase
    .from('messages')
    .update({
      content: cleanContent
    })
    .eq(
      'id',
      messageId
    )
    .select()
    .single()


  if (error) {

    console.error(
      'Error editing message:',
      error
    )

    return {
      success: false,
      message: null,
      error: error.message
    }
  }


  return {
    success: true,
    message: data,
    error: null
  }
}


// =====================================================
// DELETE MESSAGE
// =====================================================

export const deleteMessage = async (
  messageId
) => {

  if (!messageId) {

    return {
      success: false,
      error: 'Message ID is required.'
    }
  }


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


  const {
    error
  } = await supabase
    .from('messages')
    .delete()
    .eq(
      'id',
      messageId
    )
    .eq(
      'user_id',
      user.id
    )


  if (error) {

    console.error(
      'Error deleting message:',
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


// =====================================================
// SUBSCRIBE TO MESSAGES
// =====================================================

export const subscribeToMessages = (
  channelId,
  callback
) => {

  const realtimeChannel =
    supabase
      .channel(
        `messages:${channelId}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter:
            `channel_id=eq.${channelId}`
        },
        payload => {

          console.log(
            'Message realtime event:',
            payload
          )

          if (
            typeof callback ===
            'function'
          ) {

            callback(payload)
          }
        }
      )
      .subscribe()


  return realtimeChannel
}


// =====================================================
// UNSUBSCRIBE FROM MESSAGES
// =====================================================

export const unsubscribeFromMessages =
  async (
    realtimeChannel
  ) => {

    if (!realtimeChannel) {
      return
    }


    await supabase.removeChannel(
      realtimeChannel
    )
  }