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
        <h2 style={{ margin: 0, borderBottom: 'none', fontSize: '1.2rem' }}>{title}</h2>
        <span style={{ fontSize: '1.5rem', color: '#2e7d32' }}>{isOpen ? '−' : '+'}</span>
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
  return (
    <div className="reports-container">
      <h1>Manual de Instrucciones</h1>
      <p>Guía rápida para el sistema de gestión <strong>Farmacias Trébol</strong>. Rol actual: <strong>{profile.role}</strong>.</p>

      {/* 1. MODO QUIOSCO (Lo más importante para empleados) */}
      <CollapsibleSection title="🚀 Modo Mostrador (Quiosco)" defaultOpen={true}>
        <p>El sistema está diseñado para que múltiples empleados usen el mismo ordenador sin cerrar sesión.</p>
        <ol>
            <li>Inicia sesión una vez con el usuario de la farmacia (ej. <em>mostrador@...</em>).</li>
            <li>En la barra verde superior, verás un selector llamado <strong>"Atendiendo:"</strong>.</li>
            <li><strong>¡Importante!</strong> Antes de trabajar, selecciona tu nombre en esa lista.</li>
            <li>Todas las citas que crees se guardarán a tu nombre para tus objetivos personales.</li>
            <li>Cuando termines tu turno, simplemente deja el ordenador para el siguiente compañero.</li>
        </ol>
      </CollapsibleSection>

      {/* 2. CALENDARIO */}
      <CollapsibleSection title="📅 Calendario y Citas">
        <ul>
            <li><strong>Ver Horarios:</strong> Los servicios disponibles aparecen como bloques de color tenue con el nombre del servicio.</li>
            <li><strong>Leyenda:</strong> A la derecha tienes la leyenda de colores para identificar cada servicio.</li>
            <li><strong>Crear Cita:</strong> 
                <ul>
                    <li>Haz clic en un hueco de horario o en el día.</li>
                    <li>Si seleccionas un horario, el servicio ya vendrá pre-seleccionado.</li>
                    <li><strong>Obligatorio:</strong> Teléfono y Tarjeta Trébol.</li>
                    <li>Marca <strong>"Nuevo Cliente"</strong> si es la primera vez que viene.</li>
                </ul>
            </li>
            <li><strong>Reservas:</strong> Si no hay huecos libres, la cita se guardará como "Reserva" (Lista de Espera) y tendrá un borde <strong>Naranja</strong>. Las citas confirmadas tienen borde <strong>Azul</strong>.</li>
            <li><strong>Gestión Diaria:</strong> Al finalizar la cita, entra, marca "Ha Acudido" e introduce el Importe cobrado.</li>
        </ul>
      </CollapsibleSection>

      {/* 3. GESTIÓN DE EMPLEADOS */}
      <CollapsibleSection title="👥 Gestión de Personal (Admin/Gerente)">
        <p>Hay dos formas de dar de alta personal:</p>
        <ul>
            <li><strong>Empleado (Ficha Local):</strong> Ideal para personal de mostrador.
                <ul>
                    <li>Selecciona Rol: Empleado.</li>
                    <li><strong>NO</strong> marques "Con Login".</li>
                    <li>Solo pide Nombre. El empleado aparecerá en el selector del "Modo Quiosco".</li>
                </ul>
            </li>
            <li><strong>Gerente/Gestor (Con Acceso):</strong> Para quien necesita entrar desde su casa/móvil.
                <ul>
                    <li>Selecciona Rol: Gerente.</li>
                    <li>Se activará "Con Login".</li>
                    <li>Introduce Email y Contraseña. El usuario podrá entrar con esas credenciales.</li>
                </ul>
            </li>
            <li><strong>Bajas:</strong> No borres empleados para no perder sus datos históricos. Usa el botón <strong>"Baja"</strong> para desactivarlos (desaparecerán del selector pero sus datos quedan en informes).</li>
        </ul>
      </CollapsibleSection>

      {/* 4. OBJETIVOS E INFORMES */}
      <CollapsibleSection title="📊 Objetivos e Informes">
        <ul>
            <li><strong>Objetivos:</strong> En Configuración, define cuántas citas quieres conseguir por servicio. Luego usa el <strong>"Reparto Automático"</strong> para distribuir esa meta entre los empleados según sus horas de mostrador.</li>
            <li><strong>Informes:</strong>
                <ul>
                    <li>Usa los filtros de Fecha (Desde/Hasta) para ver datos de cualquier periodo.</li>
                    <li>La tabla "Cumplimiento Individual" te muestra el % de objetivo conseguido por cada empleado.</li>
                    <li>Puedes descargar todos los datos a Excel (CSV).</li>
                </ul>
            </li>
        </ul>
      </CollapsibleSection>

    </div>
  )
}