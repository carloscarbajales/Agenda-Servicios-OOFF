import { useState } from 'react'

// Componente de sección colapsable
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

// Nota Técnica
function TechnicalNote({ children }) {
    return (
        <div style={{
            backgroundColor: '#f8f9fa', 
            borderLeft: '4px solid #6c757d', 
            padding: '15px', 
            margin: '15px 0', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#333'
        }}>
            <strong>Nota Técnica:</strong> {children}
        </div>
    )
}

export default function Manual({ profile }) {
  const isEmployee = profile.role === 'empleado';
  const isGerente = profile.role === 'gerente';
  const isUpperManagement = ['admin', 'gestor'].includes(profile.role);

  let title = "Manual de Operaciones";
  if (isUpperManagement) title = "Manual Maestro (Descriptivo)";
  if (isGerente) title = "Manual de Gestión de Farmacia";
  if (isEmployee) title = "Guía de Mostrador";

  return (
    <div className="reports-container">
      <h1>{title}</h1>
      <p className="mb-4">
        Perfil activo: <strong style={{textTransform: 'uppercase', color: '#2e7d32'}}>{profile.role}</strong>
      </p>

      {/* =================================================================================
          1. VISTA PARA EMPLEADOS (OPERATIVA DE MOSTRADOR)
         ================================================================================= */}
      {isEmployee && (
        <>
          <div style={{background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c8e6c9'}}>
             <strong>👋 Guía Rápida de Mostrador.</strong>
          </div>
          <CollapsibleSection title="1. Protocolo de Inicio (Fichar)" defaultOpen={true}>
            <p>El ordenador del mostrador tiene un usuario compartido. Para trabajar:</p>
            <ol>
                <li>Ve a la barra verde superior.</li>
                <li>Despliega el menú <strong>"Atendiendo:"</strong>.</li>
                <li>Selecciona <strong>TU NOMBRE</strong>.</li>
                <li>Todas las citas que crees o modifiques se registrarán bajo tu responsabilidad.</li>
            </ol>
          </CollapsibleSection>
          <CollapsibleSection title="2. Agenda y Citas">
             <ul>
                 <li><strong>Huecos Libres:</strong> Bloques de color con nombre de servicio. Haz clic para reservar.</li>
                 <li><strong>Lista de Espera:</strong> Si no hay hueco, guarda como "Reserva" (color naranja).</li>
                 <li><strong>Cobro:</strong> Al terminar la cita, entra en ella, pon el <strong>Importe</strong> y guarda. Se marcará "Ha Acudido" sola.</li>
             </ul>
          </CollapsibleSection>
        </>
      )}

      {/* =================================================================================
          2. VISTA PARA GERENTES (MANUAL DE GESTIÓN OPERATIVA)
         ================================================================================= */}
      {isGerente && (
        <>
           <div style={{background: '#fff3e0', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffe0b2'}}>
             <strong>🛠️ Manual de Gestión.</strong> Guía para la configuración de servicios, personal e interpretación de informes de tu farmacia.
          </div>

          <CollapsibleSection title="1. Gestión de Personal" roleColor="#d32f2f" defaultOpen={true}>
            <h3>Altas y Accesos</h3>
            <p>Puedes dar de alta tres tipos de perfiles:</p>
            <ul>
                <li><strong>Usuario Genérico de Mostrador (CRÍTICO):</strong> Debes crear al menos uno para activar el Modo Quiosco.
                    <ul>
                        <li>Selecciona Rol: <strong>Empleado</strong>.</li>
                        <li>Marca la casilla: <strong>"Con Login"</strong>.</li>
                        <li>Asigna un email (ej: <code>mostrador@tu-farmacia.com</code>) y contraseña.</li>
                        <li><em>Este es el usuario que se quedará logueado en el ordenador de la farmacia.</em></li>
                    </ul>
                </li>
                <li><strong>Empleado (Ficha Local):</strong> Para cada trabajador real.
                    <ul>
                        <li>Selecciona Rol: <strong>Empleado</strong>.</li>
                        <li><strong>NO</strong> marques "Con Login".</li>
                        <li>Solo pide Nombre. Estos empleados aparecerán en el selector "Atendiendo" cuando se use el Usuario Genérico.</li>
                    </ul>
                </li>
                <li><strong>Gerente Sustituto:</strong> Si necesitas crear otro gerente con acceso remoto.
                    <ul>
                        <li>Selecciona Rol: <strong>Gerente</strong>.</li>
                        <li>Marca "Con Login".</li>
                    </ul>
                </li>
            </ul>
            <h3>Bajas</h3>
            <p>Para desactivar a un empleado, usa el botón <strong>"Baja"</strong> en la tabla de empleados. Esto lo oculta del selector diario pero mantiene sus datos históricos en los informes.</p>
          </CollapsibleSection>

          <CollapsibleSection title="2. Configuración de Servicios y Objetivos" roleColor="#d32f2f">
            <h3>Definición</h3>
            <p>En "Configuración > Servicios", activa los servicios que ofrece tu farmacia y define el tiempo por cita.</p>
            
            <h3>Reparto de Objetivos</h3>
            <p>Para asignar metas justas:</p>
            <ol>
                <li>En "Empleados", define las <strong>Horas de mostrador</strong> y <strong>Días trabajados</strong> de cada uno.</li>
                <li>En "Objetivos", define la meta total de citas para el mes.</li>
                <li>Usa <strong>"Reparto Automático"</strong>: El sistema distribuirá el objetivo proporcionalmente a las horas trabajadas de cada uno.</li>
            </ol>
            <p><em>Nota: Puedes ajustar manualmente los objetivos después del reparto automático si es necesario.</em></p>
          </CollapsibleSection>

          <CollapsibleSection title="3. Vistas de Agenda" roleColor="#1976d2">
             <ul>
                 <li><strong>Calendario:</strong> Vista visual del mes completo. Útil para ver la ocupación global y distribuir citas.</li>
                 <li><strong>Agenda por Servicio:</strong> Vista de tabla diaria detallada.
                    <ul>
                        <li>Permite ver huecos libres de un vistazo rápido.</li>
                        <li>Permite añadir pacientes a la <strong>Lista de Espera (Reservas)</strong> manualmente cuando el día está lleno, usando el botón naranja.</li>
                    </ul>
                 </li>
             </ul>
          </CollapsibleSection>

          <CollapsibleSection title="4. Informes y Seguimiento" roleColor="#1976d2">
            <p>Usa la pestaña de Informes para el control diario:</p>
            <ul>
                <li><strong>Informe Actual:</strong> Revisa el "Listado de Citas" filtrando por "Mañana" para hacer las llamadas de recordatorio. Marca la casilla "Record." en la tabla conforme llames.</li>
                <li><strong>Cumplimiento Individual:</strong> Revisa quién está cumpliendo sus objetivos de captación y ventas.</li>
            </ul>
          </CollapsibleSection>
        </>
      )}

      {/* =================================================================================
          3. VISTA PARA ADMIN / GESTOR (DOCUMENTACIÓN PORMENORIZADA POR PESTAÑA)
         ================================================================================= */}
      {isUpperManagement && (
        <>
           <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #90caf9'}}>
             <strong>🧠 Documentación Detallada.</strong> Descripción exhaustiva de cada módulo de la aplicación.
          </div>

          {/* --- CAPÍTULO 1: CALENDARIO --- */}
          <CollapsibleSection title="Pestaña 1: CALENDARIO (Vista Mensual)" roleColor="#1976d2" defaultOpen={true}>
            <h3>Funcionalidad Principal</h3>
            <p>Es el cuadro de mando visual para la planificación a medio plazo. Permite detectar días de alta ocupación y huecos de disponibilidad de un vistazo.</p>

            <h3>Elementos de la Interfaz</h3>
            <ul>
                <li><strong>Barra de Filtros (Superior):</strong>
                    <ul>
                        <li><em>Farmacia (Solo Admin/Gestor):</em> Selecciona qué centro visualizar. Obligatorio para ver datos.</li>
                        <li><em>Empleado:</em> Filtra las citas creadas por un empleado específico (útil para auditorías).</li>
                        <li><em>Servicio:</em> Muestra solo las citas y horarios de un tipo (ej. "Nutrición").</li>
                    </ul>
                </li>
                <li><strong>Rejilla Mensual:</strong>
                    <ul>
                        <li><strong>Eventos de Fondo (Transparente):</strong> Representan la DISPONIBILIDAD del servicio (Horario teórico). Muestran el nombre del servicio. Al hacer clic en ellos, se abre el formulario de creación pre-seleccionando ese servicio.</li>
                        <li><strong>Citas (Tarjeta Sólida):</strong> Representan pacientes reales.
                            <ul>
                                <li>Borde <span style={{color:'#0d6efd', fontWeight:'bold'}}>AZUL</span>: Cita Confirmada (ocupa hueco).</li>
                                <li>Borde <span style={{color:'#fd7e14', fontWeight:'bold'}}>NARANJA</span>: Reserva / Lista de Espera (sobre-reserva).</li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li><strong>Leyenda (Derecha):</strong> Muestra la codificación de colores asignada a cada servicio activo en la farmacia seleccionada.</li>
            </ul>

            <TechnicalNote>
                El calendario cruza dos tablas de datos en tiempo real: <code>service_schedule</code> (para el fondo) y <code>appointments</code> (para las tarjetas).
            </TechnicalNote>
          </CollapsibleSection>

          {/* --- CAPÍTULO 2: AGENDA POR SERVICIO --- */}
          <CollapsibleSection title="Pestaña 2: AGENDA POR SERVICIO (Vista Diaria)" roleColor="#1976d2">
            <h3>Funcionalidad Principal</h3>
            <p>Herramienta diseñada para la operativa rápida en recepción/mostrador. Sustituye la visión global por una lista secuencial de huecos (Slots) para un día específico.</p>

            <h3>Flujo de Uso</h3>
            <ol>
                <li><strong>Selección de Contexto:</strong> El usuario debe seleccionar Farmacia, Servicio, Mes y Año.</li>
                <li><strong>Selector de Día Inteligente:</strong> El desplegable "Día" <strong>solo mostrará las fechas</strong> en las que ese servicio tiene horario asignado. Esto evita errores de citación en días sin especialista.</li>
                <li><strong>Tabla de Huecos:</strong>
                    <ul>
                        <li>El sistema divide el horario del especialista en tramos según la duración configurada del servicio.</li>
                        <li>Muestra el estado de cada tramo: <span style={{color:'green'}}>LIBRE</span> o <span style={{color:'red'}}>OCUPADO</span>.</li>
                        <li>Permite reservar directamente en el hueco deseado.</li>
                    </ul>
                </li>
                <li><strong>Lista de Espera (Reservas):</strong> Al final de la tabla, aparece un bloque para citas sin hora fija. El botón <strong>"+ Añadir Reserva"</strong> permite registrar pacientes cuando todos los slots están ocupados.</li>
            </ol>
          </CollapsibleSection>

          {/* --- CAPÍTULO 3: CONFIGURACIÓN --- */}
          <CollapsibleSection title="Pestaña 3: CONFIGURACIÓN (Estructural)" roleColor="#d32f2f">
            <p>Este es el panel de control del sistema. Los cambios aquí afectan a la lógica de negocio.</p>

            <h4>A. Gestión de Farmacias (Solo Admin/Gestor)</h4>
            <p>Permite dar de alta nuevos centros. Cada farmacia es un ecosistema independiente de datos.</p>

            <h4>B. Gestión de Servicios</h4>
            <p>Define el catálogo de prestaciones.</p>
            <ul>
                <li><strong>Tiempo por Cita:</strong> CRÍTICO. Define cómo se divide la rejilla del calendario. Si se cambia a posteriori, las citas antiguas podrían quedar desalineadas visualmente, aunque se conservan.</li>
                <li><strong>% Objetivo Nuevos:</strong> Define la meta de captación que se exigirá al equipo en el reparto de objetivos.</li>
            </ul>

            <h4>C. Gestión de Horarios</h4>
            <p>Define la disponibilidad. Soporta dos modos:</p>
            <ul>
                <li><strong>Recurrente:</strong> Se repite indefinidamente. Puede ser semanal ("Todos los lunes") o mensual ("Semana 2 y 4").</li>
                <li><strong>Puntual:</strong> Para días específicos (ej. "Campaña del 15 de Mayo"). Tiene prioridad visual.</li>
            </ul>

            <h4>D. Gestión de Empleados</h4>
            <p>Administración del personal y sus accesos.</p>
            <ul>
                <li><strong>Alta con Login:</strong> (Para Gerentes). Requiere Email. Se envía invitación.</li>
                <li><strong>Alta Local:</strong> (Para Empleados). Sin Email. Antes crea una ficha con login para que el equipo pueda acceder con el "Modo Quiosco" con el correo del equipo de la farmacia marcando el usuario Empleado y la casilla "con login" .</li>
                <li><strong>Métricas de Trabajo:</strong> Aquí se definen las <strong>Horas/Día</strong> y <strong>Días/Mes</strong> de cada empleado. Estos datos son la base para el cálculo automático de objetivos.</li>
                <li><strong>Bajas:</strong> El botón "Baja" oculta al empleado de los selectores operativos pero mantiene sus estadísticas históricas.</li>
            </ul>

            <h4>E. Gestión de Objetivos</h4>
            <p>Motor de asignación de metas.</p>
            <ul>
                <li>Se establece el <strong>Objetivo Total</strong> de citas para la farmacia y servicio.</li>
                <li>El botón <strong>Reparto Automático</strong> ejecuta el algoritmo que distribuye esa cifra entre los empleados activos, ponderando por su carga de trabajo (Horas x Días). Puede modificarse directa y manualmente este objetivo para adaptarlo a circunstancias no contempladas .</li>
            </ul>
          </CollapsibleSection>

          {/* --- CAPÍTULO 4: INFORMES --- */}
          <CollapsibleSection title="Pestaña 4: INFORMES (Analítica)" roleColor="#fbc02d">
            <h3>Lógica de Filtrado Global</h3>
            <p>La barra superior filtra <strong>todos</strong> los informes simultáneamente. Permite acotar el análisis por rangos de fechas personalizados (no solo meses naturales).</p>

            <h4>1. Resumen Mensual</h4>
            <p>Cuadro de mando de alto nivel. Muestra la salud global de la farmacia en el periodo seleccionado.</p>
            <ul>
                <li><strong>% Cumplimiento:</strong> (Citas Realizadas / Objetivo Total).</li>
                <li><strong>Facturación Real:</strong> Suma de los importes introducidos en las citas cerradas.</li>
            </ul>

            <h4>2. Detalle por Servicio</h4>
            <p>Análisis vertical de cada unidad de negocio.</p>
            <ul>
                <li><strong>% Captación:</strong> Eficacia llenando la agenda.</li>
                <li><strong>% Asistencia:</strong> Fiabilidad de los pacientes citados.</li>
                <li><strong>Tasa Conversión:</strong> Porcentaje de citas asistidas que generaron venta (Importe > 0).</li>
                <li><strong>% Facturación:</strong> Rendimiento económico real vs. el estimado teórico.</li>
            </ul>

            <h4>3. Cumplimiento por Empleado</h4>
            <p>Evaluación del desempeño individual.</p>
            <ul>
                <li>Cruza las citas creadas por cada empleado (registradas mediante el selector "Atendiendo") contra el objetivo que se le asignó en Configuración.</li>
                <li>Muestra tanto el cumplimiento en Citas Totales como en Captación de Nuevos.</li>
                <li>Permite activar la casilla <strong>"Mostrar Bajas"</strong> para auditar el trabajo de empleados antiguos.</li>
            </ul>

            <h4>4. Listado de Citas (Operativo)</h4>
            <p>Herramienta de trabajo diario (no solo análisis).</p>
            <ul>
                <li>Permite filtrar por "Estado" (ej. Pendientes de confirmar).</li>
                <li>Incluye un <strong>Buscador Global</strong> (busca por nombre, teléfono o tarjeta).</li>
                <li>Permite acciones rápidas (checkboxes) para marcar recordatorios o asistencia sin entrar al detalle de cada cita.</li>
            </ul>
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}