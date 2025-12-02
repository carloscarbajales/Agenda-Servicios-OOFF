import { useState } from 'react'

// Reutilizamos el componente de tarjeta colapsable para mantener el estilo
function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="report-card"> {/* Reutilizamos la clase CSS de tarjetas */}
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
    <div className="reports-container"> {/* Reutilizamos el contenedor */}
      <h1>Manual de Instrucciones</h1>
      <p>Bienvenido a la plataforma de gestión de <strong>Farmacias Trébol</strong>. A continuación encontrarás una guía detallada según tu rol: <strong>{profile.role}</strong>.</p>

      {/* 1. CALENDARIO */}
      <CollapsibleSection title="📅 Uso del Calendario y Citas" defaultOpen={true}>
        <p>El calendario es la herramienta principal para gestionar el día a día.</p>
        <ul>
            <li><strong>Ver Disponibilidad:</strong> Los horarios de los servicios aparecen como bloques de color tenue en el fondo. Si no hay bloque de color, no hay servicio ese día.</li>
            <li><strong>Crear Cita:</strong> Haz clic en cualquier hueco (o día) del calendario. Se abrirá un formulario.
                <ul>
                    <li>Si hay huecos libres, selecciona la hora en el desplegable.</li>
                    <li><strong>Reservas (Lista de Espera):</strong> Si no hay huecos, el sistema te ofrecerá guardar la cita como "Reserva". Estas citas tienen un borde naranja.</li>
                </ul>
            </li>
            <li><strong>Datos del Cliente:</strong> Es obligatorio introducir el Teléfono y la Tarjeta Trébol. Puedes marcar "Nuevo Cliente" para seguimiento estadístico.</li>
            <li><strong>Editar/Borrar:</strong> Haz clic sobre una cita existente (borde azul o naranja) para ver sus detalles, marcar asistencia o borrarla.</li>
            <li><strong>Filtros:</strong> Usa la barra superior para filtrar el calendario por Empleado o Servicio.</li>
        </ul>
      </CollapsibleSection>

      {/* 2. GESTIÓN Y CONFIGURACIÓN */}
      <CollapsibleSection title="⚙️ Configuración del Sistema">
        <p>En esta pestaña se define la estructura de la farmacia. Visible para Admin, Gestor y Gerente.</p>
        <ul>
            <li><strong>Farmacias (Solo Admin):</strong> Alta y baja de las farmacias del grupo.</li>
            <li><strong>Servicios:</strong> Define qué servicios ofrece la farmacia (ej. Nutrición, SPD).
                <ul>
                    <li>Puedes definir el tiempo por cita, la facturación estimada y el <strong>% Objetivo de Nuevos Clientes</strong>.</li>
                </ul>
            </li>
            <li><strong>Horarios:</strong> Define cuándo se ofrecen los servicios.
                <ul>
                    <li><strong>Recurrente:</strong> Ej. "Todos los lunes" o "El primer martes de cada mes".</li>
                    <li><strong>Puntual:</strong> Para días específicos o campañas.</li>
                </ul>
            </li>
            <li><strong>Empleados:</strong> Envía invitaciones por email a nuevos usuarios y gestiona sus roles.
                <ul>
                    <li><strong>Métricas:</strong> Define las "Horas de Mostrador" y "Días Trabajados" para el reparto de objetivos.</li>
                </ul>
            </li>
            <li><strong>Objetivos:</strong>
                <ul>
                    <li>Define el objetivo total de citas mensuales.</li>
                    <li>Usa el botón <strong>"Reparto Automático"</strong> para distribuir los objetivos entre los empleados basándose en sus horas de mostrador.</li>
                </ul>
            </li>
        </ul>
      </CollapsibleSection>

      {/* 3. INFORMES */}
      <CollapsibleSection title="📊 Informes y Análisis">
        <p>Herramientas para el seguimiento del negocio y la operativa diaria.</p>
        <ul>
            <li><strong>Resumen Mensual:</strong> Vista rápida de objetivos vs. realizados del mes en curso.</li>
            <li><strong>Detalle por Servicio:</strong> Tabla desglosada con KPIs (Captación, Asistencia, Conversión, Facturación).</li>
            <li><strong>Cumplimiento Individual:</strong> Muestra cómo va cada empleado respecto a su objetivo asignado (Total y Nuevos Clientes).</li>
            <li><strong>Listado de Citas / Clientes:</strong> Herramienta operativa.
                <ul>
                    <li>Usa los filtros (Estado, Servicio, Empleado) y el <strong>Buscador</strong> para encontrar citas.</li>
                    <li>Marca rápidamente "Recordatorio Enviado" o "Ha Acudido" desde la tabla.</li>
                    <li>Introduce el <strong>Importe</strong> final para cerrar la cita.</li>
                </ul>
            </li>
            <li><strong>Exportación:</strong> Usa los botones de "Descargar CSV" para llevarte los datos a Excel.</li>
        </ul>
      </CollapsibleSection>

      {/* 4. ROLES Y PERMISOS */}
      <CollapsibleSection title="🛡️ Roles y Permisos">
        <ul>
            <li><strong>Admin:</strong> Acceso total a todas las farmacias y configuraciones globales.</li>
            <li><strong>Gestor:</strong> Gestión integral de las farmacias asignadas.</li>
            <li><strong>Gerente:</strong> Gestión integral de SU farmacia. Puede configurar servicios y horarios.</li>
            <li><strong>Empleado:</strong> Puede ver y gestionar el calendario, ver sus propios objetivos y el listado de clientes. No puede modificar la configuración estructural (servicios, horarios globales).</li>
        </ul>
      </CollapsibleSection>

    </div>
  )
}