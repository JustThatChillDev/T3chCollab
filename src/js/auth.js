import { supabase } from './supabase.js'

/**
 * Sign up a new user
 * Profile creation is handled by a database trigger.
 */
export const signUp = async (email, password, username) => {
  try {
    if (!email || !password || !username) {
      return {
        success: false,
        error: 'Email, password, and username are required'
      }
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters'
      }
    }

    if (username.length < 2 || username.length > 30) {
      return {
        success: false,
        error: 'Username must be between 2 and 30 characters'
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    })

    if (error) {
      console.error('Signup error:', error)

      return {
        success: false,
        error: error.message
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Signup failed - no user created'
      }
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    }

  } catch (error) {
    console.error('Signup exception:', error)

    return {
      success: false,
      error: 'An unexpected error occurred during signup'
    }
  }
}


/**
 * Sign in an existing user
 */
export const signIn = async (email, password) => {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required'
      }
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    if (error) {
      console.error('Signin error:', error)

      return {
        success: false,
        error: error.message
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Login failed - no user returned'
      }
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    }

  } catch (error) {
    console.error('Signin exception:', error)

    return {
      success: false,
      error: 'An unexpected error occurred during login'
    }
  }
}


/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Signout error:', error)

      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true
    }

  } catch (error) {
    console.error('Signout exception:', error)

    return {
      success: false,
      error: 'An unexpected error occurred during signout'
    }
  }
}


/**
 * Update the user's username
 */
export const updateUsername = async (newUsername) => {
  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    if (
      !newUsername ||
      newUsername.length < 2 ||
      newUsername.length > 30
    ) {
      return {
        success: false,
        error: 'Username must be between 2 and 30 characters'
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: newUsername
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update username error:', error)

      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      profile: data
    }

  } catch (error) {
    console.error('Update username exception:', error)

    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}


/**
 * Listen for authentication state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session)
    }
  )
}