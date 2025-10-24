import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import SetPassword from './SetPassword' // Importamos el componente
import Calendar from './Calendar'
import Settings from './Settings'
import Navbar from './Navbar'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('calendar')
  
  // Estado para detectar el evento de invitación/reseteo
  const [authEvent, setAuthEvent] = useState(null)

  useEffect(() => {
    let mounted = true

    // 1. Cargamos la sesión inicial
    async function getInitialSession() {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setSession(session)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileData && mounted) {
          setProfile(profileData)
        }
      }
      if (mounted) {
        setLoading(false)
      }
    }
    
    getInitialSession()

    // 2. Escuchamos los cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        
        // ¡LA CLAVE ESTÁ AQUÍ!
        // Capturamos el evento de reseteo (del enlace del email)
        if (_event === 'PASSWORD_RECOVERY') {
          setAuthEvent('PASSWORD_RECOVERY')
        }
        
        setSession(session)
        setProfile(null) // Limpia el perfil al cambiar la sesión
        
        if (session) {
          // Si hay una sesión, sea cual sea, cargamos el perfil
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data && mounted) {
                setProfile(data)
              }
              if (mounted) setLoading(false)
            })
        } else {
          if (mounted) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // --- Lógica de Renderizado ---
  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center' }}>
        <h2>Cargando...</h2>
      </div>
    )
  }

  // --- 3. LÓGICA DE RENDERIZADO CORREGIDA (REORDENADA) ---

  // CASO 1: (¡EL MÁS IMPORTANTE!)
  // Si detectamos un evento de reseteo, mostramos el formulario
  // de SetPassword, SIN IMPORTAR nada más.
  if (authEvent === 'PASSWORD_RECOVERY') {
    return <SetPassword />
  }

  // CASO 2: Hay sesión Y perfil (Usuario logueado normal)
  if (session && profile) {
    return (
      <div className="app-container">
        <Navbar 
          profile={profile} 
          currentView={view} 
          onNavigate={setView}
        />
        <main className="main-content">
          {view === 'calendar' && <Calendar profile={profile} />}
          {view === 'settings' && <Settings profile={profile} />}
        </main>
      </div>
    )
  }

  // CASO 3: No hay sesión (ni evento de reseteo)
  if (!session) {
    return <Login /> // Muestra el login normal
  }

  // CASO 4: Error (Sesión pero sin perfil)
  return (
    <div className="container" style={{ textAlign: 'center' }}>
      <h2>Error: Perfil no encontrado.</h2>
      <button onClick={() => supabase.auth.signOut()}>Cerrar Sesión</button>
    </div>
  )
}

export default App