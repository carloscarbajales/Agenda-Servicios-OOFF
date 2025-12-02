import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import SetPassword from './SetPassword'
import Calendar from './Calendar'
import Settings from './Settings'
import Reports from './Reports'
import Manual from './Manual'
import Navbar from './Navbar'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('calendar')
  const [authEvent, setAuthEvent] = useState(null)

  // Estados para Modo Quiosco
  const [pharmacyEmployees, setPharmacyEmployees] = useState([])
  const [activeEmployeeId, setActiveEmployeeId] = useState(null)

  useEffect(() => {
    let mounted = true

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
          // Por defecto, el usuario activo es el que hizo login
          setActiveEmployeeId(profileData.id)
          // Si tiene farmacia, cargamos compañeros
          if (profileData.pharmacy_id) {
              loadEmployees(profileData.pharmacy_id);
          }
        }
      }
      if (mounted) setLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') setAuthEvent('PASSWORD_RECOVERY')
        
        setSession(session)
        if (!session) {
            setProfile(null)
            setPharmacyEmployees([])
            setActiveEmployeeId(null)
            setLoading(false)
            return;
        }
        
        // Si hay sesión, recargamos perfil por seguridad
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
            if (data) {
              setProfile(data)
              setActiveEmployeeId(data.id)
              if (data.pharmacy_id) loadEmployees(data.pharmacy_id)
            }
            setLoading(false)
        })
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadEmployees(pharmacyId) {
      // Cargamos empleados para el selector del modo quiosco
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('pharmacy_id', pharmacyId)
        .in('role', ['empleado', 'gerente']) // Solo personal operativo
        .order('full_name');
      
      if (data) setPharmacyEmployees(data);
  }

  // Función de Logout segura
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setView('calendar'); // Resetear vista
  };


  if (loading) return <div className="container" style={{ textAlign: 'center' }}><h2>Cargando...</h2></div>
  if (authEvent === 'PASSWORD_RECOVERY') return <SetPassword />

  if (session && profile) {
    return (
      <div className="app-container">
        <Navbar 
          profile={profile} 
          currentView={view} 
          onNavigate={setView}
          onLogout={handleLogout} // Pasamos la función explícita
          // Props Modo Quiosco
          employees={pharmacyEmployees}
          activeEmployeeId={activeEmployeeId}
          onSelectEmployee={setActiveEmployeeId}
        />
        <main className="main-content">
          {view === 'calendar' && <Calendar key={view} profile={profile} activeEmployeeId={activeEmployeeId} />}
          {view === 'settings' && <Settings key={view} profile={profile} />}
          {view === 'reports' && <Reports key={view} profile={profile} />}
          {view === 'manual' && <Manual profile={profile} />}
        </main>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="container" style={{ textAlign: 'center' }}>
        <h2>Error: Perfil no encontrado.</h2>
        <button onClick={() => supabase.auth.signOut()}>Cerrar Sesión</button>
    </div>
  )
}

export default App