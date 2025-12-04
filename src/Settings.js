import { useState } from 'react'
import ServiceManager from './ServiceManager'
import EmployeeManager from './EmployeeManager'
import ObjectiveManager from './ObjectiveManager'
import ScheduleManager from './ScheduleManager'
import EmployeeAssignmentManager from './EmployeeAssignmentManager'
import PharmacyManager from './PharmacyManager'

// --- Componente Auxiliar para Colapsar ---
function CollapsibleCard({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="settings-card full-width">
      <div 
        className="card-header" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2 style={{ margin: 0, borderBottom: 'none' }}>{title}</h2>
        <span style={{ fontSize: '1.5rem', color: '#666' }}>
          {isOpen ? '−' : '+'}
        </span>
      </div>
      
      {isOpen && (
        <div className="card-content" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Settings({ profile }) {

  return (
    <div className="settings-container">
      <h1 style={{ marginBottom: '30px' }}>Panel de Configuración</h1>
      
      <div className="settings-grid-container">

        {/* --- GESTIÓN FARMACIAS --- */}
        {(profile.role === 'admin' || profile.role === 'gestor') && (
            <CollapsibleCard title="Gestión de Farmacias">
              <PharmacyManager profile={profile} />
            </CollapsibleCard>
        )}

        {/* --- GESTIÓN SERVICIOS --- */}
        <CollapsibleCard title="Gestión de Servicios">
          <ServiceManager profile={profile} />
        </CollapsibleCard>

        {/* --- GESTIÓN HORARIOS --- */}
        <CollapsibleCard title="Gestión de Horarios" >
          <ScheduleManager profile={profile} />
        </CollapsibleCard>

        {/* --- GESTIÓN EMPLEADOS --- */}
        <CollapsibleCard title="Gestión de Empleados">
          <EmployeeManager profile={profile} />
        </CollapsibleCard>

        {/* --- GESTIÓN OBJETIVOS --- */}
        <CollapsibleCard title="Gestión de Objetivos">
          <ObjectiveManager profile={profile} />
          {/* Asignación de objetivos a empleados */}
          {(profile.role === 'admin' || profile.role === 'gestor' || profile.role === 'gerente') && (
              <>
                <div style={{ margin: '30px 0', borderTop: '2px dashed #eee' }}></div>
                <EmployeeAssignmentManager profile={profile} />
              </>
          )}
        </CollapsibleCard>

      </div>
    </div>
  )
}