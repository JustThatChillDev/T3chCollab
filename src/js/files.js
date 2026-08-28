import { supabase } from './supabase.js'


// =====================================================
// UPLOAD FILE
// =====================================================

export const uploadFile = async (
  channelId,
  messageId,
  file
) => {

  if (!file) {

    return {
      success: false,
      file: null,
      error: 'No file selected.'
    }
  }


  if (!messageId) {

    return {
      success: false,
      file: null,
      error: 'Message ID is required.'
    }
  }


  // Get current user

  const {
    data: {
      user
    },
    error: userError
  } = await supabase.auth.getUser()


  if (userError || !user) {

    return {
      success: false,
      file: null,
      error: 'You must be logged in.'
    }
  }


  // Clean filename

  const cleanFilename =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    )


  // Storage path:
  //
  // channel-id/user-id/filename

  const storagePath =
    `${channelId}/${user.id}/${Date.now()}-${cleanFilename}`


  // Upload to Supabase Storage

  const {
    error: uploadError
  } = await supabase.storage
    .from('files')
    .upload(
      storagePath,
      file
    )


  if (uploadError) {

    console.error(
      'Error uploading file:',
      uploadError
    )

    return {
      success: false,
      file: null,
      error: uploadError.message
    }
  }


  // Save metadata

  const {
    data,
    error: databaseError
  } = await supabase
    .from('files')
    .insert({
      message_id: messageId,
      channel_id: channelId,
      user_id: user.id,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type:
        file.type ||
        'application/octet-stream'
    })
    .select()
    .single()


  // If metadata fails,
  // remove the uploaded object.

  if (databaseError) {

    console.error(
      'Error saving file metadata:',
      databaseError
    )

    await supabase.storage
      .from('files')
      .remove([
        storagePath
      ])

    return {
      success: false,
      file: null,
      error: databaseError.message
    }
  }


  return {
    success: true,
    file: data,
    error: null
  }
}

// =====================================================
// GET FILES
// =====================================================

export const getFiles = async (
  channelId
) => {

  const {
    data,
    error
  } = await supabase
    .from('files')
    .select(`
      id,
      channel_id,
      user_id,
      filename,
      storage_path,
      file_size,
      mime_type,
      created_at
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
      'Error loading files:',
      error
    )

    return {
      success: false,
      files: [],
      error: error.message
    }
  }


  return {
    success: true,
    files: data || [],
    error: null
  }
}


// =====================================================
// GET FILE URL
// =====================================================

export const getFileUrl = async (
  storagePath
) => {

  const {
    data,
    error
  } = await supabase.storage
    .from('files')
    .createSignedUrl(
      storagePath,
      3600
    )


  if (error) {

    console.error(
      'Error creating file URL:',
      error
    )

    return {
      success: false,
      url: null,
      error: error.message
    }
  }


  return {
    success: true,
    url: data.signedUrl,
    error: null
  }
}


// =====================================================
// DELETE FILE
// =====================================================

export const deleteFile = async (
  fileRecord
) => {

  if (!fileRecord) {

    return {
      success: false,
      error: 'File not found.'
    }
  }


  // Delete Storage object first

  const {
    error: storageError
  } = await supabase.storage
    .from('files')
    .remove([
      fileRecord.storage_path
    ])


  if (storageError) {

    console.error(
      'Error deleting storage file:',
      storageError
    )

    return {
      success: false,
      error: storageError.message
    }
  }


  // Delete database metadata

  const {
    error: databaseError
  } = await supabase
    .from('files')
    .delete()
    .eq(
      'id',
      fileRecord.id
    )


  if (databaseError) {

    console.error(
      'Error deleting file metadata:',
      databaseError
    )

    return {
      success: false,
      error: databaseError.message
    }
  }


  return {
    success: true,
    error: null
  }
}