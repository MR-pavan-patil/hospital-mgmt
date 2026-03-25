import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    // Try normal Supabase auth login first
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return data

    // If login failed, check if this email belongs to a doctor in the doctors table
    // If so, auto-register them in Supabase Auth with their stored password
    const { data: doctorRow } = await supabase
      .from('doctors')
      .select('id, name, email, login_password')
      .ilike('email', email.trim())
      .maybeSingle()

    if (doctorRow && doctorRow.login_password) {
      // Verify the password matches what's stored in doctors table
      if (password !== doctorRow.login_password) {
        throw new Error('Invalid doctor credentials. Check password given by admin.')
      }

      // Auto-register this doctor as a Supabase Auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: doctorRow.email,
        password: doctorRow.login_password,
        options: { data: { name: doctorRow.name, role: 'doctor' } }
      })
      if (signUpError) throw signUpError

      // Create profile with doctor role
      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          name: doctorRow.name,
          role: 'doctor',
        })
      }

      // Now sign in with the newly created account
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: doctorRow.email,
        password: doctorRow.login_password
      })
      if (loginError) throw loginError
      return loginData
    }

    // Not a doctor either — throw original error
    throw error
  }

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
    if (error) throw error

    if (data.user) {
      const { data: docRow } = await supabase
        .from('doctors')
        .select('id, name')
        .ilike('email', email.trim())
        .maybeSingle()

      const finalRole = docRow ? 'doctor' : 'admin'
      const finalName = docRow ? docRow.name : name

      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: finalName,
        role: finalRole,
      })
    }
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.role === 'admin'
  const isDoctor = profile?.role === 'doctor'

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, isAdmin, isDoctor }}>
      {children}
    </AuthContext.Provider>
  )
}
