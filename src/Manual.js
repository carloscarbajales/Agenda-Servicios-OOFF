import { useState } from 'react'

// Componente de sección colapsable con estilo mejorado
function CollapsibleSection({ title, children, defaultOpen = false, roleColor = '#2e7d32' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="report-card" style={{ borderLeft: `5px solid ${roleColor}` }}>
      <div 
        className="card-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems: 'center'}}
      >
        <h2 style={{ margin: 0, borderBottom: 'none', fontSize: '1.2rem', color: '#333' }}>{title}</h2>
        <span style={{ fontSize: '1.5rem', color: roleColor }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px', lineHeight: '1.6', color: '#444' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Caja de nota estratégica para Admins
function StrategyNote({ children }) {
    return (
        <div style={{
            backgroundColor: '#e3f2fd', 
            borderLeft: '4px solid #1976d2', 
            padding: '15px', 
            margin: '15px 0', 
            borderRadius: '4px',
            fontSize: '0.95rem',
            color: '#0d47a1',
            lineHeight: '1.5'
        }}>
            <strong>🎯 Nota Técnica / Estratégica:</strong><br/> {children}
        </div>
    )
}

export default function Manual({ profile }) {
  const isManager = ['admin', 'gestor', 'gerente'].includes(profile.role);

  return (
    <div className="reports-container">
      <h1>Manual Maestro de Operaciones</h1>
      <p className="mb-4">
        Documentación técnica y operativa detallada del sistema <strong>Farmacias Trébol</strong>. 
        <br/>Perfil activo: <strong style={{textTransform: 'uppercase', color: isManager ? '#d32f2f' : '#2e7d32'}}>{profile.role}</strong>
      </p>

      {/* =================================================================================
          VISTA PARA EMPLEADOS (OPERATIVA DIARIA)
         ================================================================================= */}
      {!isManager && (
        <>
          <div style={{background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c8e6c9'}}>
             <strong>👋 Guía Rápida de Mostrador.</strong> Sigue estos pasos para asegurar que tus ventas y citas se registran correctamente.
          </div>

          <CollapsibleSection title="1. Protocolo de Inicio de Turno (Modo Quiosco)" defaultOpen={true}>
            <p>El sistema utiliza un "Login Compartido" para agilizar el trabajo en los ordenadores de mostrador.</p>
            <ol>
                <li><strong>No cierres sesión</strong> al terminar tu turno, salvo que la farmacia vaya a cerrar.</li>
                <li><strong>Selector de Identidad:</strong> En la barra verde superior, a la derecha, verás un desplegable que dice "Atendiendo:".</li>
                <li><strong>Tu Responsabilidad:</strong> Antes de crear o editar cualquier cita, asegúrate de que TU NOMBRE está seleccionado en ese desplegable.</li>
                <li><em>Consecuencia:</em> Si está seleccionado otro compañero, la cita y su posible venta se asignarán a él/ella en los informes de objetivos.</li>
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="2. Gestión de la Agenda (Calendario)">
            <ul>
                <li><strong>Disponibilidad (Fondo):</strong> Los bloques de color con texto (ej. "Nutrición") indican que el servicio está activo y hay un especialista.</li>
                <li><strong>Citas (Frente):</strong> Las tarjetas blancas sobre el color son citas ya dadas.</li>
                <li><strong>Estados:</strong>
                    <ul>
                        <li><span style={{borderLeft:'4px solid #0d6efd', paddingLeft:'5px'}}><strong>Borde Azul:</strong></span> Cita Confirmada (ocupa hueco).</li>
                        <li><span style={{borderLeft:'4px solid #fd7e14', paddingLeft:'5px'}}><strong>Borde Naranja:</strong></span> Reserva / Lista de Espera (no tiene hueco asegurado).</li>
                    </ul>
                </li>
                <li><strong>Creación de Cita:</strong>
                    <ul>
                        <li>Pulsa en el hueco horario deseado.</li>
                        <li><strong>Datos Críticos:</strong> El Teléfono y la Tarjeta Trébol son obligatorios para la trazabilidad.</li>
                        <li><strong>Nuevo Cliente:</strong> Marca esta casilla si el paciente nunca ha utilizado este servicio específico.</li>
                    </ul>
                </li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="3. Cierre de Cita y Cobro">
            <p>El ciclo de una cita no termina hasta que se cierra en el sistema:</p>
            <ol>
                <li>Cuando el paciente acude, abre su cita en el calendario.</li>
                <li>Introduce el <strong>Importe Final</strong> que ha pagado.</li>
                <li>El sistema marcará automáticamente la casilla "Ha Acudido".</li>
                <li>Si el servicio es gratuito o no genera venta directa, marca manualmente "Ha Acudido" para que cuente en tu estadística de asistencia.</li>
            </ol>
          </CollapsibleSection>
        </>
      )}

      {/* =================================================================================
          VISTA PARA GESTIÓN (DOCUMENTACIÓN TÉCNICA DETALLADA)
         ================================================================================= */}
      {isManager && (
        <>
           <div style={{background: '#fff3e0', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffe0b2'}}>
             <strong>🛠️ Documentación Técnica para Gestión.</strong> Este manual detalla la arquitectura de datos, lógica de algoritmos y flujos de trabajo avanzados.
          </div>

          {/* --- BLOQUE 1: ARQUITECTURA DE USUARIOS --- */}
          <CollapsibleSection title="1. Arquitectura de Identidad y Seguridad (Híbrida)" roleColor="#d32f2f" defaultOpen={true}>
            <h3>El Problema del Entorno de Farmacia</h3>
            <p>En un entorno de mostrador con alta rotación y ordenadores compartidos, el inicio de sesión tradicional (Email/Contraseña) crea fricción y riesgos de seguridad (contraseñas compartidas, sesiones abiertas por error).</p>
            
            <h3>La Solución: Modelo Híbrido</h3>
            <p>El sistema implementa dos tipos de identidades que conviven en la base de datos:</p>
            
            <table className="service-table" style={{marginTop:'10px', marginBottom:'10px'}}>
                <thead><tr><th>Tipo de Usuario</th><th>Características Técnicas</th><th>Caso de Uso</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong>Usuario con Credenciales</strong></td>
                        <td>Existe en <code>auth.users</code> (Supabase Auth). Tiene email, contraseña encriptada y tokens de sesión.</td>
                        <td><strong>Admin, Gestor, Gerente.</strong> Para acceso remoto, configuración y visualización de datos sensibles desde cualquier dispositivo.</td>
                    </tr>
                    <tr>
                        <td><strong>Usuario Local (Ficha)</strong></td>
                        <td>Solo existe en <code>public.profiles</code>. No tiene credenciales de acceso.</td>
                        <td><strong>Empleado de Mostrador.</strong> Se "autentica" físicamente al estar presente en el ordenador de la farmacia (logueado con un usuario genérico).</td>
                    </tr>
                </tbody>
            </table>

            <h3>Flujo de Trabajo "Modo Quiosco"</h3>
            <ol>
                <li>Se crea un usuario genérico (ej. <code>mostrador@trebol.com</code>) para la farmacia.</li>
                <li>Se crea una ficha local para cada empleado (Ana, Juan...).</li>
                <li>El ordenador inicia sesión una vez al día con el usuario genérico.</li>
                <li>La aplicación inyecta un <strong>Selector de Contexto</strong> en la barra de navegación.</li>
                <li>Al crear una cita, el sistema ignora al usuario de la sesión (Mostrador) e inyecta el ID del empleado seleccionado en el campo <code>created_by_user_id</code> de la base de datos.</li>
            </ol>
          </CollapsibleSection>

          {/* --- BLOQUE 2: ALGORITMO DE OBJETIVOS --- */}
          <CollapsibleSection title="2. Algoritmo de Reparto de Objetivos" roleColor="#d32f2f">
            <p>El sistema abandona la asignación manual arbitraria en favor de un reparto ponderado basado en la capacidad laboral real ("Fuerza de Trabajo").</p>

            <h4>Fórmula del Coeficiente de Fuerza Laboral (W)</h4>
            <p>Para cada empleado <em>i</em>, se calcula su coeficiente <em>W</em>:</p>
            <code style={{display:'block', background:'#f4f4f4', padding:'10px', borderRadius:'4px', margin:'10px 0'}}>
                W(i) = Horas_Mostrador(i) × Días_Trabajados(i)
            </code>
            
            <h4>Fórmula de Asignación de Objetivo (T)</h4>
            <p>Si el objetivo total de la farmacia para un servicio es <em>Target_Global</em>, el objetivo individual <em>T(i)</em> es:</p>
            <code style={{display:'block', background:'#f4f4f4', padding:'10px', borderRadius:'4px', margin:'10px 0'}}>
                T(i) = Target_Global × [ W(i) / Σ(W_todos) ]
            </code>
            <p><em>(El sistema aplica un redondeo matemático estándar para evitar decimales en los objetivos de citas).</em></p>

            <StrategyNote>
                Este algoritmo asegura la equidad. Si un empleado trabaja media jornada (4h) y otro jornada completa (8h), el sistema asignará automáticamente el doble de objetivo al segundo, sin intervención manual del gerente.
            </StrategyNote>
            
            <h4>Objetivo de Nuevos Clientes</h4>
            <p>Se deriva del objetivo total individual aplicando el porcentaje configurado en el servicio:</p>
            <code style={{display:'block', background:'#f4f4f4', padding:'10px', borderRadius:'4px', margin:'10px 0'}}>
                Obj_Nuevos(i) = T(i) × ( %_Objetivo_Nuevos_Servicio / 100 )
            </code>
          </CollapsibleSection>

          {/* --- BLOQUE 3: ESTRUCTURA DE SERVICIOS Y HORARIOS --- */}
          <CollapsibleSection title="3. Configuración de Servicios y Disponibilidad" roleColor="#1976d2">
            <h3>Entidad: Servicio</h3>
            <p>Representa una unidad de negocio (ej. Nutrición). Propiedades clave:</p>
            <ul>
                <li><strong>Tiempo por Cita:</strong> Define la granularidad del calendario. El sistema usa este valor para calcular matemáticamente los slots disponibles en un rango de horas (ej. de 9:00 a 14:00 con citas de 20min = 15 slots).</li>
                <li><strong>Facturación Estimada:</strong> Dato teórico usado solo para proyectar objetivos económicos, no afecta a la facturación real introducida en las citas.</li>
            </ul>

            <h3>Entidad: Horario (Service Schedule)</h3>
            <p>Define la "capa de fondo" del calendario. El sistema soporta dos tipos de recurrencia:</p>
            <ul>
                <li><strong>Semanal:</strong> El evento se repite indefinidamente todos los días de la semana marcados (ej. "Todos los Lunes").</li>
                <li><strong>Mensual Específica:</strong> Se utiliza el campo <code>week_number</code>. El calendario calcula dinámicamente las fechas.
                    <br/><em>Ejemplo:</em> Si marcas "Martes" y "Semana 2", el sistema busca el primer día del mes, calcula cuándo cae el primer martes, y suma 7 días.
                </li>
            </ul>
          </CollapsibleSection>

          {/* --- BLOQUE 4: ANÁLISIS DE DATOS --- */}
          <CollapsibleSection title="4. Diccionario de Datos e Informes" roleColor="#1976d2">
            <p>Definición técnica de las métricas calculadas en el "Maestro de Informes".</p>
            
            <table className="service-table" style={{fontSize:'0.9rem', marginBottom:'15px'}}>
                <thead>
                    <tr>
                        <th style={{width:'20%'}}>Métrica</th>
                        <th style={{width:'40%'}}>Fórmula Técnica</th>
                        <th style={{width:'40%'}}>Interpretación de Negocio</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>% Captación</strong></td>
                        <td><code>COUNT(Citas) / Objetivo_Citas</code></td>
                        <td>Eficacia del equipo en llenar la agenda disponible. Un valor >100% indica overbooking o excelente gestión.</td>
                    </tr>
                    <tr>
                        <td><strong>% Asistencia</strong></td>
                        <td><code>COUNT(Citas WHERE attended=true) / COUNT(Citas)</code></td>
                        <td>Fiabilidad de la agenda. Una baja asistencia indica fallos en la confirmación o bajo valor percibido por el paciente.</td>
                    </tr>
                    <tr>
                        <td><strong>Tasa Conversión</strong></td>
                        <td><code>COUNT(Citas WHERE amount > 0) / COUNT(Citas WHERE attended=true)</code></td>
                        <td>Capacidad de venta. De los pacientes que se sentaron, ¿cuántos compraron el producto asociado?</td>
                    </tr>
                    <tr>
                        <td><strong>Nuevos Reales</strong></td>
                        <td><code>COUNT(Citas WHERE is_new_client=true AND attended=true)</code></td>
                        <td>Crecimiento neto de la base de datos de pacientes para ese servicio.</td>
                    </tr>
                    <tr>
                        <td><strong>% Cumpl. Facturación</strong></td>
                        <td><code>SUM(amount) / (Objetivo_Citas * Fact_Estimada)</code></td>
                        <td>Salud financiera del servicio. Puede ser alto incluso con pocas citas si el ticket medio es superior al estimado.</td>
                    </tr>
                </tbody>
            </table>

            <StrategyNote>
                Los informes aplican filtros en cascada. El filtro de <strong>Fecha</strong> y <strong>Farmacia</strong> define el "Universo de Datos". Los filtros de <strong>Servicio</strong> y <strong>Empleado</strong> actúan como "Vistas" sobre ese universo.
                <br/><br/>
                <em>Ejemplo:</em> Si filtras por el empleado "Juan", el Resumen General recalculará el % de Cumplimiento Global basándose únicamente en los objetivos y citas de Juan.
            </StrategyNote>
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}