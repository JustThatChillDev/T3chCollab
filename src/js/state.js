import { supabase, getCurrentUser, getSession } from './supabase.js'
import { signOut } from './auth.js'

export const appState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false
}

const listeners = []

export const subscribe = (listener) => {
  listeners.push(listener)

  return () => {
    const index = listeners.indexOf(listener)

    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

const notifyListeners = () => {
  listeners.forEach(listener => listener({ ...appState }))
}

export const updateState = (newState) => {
  Object.assign(appState, newState)
  notifyListeners()
}

export const initializeApp = async () => {
  try {
    appState.isLoading = true

    const session = await getSession()
    appState.session = session

    if (session) {
      const user = await getCurrentUser()

      appState.user = user
      appState.isAuthenticated = true

      const {
        data: profile,
        error
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        appState.profile = null
      } else {
        appState.profile = profile
      }
    } else {
      appState.isAuthenticated = false
      appState.user = null
      appState.profile = null
    }
  } catch (error) {
    console.error('Error initializing app:', error)
    appState.isAuthenticated = false
  } finally {
    appState.isLoading = false
    notifyListeners()
  }
}

export const logout = async () => {
  const result = await signOut()

  if (result.success) {
    appState.user = null
    appState.session = null
    appState.profile = null
    appState.isAuthenticated = false

    notifyListeners()
  }

  return result
}