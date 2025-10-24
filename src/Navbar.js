import { supabase } from './supabaseClient'

// Recibe el 'profile' para mostrar el nombre/rol
// y las funciones 'onNavigate' para cambiar de pestaña
export default function Navbar({ profile, currentView, onNavigate }) {
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-brand">Farmacias Trébol 🍀</span>
        {/* Pestaña de Calendario */}
        <a
          href="#calendar"
          className={currentView === 'calendar' ? 'nav-link active' : 'nav-link'}
          onClick={() => onNavigate('calendar')}
        >
          Calendario
        </a>
        
        {/* Pestaña de Configuración (solo para roles con permisos) */}
        {(profile.role === 'admin' || profile.role === 'gestor' || profile.role === 'gerente') && (
          <a
            href="#settings"
            className={currentView === 'settings' ? 'nav-link active' : 'nav-link'}
            onClick={() => onNavigate('settings')}
          >
            Configuración
          </a>
        )}
      </div>

      <div className="navbar-right">
        <span className="navbar-user">
          {profile.full_name} ({profile.role})
        </span>
        <button className="button-secondary" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  )
}