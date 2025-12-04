import { useState } from 'react'

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="report-card">
      <div 
        className="card-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems: 'center'}}
      >
        <h2 style={{ margin: 0, borderBottom: 'none', fontSize: '1.3rem', color: '#2e7d32' }}>{title}</h2>
        <span style={{ fontSize: '1.5rem', color: '#666' }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px', lineHeight: '1.6', color: '#444' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function Manual({ profile }) {
  const isManager = ['admin', 'gestor', 'gerente'].includes(profile.role);

  return (
    <div className="reports-container">
      <h1>Manual de Uso y Procedimientos</h1>
      <p className="mb-4">
        Bienvenido a la plataforma de gestión <strong>Farmacias Trébol</strong>. 
        Estás accediendo con perfil de: <strong style={{textTransform: 'uppercase'}}>{profile.role}</strong>.
      </p>

      {/* --- VISTA PARA EMPLEADOS (SENCILLA) --- */}
      {!isManager && (
        <>
          <CollapsibleSection title="🚀 Cómo empezar a trabajar (Modo Mostrador)" defaultOpen={true}>
            <p>El sistema funciona en modo compartido para agilizar tu trabajo en el mostrador:</p>
            <ol>
                <li>En la <strong>barra superior verde</strong>, verás un desplegable que dice <strong>"Atendiendo:"</strong>.</li>
                <li>Al iniciar tu turno, <strong>selecciona tu nombre</strong> en esa lista.</li>
                <li>A partir de ese momento, todas las citas que crees o modifiques se registrarán a tu nombre para tus objetivos.</li>
                <li>Cuando termines tu turno, simplemente deja el ordenador; no necesitas cerrar sesión ni recordar contraseñas.</li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="📅 Gestión de Citas">
            <ul>
                <li><strong>Crear Cita:</strong> Pulsa en un hueco libre del calendario. Si el hueco tiene un color de fondo, significa que hay un servicio disponible (ej. Nutrición).</li>
                <li><strong>Datos Obligatorios:</strong> Siempre debes pedir el <strong>Teléfono</strong> y la <strong>Tarjeta Trébol</strong> del paciente.</li>
                <li><strong>Nuevo Cliente:</strong> Si es la primera vez que el paciente viene a este servicio, marca la casilla "Nuevo Cliente".</li>
                <li><strong>Lista de Espera:</strong> Si no hay huecos libres, el sistema guardará la cita como "Reserva" (color naranja).</li>
                <li><strong>Cerrar Cita:</strong> Cuando el paciente acuda, entra en la cita, marca <strong>"Ha Acudido"</strong> e introduce el <strong>Importe</strong> cobrado.</li>
            </ul>
          </CollapsibleSection>
        </>
      )}

      {/* --- VISTA PARA GESTIÓN (DETALLADA) --- */}
      {isManager && (
        <>
           <CollapsibleSection title="👥 Gestión de Personal y Accesos" defaultOpen={true}>
            <h3 style={{marginTop:0}}>Diferencia entre Empleado Local y Usuario con Login</h3>
            <p>Al dar de alta a un nuevo miembro del equipo en "Configuración > Empleados", verás que el sistema se comporta diferente según el rol. Esto es intencional:</p>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div style={{background:'#f9f9f9', padding:'15px', borderRadius:'8px'}}>
                    <strong>1. Rol Empleado (Sin contraseña)</strong>
                    <p>Pensado para el personal de mostrador que usa el ordenador de la farmacia.</p>
                    <ul style={{fontSize:'0.9em'}}>
                        <li>Se crea una "Ficha Local" en la base de datos.</li>
                        <li><strong>No tiene email ni contraseña.</strong></li>
                        <li>Su nombre aparecerá en el selector "Atendiendo" de la barra superior para que puedan fichar sus citas.</li>
                        <li><em>Ventaja:</em> Alta inmediata y sin fricción.</li>
                    </ul>
                </div>
                <div style={{background:'#e8f5e9', padding:'15px', borderRadius:'8px'}}>
                    <strong>2. Roles de Gestión (Con contraseña)</strong>
                    <p>Pensado para Gerentes, Gestores o Admins que necesitan acceder desde casa o dispositivos móviles.</p>
                    <ul style={{fontSize:'0.9em'}}>
                        <li>El sistema <strong>exigirá un Email y una Contraseña</strong>.</li>
                        <li>Se crea un usuario real en el sistema de seguridad.</li>
                        <li>Pueden iniciar sesión desde cualquier lugar con esas credenciales.</li>
                    </ul>
                </div>
            </div>
            <p><strong>Bajas y Altas:</strong> Nunca borres un empleado si quieres conservar su histórico de citas. Usa el botón <strong>"Baja"</strong> para ocultarlo de los selectores diarios sin perder sus datos en los informes.</p>
          </CollapsibleSection>

          <CollapsibleSection title="⚙️ Configuración de Servicios y Objetivos">
            <h3>1. Creación de Servicios</h3>
            <p>Define los servicios que ofrece la farmacia (Nutrición, Dermo, etc.).</p>
            <ul>
                <li><strong>Tiempo:</strong> Define la duración estándar para que el calendario calcule los huecos automáticamente.</li>
                <li><strong>% Nuevos:</strong> Establece qué porcentaje de las citas deberían ser de captación (nuevos clientes). Este dato se usa para calcular los objetivos individuales.</li>
            </ul>

            <h3>2. Asignación de Objetivos (Reparto Automático)</h3>
            <p>El sistema incluye una herramienta de equidad para repartir objetivos:</p>
            <ol>
                <li>Primero, ve a la tabla de empleados y define las <strong>Horas de mostrador</strong> y <strong>Días trabajados</strong> de cada uno.</li>
                <li>Luego, ve a "Gestión de Objetivos" y define el objetivo total de citas para la farmacia (ej. 100 citas de Nutrición).</li>
                <li>Finalmente, pulsa <strong>"Reparto Automático"</strong>. El sistema calculará la "fuerza de trabajo" de cada empleado y le asignará una parte proporcional del objetivo total y del objetivo de nuevos clientes.</li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="📅 Calendario y Agenda">
             <ul>
                <li><strong>Horarios:</strong> Antes de citar, debes definir los horarios en Configuración. Puedes crear horarios recurrentes (ej. "Todos los lunes") o puntuales (ej. "Campaña día 15").</li>
                <li><strong>Visualización:</strong> Los horarios disponibles se muestran como bloques de fondo coloreados. Las citas se superponen.</li>
                <li><strong>Leyenda:</strong> A la derecha del calendario verás la leyenda de colores por servicio.</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="📊 Interpretación de Informes">
             <p>El sistema ofrece dos niveles de análisis:</p>
             <ol>
                 <li><strong>Informe Actual (Operativo):</strong> Se centra en el mes en curso. Ideal para ver el cierre del mes, quién está cumpliendo objetivos hoy y gestionar recordatorios pendientes.</li>
                 <li><strong>Maestro de Informes (Analítico):</strong> Permite seleccionar rangos de fechas personalizados (trimestres, años) y filtrar por farmacia.
                    <ul>
                        <li><strong>Tabla Detalle Servicio:</strong> Muestra la facturación real vs. objetivo y las tasas de conversión.</li>
                        <li><strong>Tabla Cumplimiento Empleado:</strong> Cruza las citas realizadas por cada empleado contra el objetivo que se le asignó automáticamente.</li>
                    </ul>
                 </li>
             </ol>
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}