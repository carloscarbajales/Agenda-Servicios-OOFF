import logoTrebol from './assets/logo.png'

export default function Navbar({ 
  profile, 
  currentView, 
  onNavigate, 
  onLogout,
  employees = [], 
  activeEmployeeId, 
  onSelectEmployee 
}) {

  // Encontramos el nombre del empleado activo para mostrarlo
  const activeName = employees.find(e => e.id === activeEmployeeId)?.full_name || profile.full_name;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <a href="#calendar" className="navbar-brand-link" onClick={() => onNavigate('calendar')}>
          <img src={logoTrebol} alt="Logo" className="navbar-logo" />
          <span className="navbar-brand-text">Farmacias Trébol</span>
        </a>
        
        <a href="#calendar" className={currentView === 'calendar' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('calendar')}>Calendario</a>

        {(profile.role === 'admin' || profile.role === 'gestor' || profile.role === 'gerente') && (
          <a href="#settings" className={currentView === 'settings' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('settings')}>Configuración</a>
        )}

        <a href="#reports" className={currentView === 'reports' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('reports')}>Informes</a>
        <a href="#manual" className={currentView === 'manual' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('manual')}>Manual</a>
      </div>

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        
        {/* Selector Modo Quiosco (Solo si hay lista de empleados) */}
        {employees && employees.length > 0 && (
          <div className="employee-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="quick-employee-select" style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Atendiendo:</label>
            <select
              id="quick-employee-select"
              value={activeEmployeeId || profile.id}
              onChange={(e) => onSelectEmployee(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '20px', border: '2px solid #2e7d32', backgroundColor: '#f1f8f3', fontWeight: 'bold', color: '#2e7d32', cursor: 'pointer' }}
            >
              <option value={profile.id}>Usuario Logueado ({profile.full_name})</option>
              {employees.filter(e => e.id !== profile.id).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
        )}

        <span className="navbar-user" title={`Usuario técnico: ${profile.email}`}>
           {/* Muestra quién está 'operando' realmente */}
           {activeName} ({profile.role})
        </span>
        
        <button className="button-secondary" onClick={onLogout}>
          Salir
        </button>
      </div>
    </nav>
  )
}