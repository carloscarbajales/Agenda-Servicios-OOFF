import ServiceManager from './ServiceManager'
import EmployeeManager from './EmployeeManager' // <-- 1. IMPORTAR

export default function Settings({ profile }) {
  
  return (
    <div className="settings-container">
      <h1>Panel de Configuración</h1>
      <p>Bienvenido, {profile.full_name}.</p>
      
      <div className="settings-grid">
      
        <div className="settings-card full-width">
          <h2>Gestión de Servicios</h2>
          <ServiceManager profile={profile} />
        </div>

        {/* --- 2. AÑADIR LA NUEVA TARJETA --- */}
        <div className="settings-card full-width">
          <h2>Gestión de Empleados</h2>
          <EmployeeManager profile={profile} />
        </div>

        <div className="settings-card">
          <h2>Gestión de Objetivos</h2>
          <p>Aquí podrás definir los objetivos de citas y facturación.</p>
        </div>
      </div>
    </div>
  )
}