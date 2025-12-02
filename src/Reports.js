import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Papa from 'papaparse'

// --- Componente para Colapsar ---
function CollapsibleCard({ title, children, defaultOpen = false, actionElement = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="report-card">
      <div className="card-header" onClick={() => setIsOpen(!isOpen)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px', flex: 1}}>
            <h2 style={{ margin: 0, borderBottom: 'none' }}>{title}</h2>
            {actionElement && <div onClick={e => e.stopPropagation()}>{actionElement}</div>}
        </div>
        <span style={{ fontSize: '1.5rem', color: '#666' }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>{children}</div>}
    </div>
  );
}

// --- Componente Barra de Progreso ---
function ProgressBar({ percentage }) {
  let colorClass = 'high';
  const num = Number(percentage);
  if (num < 30) colorClass = 'low';
  else if (num < 70) colorClass = 'medium';
  const width = isNaN(num) ? 0 : Math.min(Math.max(num, 0), 100);

  return (
    <div className="progress-container" style={{width: '100%', backgroundColor: '#e9ecef', borderRadius: '6px', height: '8px', marginTop: '5px'}}>
      <div 
        style={{ width: `${width}%`, height: '100%', borderRadius: '6px', transition: 'width 0.5s', backgroundColor: colorClass === 'low' ? '#dc3545' : colorClass === 'medium' ? '#ffc107' : '#2e7d32' }} 
      />
    </div>
  );
}

export default function Reports({ profile }) {
  const [loading, setLoading] = useState(true)
  
  // --- Estados Datos Brutos ---
  const [allAppointments, setAllAppointments] = useState([])
  const [objectives, setObjectives] = useState([])
  const [services, setServices] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [employees, setEmployees] = useState([])
  const [assignments, setAssignments] = useState([])

  // --- Filtros ---
  const [filterServiceName, setFilterServiceName] = useState('all') // <-- ¡CAMBIO! Filtro por NOMBRE
  const [filterEmployeeId, setFilterEmployeeId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPharmacyId, setFilterPharmacyId] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fechas
  const [startDate, setStartDate] = useState(() => {
      const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
      const date = new Date(); return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // --- Datos Calculados ---
  const [monthlyProgress, setMonthlyProgress] = useState({ overall: {}, detailed: [] });
  const [individualProgress, setIndividualProgress] = useState({ data: [], displayedServices: [] });
  const [filteredAppointmentList, setFilteredAppointmentList] = useState([])

  // Carga Inicial
  useEffect(() => { loadAllData() }, [profile])

  // Recálculo
  useEffect(() => {
    if (!loading && services.length > 0) {
      processAndFilterData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allAppointments, objectives, services, employees, assignments, filterServiceName, filterEmployeeId, filterStatus, filterPharmacyId, searchTerm, startDate, endDate]) // Cambiado filterServiceId por filterServiceName

  async function loadAllData() {
    setLoading(true)
    let pharmacyId = profile.pharmacy_id

    // Queries
    let appointmentsQuery = supabase.from('appointments').select('*, services!inner(id, name), pharmacies!inner(id, name), profiles!left(id, full_name)')
    let objectivesQuery = supabase.from('objectives').select('*, services!inner(id, name)')
    // ¡CAMBIO! Traemos el nombre de la farmacia en los servicios para poder mostrarlos en la tabla
    let servicesQuery = supabase.from('services').select('*, pharmacies(name)') 
    let employeesQuery = supabase.from('profiles').select('id, full_name, role, pharmacy_id')
    let assignmentsQuery = supabase.from('employee_assignments').select('*')
    let pharmaciesQuery = supabase.from('pharmacies').select('*')

    // Filtros Rol
    if (profile.role !== 'admin') {
      if (pharmacyId) {
          appointmentsQuery = appointmentsQuery.eq('pharmacy_id', pharmacyId);
          objectivesQuery = objectivesQuery.eq('pharmacy_id', pharmacyId);
          servicesQuery = servicesQuery.eq('pharmacy_id', pharmacyId);
          employeesQuery = employeesQuery.eq('pharmacy_id', pharmacyId);
          pharmaciesQuery = pharmaciesQuery.eq('id', pharmacyId);
      } else if (profile.role === 'gestor') { /*...*/ }
      else { /* Empleado */
         if(profile.pharmacy_id){
             appointmentsQuery = appointmentsQuery.eq('pharmacy_id', profile.pharmacy_id);
             objectivesQuery = objectivesQuery.eq('pharmacy_id', profile.pharmacy_id);
             servicesQuery = servicesQuery.eq('pharmacy_id', profile.pharmacy_id);
             employeesQuery = employeesQuery.eq('pharmacy_id', profile.pharmacy_id);
             pharmaciesQuery = pharmaciesQuery.eq('id', profile.pharmacy_id);
             assignmentsQuery = assignmentsQuery.eq('employee_id', profile.id);
         } else { return setLoading(false); }
      }
    }

    try {
      const results = await Promise.all([
        appointmentsQuery, objectivesQuery, servicesQuery, pharmaciesQuery, employeesQuery, assignmentsQuery
      ]);
      results.forEach((res) => { if (res.error) throw res.error; });
      
      setAllAppointments(results[0].data || []);
      setObjectives(results[1].data || []);
      setServices(results[2].data || []);
      setPharmacies(results[3].data || []);
      setEmployees(results[4].data || []);
      setAssignments(results[5].data || []);

      if (profile.role !== 'admin' && profile.role !== 'gestor' && profile.pharmacy_id) {
          setFilterPharmacyId(profile.pharmacy_id.toString());
      }

    } catch (error) { console.error(error); alert("Error al cargar datos: " + error.message); } 
    finally { setLoading(false); }
  }

  // --- Helper para Nombres Únicos de Servicio ---
  const getUniqueServiceNames = () => {
      // Extrae los nombres únicos de todos los servicios cargados
      const names = services.map(s => s.name);
      return [...new Set(names)].sort(); // Set elimina duplicados
  }

  function processAndFilterData() {
    if (!Array.isArray(allAppointments)) return;

    const startISO = `${startDate}T00:00:00`;
    const endISO = `${endDate}T23:59:59`;

    const periodAppointments = allAppointments.filter(app => {
        const dateMatch = app.appointment_time >= startISO && app.appointment_time <= endISO;
        const pharmacyMatch = filterPharmacyId === 'all' || app.pharmacy_id?.toString() === filterPharmacyId?.toString();
        return dateMatch && pharmacyMatch;
    });

    calculateMonthlyProgress(periodAppointments);
    calculateIndividualProgressLogic(periodAppointments); 
    filterAppointmentListLogic(periodAppointments);
  }

  function calculateMonthlyProgress(periodAppointments) {
       // 1. Filtramos los servicios que vamos a mostrar (filas)
       let servicesToShow = services;

       // Si hay filtro de farmacia, solo servicios de esa farmacia
       if (filterPharmacyId !== 'all') {
           servicesToShow = servicesToShow.filter(s => s.pharmacy_id.toString() === filterPharmacyId);
       }
       // ¡CAMBIO! Si hay filtro de NOMBRE de servicio
       if (filterServiceName !== 'all') {
           servicesToShow = servicesToShow.filter(s => s.name === filterServiceName);
       }

       const detailProg = servicesToShow.map(service => {
         const objective = objectives.find(obj => obj.service_id === service.id);
         const target = Number(objective?.target_appointments) || 0;
         
         // Filtros adicionales (Empleado)
         const attendedCount = periodAppointments.filter(app => 
             app.service_id === service.id && app.status === 'confirmada' && app.attended &&
             (filterEmployeeId === 'all' || app.created_by_user_id === filterEmployeeId)
         ).length;
         const percentage = target > 0 ? ((attendedCount / target) * 100) : 0;
         
         const relevantApps = periodAppointments.filter(app => 
             app.service_id === service.id &&
             (filterEmployeeId === 'all' || app.created_by_user_id === filterEmployeeId)
         );

         const citados = relevantApps.length;
         const confirmados = relevantApps.filter(a => a.status === 'confirmada').length;
         const nuevos = relevantApps.filter(a => a.status === 'confirmada' && a.attended && a.is_new_client).length; 
         const compradores = relevantApps.filter(a => a.status === 'confirmada' && a.attended && (a.amount > 0)).length;
         const factReal = relevantApps.filter(a => a.status === 'confirmada' && a.attended).reduce((acc, curr) => acc + (Number(curr.amount)||0), 0);
         const factObj = target * (Number(service.estimated_billing) || 0);
         const pct_fact = factObj > 0 ? ((factReal / factObj) * 100) : 0;
         const pct_captacion = target > 0 ? (citados/target)*100 : 0;
         const pct_asistencia = citados > 0 ? (attendedCount/citados)*100 : 0;
         const tasa_conv = attendedCount > 0 ? (compradores/attendedCount)*100 : 0;

         return { 
             serviceId: service.id, 
             serviceName: service.name, 
             // Nombre de la farmacia para distinguir en la tabla cuando se ven varias
             pharmacyName: service.pharmacies?.name, 
             target, attended: attendedCount, percentage,
             citados, confirmados, nuevos, compradores, 
             facturacion_real: factReal, facturacion_objetivo: factObj,
             pct_captacion, pct_asistencia, tasa_conversion: tasa_conv, pct_facturacion: pct_fact
         };
       });

       // Totales Generales (se recalculan según las filas visibles)
       const totalTarget = detailProg.reduce((sum, item) => sum + item.target, 0);
       const totalAttended = detailProg.reduce((sum, item) => sum + item.attended, 0);
       const overallPerc = totalTarget > 0 ? ((totalAttended / totalTarget) * 100) : 0;
       const totalFactReal = detailProg.reduce((sum, item) => sum + item.facturacion_real, 0);
       const totalFactObj = detailProg.reduce((sum, item) => sum + item.facturacion_objetivo, 0);
       const totalCitados = detailProg.reduce((sum, item) => sum + item.citados, 0);
       const totalConfirmados = detailProg.reduce((sum, item) => sum + item.confirmados, 0);
       const totalCompradores = detailProg.reduce((sum, item) => sum + item.compradores, 0);
       const totalPctFact = totalFactObj > 0 ? (totalFactReal/totalFactObj)*100 : 0;

       setMonthlyProgress({ 
           overall: { 
               target: totalTarget, attended: totalAttended, percentage: overallPerc,
               citados: totalCitados, confirmados: totalConfirmados, compradores: totalCompradores,
               facturacion_real: totalFactReal, facturacion_objetivo: totalFactObj, pct_facturacion: totalPctFact
           }, 
           detailed: detailProg 
       });
  }

  function calculateIndividualProgressLogic(periodAppointments) {
       let employeeProfiles = employees.filter(emp => emp.role === 'empleado');
       if (filterPharmacyId !== 'all') {
           employeeProfiles = employeeProfiles.filter(e => e.pharmacy_id.toString() === filterPharmacyId);
       }
       if (filterEmployeeId !== 'all') {
           employeeProfiles = employeeProfiles.filter(e => e.id === filterEmployeeId);
       }
       
       // Filtramos los servicios que se mostrarán como columnas
       const servicesToShow = services.filter(s => {
           const pMatch = filterPharmacyId === 'all' || s.pharmacy_id.toString() === filterPharmacyId;
           // ¡CAMBIO! Filtro por nombre de servicio
           const sMatch = filterServiceName === 'all' || s.name === filterServiceName;
           return pMatch && sMatch;
       });
       
       const individualData = employeeProfiles.map(employee => {
         const serviceDetails = servicesToShow.map(service => {
             // Solo procesa si el servicio y el empleado son de la misma farmacia
             if (service.pharmacy_id !== employee.pharmacy_id) return null;

             const assignment = assignments.find(a => a.employee_id === employee.id && a.service_id === service.id);
             const targetTotal = Number(assignment?.assigned_services_count) || 0;
             const targetNew = Number(assignment?.target_new_clients) || 0;

             const myApps = periodAppointments.filter(app => 
                 app.created_by_user_id === employee.id && 
                 app.service_id === service.id && 
                 app.status === 'confirmada' && 
                 app.attended
             );
             const realTotal = myApps.length;
             const realNew = myApps.filter(app => app.is_new_client).length;

             return {
                 serviceId: service.id, serviceName: service.name, targetTotal, targetNew, realTotal, realNew
             };
         }).filter(Boolean); // Elimina nulos (servicios de otras farmacias)

         const totalTarget = serviceDetails.reduce((acc, s) => acc + s.targetTotal, 0);
         const totalAttended = serviceDetails.reduce((acc, s) => acc + s.realTotal, 0);
         const percentage = totalTarget > 0 ? ((totalAttended / totalTarget) * 100) : 0;

         return { 
             employeeId: employee.id, employeeName: employee.full_name || `ID ${employee.id}`, 
             serviceDetails, totalTarget, totalAttended, percentage 
         };
       });

       if (profile.role === 'empleado') {
           setIndividualProgress({ data: individualData.filter(item => item.employeeId === profile.id), displayedServices: servicesToShow });
       } else {
           setIndividualProgress({ data: individualData, displayedServices: servicesToShow });
       }
  }

  function filterAppointmentListLogic(periodAppointments) {
     const term = searchTerm.toLowerCase();
     
     const filtered = periodAppointments.filter(app => {
        // Filtros ya aplicados en periodAppointments: Fecha y Farmacia.
        
        // ¡CAMBIO! Filtro por nombre de servicio (usando el nombre en el objeto relacionado)
        // app.services es un objeto gracias al JOIN, si no existe no pasa
        const serviceMatch = (filterServiceName === 'all' || app.services?.name === filterServiceName);
        
        const employeeMatch = (filterEmployeeId === 'all' || app.created_by_user_id === filterEmployeeId);
        const statusMatch = (filterStatus === 'all') ||
                            (filterStatus === 'confirmada' && app.status === 'confirmada' && !app.attended) ||
                            (filterStatus === 'reserva' && app.status === 'reserva') ||
                            (filterStatus === 'realizada' && app.attended === true);
        
        const searchMatch = (term === '') || 
                            (app.client_name?.toLowerCase().includes(term)) ||
                            (app.client_phone?.toLowerCase().includes(term)) ||
                            (app.tarjeta_trebol?.toLowerCase().includes(term));

        return serviceMatch && employeeMatch && statusMatch && searchMatch;
     })
     .sort((a,b) => new Date(a.appointment_time) - new Date(b.appointment_time));
     
     setFilteredAppointmentList(filtered);
  }

  // --- Manejadores ---
  // ¡CAMBIO! Manejador de nombre
  function handleServiceFilterChange(e) { setFilterServiceName(e.target.value); }
  function handleEmployeeFilterChange(e) { setFilterEmployeeId(e.target.value); }
  function handleStatusFilterChange(e) { setFilterStatus(e.target.value); }
  function handlePharmacyFilterChange(e) { setFilterPharmacyId(e.target.value); } 
  function handleSearchTermChange(e) { setSearchTerm(e.target.value); }
  function handleDateChange(e, field) { 
      if (field === 'start') setStartDate(e.target.value);
      else setEndDate(e.target.value);
  }

  async function handleUpdateField(appointmentId, fieldUpdate) {
      const { error } = await supabase.from('appointments').update(fieldUpdate).eq('id', appointmentId);
      if (error) { alert(`Error al actualizar: ${error.message}`); loadAllData(); }
      else { loadAllData(); }
  }
  function handleAmountInputChange(appointmentId, newAmount) {
       setFilteredAppointmentList(prevList => prevList.map(item => item.id === appointmentId ? { ...item, amount_display: newAmount } : item));
  }
  async function handleSaveAmount(appointmentId) {
       const appointment = filteredAppointmentList.find(app => app.id === appointmentId);
       if (!appointment) return;
       const amountValue = appointment.amount_display ?? appointment.amount;
       const numericAmount = amountValue === '' || amountValue === null ? null : parseFloat(amountValue);
       const attendedValue = numericAmount !== null && numericAmount > 0 ? true : (appointment.attended || false);
       handleUpdateField(appointmentId, { amount: numericAmount, attended: attendedValue });
  }

  // --- EXPORTACIÓN ---
  function downloadCSV(data, filename) {
      try {
          const csv = Papa.unparse(data, { delimiter: ";", header: true });
          const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}_${startDate}_${endDate}.csv`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } catch (e) { alert("Error exportando: " + e.message); }
  }

  const exportServiceDetail = () => {
      if (!monthlyProgress.detailed.length) return alert("No hay datos.");
      const data = monthlyProgress.detailed.map(d => ({
          ...d,
          // Añadimos nombre de farmacia al CSV
          Farmacia: d.pharmacyName || '-',
          pct_captacion: (Number(d.pct_captacion) || 0).toFixed(1) + '%',
          pct_asistencia: (Number(d.pct_asistencia) || 0).toFixed(1) + '%',
          tasa_conv: (Number(d.tasa_conversion) || 0).toFixed(1) + '%',
          pct_fact: (Number(d.pct_facturacion) || 0).toFixed(1) + '%'
      }));
      downloadCSV(data, `servicios`);
  }

  const exportEmployeeReport = () => {
      if (!individualProgress.data.length) return alert("No hay datos.");
      const flatData = [];
      individualProgress.data.forEach(emp => {
          emp.serviceDetails.forEach(srv => {
              flatData.push({
                  Empleado: emp.employeeName,
                  Servicio: srv.serviceName,
                  Obj_Total: srv.targetTotal,
                  Obj_Nuevos: srv.targetNew,
                  Real_Total: srv.realTotal,
                  Real_Nuevos: srv.realNew,
                  Cumplimiento_Pct: (srv.targetTotal > 0 ? (srv.realTotal/srv.targetTotal)*100 : 0).toFixed(1) + '%'
              });
          });
      });
      downloadCSV(flatData, `empleados`);
  }

  const exportAppointmentList = () => {
      if (!filteredAppointmentList.length) { alert("No hay citas en el listado actual."); return; }
      const dataToExport = filteredAppointmentList.map(app => ({
          Fecha: new Date(app.appointment_time).toLocaleDateString('es-ES'),
          Hora: new Date(app.appointment_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit'}),
          Estado: app.status,
          Cliente: app.client_name,
          Nuevo: app.is_new_client ? 'Sí' : 'No',
          Telefono: app.client_phone,
          Tarjeta: app.tarjeta_trebol,
          Servicio: app.services?.name,
          Farmacia: app.pharmacies?.name,
          Observaciones: app.observations,
          Recordatorio: app.reminder_sent ? 'Sí' : 'No',
          Asistio: app.attended ? 'Sí' : 'No',
          Importe: app.amount,
          Creador: app.profiles?.full_name
      }));
      downloadCSV(dataToExport, `listado_citas`);
  }


  if (loading) return <p>Cargando informes...</p>;

  return (
    <div className="reports-container">
      <h1>Informes y Cumplimiento de Objetivos</h1>
      <p>Vista para el rol: {profile.role}</p>

      {/* --- BARRA DE FILTROS GLOBALES --- */}
      <div className="report-controls" style={{backgroundColor: '#e3f2fd', border: '1px solid #90caf9'}}>
          <div className="filter-group"><label>Desde:</label><input type="date" value={startDate} onChange={e=>handleDateChange(e, 'start')} /></div>
          <div className="filter-group"><label>Hasta:</label><input type="date" value={endDate} onChange={e=>handleDateChange(e, 'end')} /></div>
          
          {(profile.role === 'admin' || profile.role === 'gestor') && (
            <div className="filter-group">
                <label>Farmacia:</label>
                <select value={filterPharmacyId} onChange={handlePharmacyFilterChange}>
                    <option value="all">Todas</option>
                    {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
          )}
          <div className="filter-group">
              <label>Servicio:</label>
              {/* --- ¡CAMBIO! Select por nombre --- */}
              <select value={filterServiceName} onChange={handleServiceFilterChange}>
                  <option value="all">Todos</option>
                  {getUniqueServiceNames().map(name => <option key={name} value={name}>{name}</option>)}
              </select>
          </div>
          <div className="filter-group">
              <label>Empleado (Creador):</label>
              <select value={filterEmployeeId} onChange={handleEmployeeFilterChange}>
                  <option value="all">Todos</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
          </div>
      </div>

      {/* --- Resumen General --- */}
      <CollapsibleCard title="Resumen Mensual (Filtrado)" defaultOpen={true}>
        <div className="summary-metrics">
          <div><strong>Obj. Citas:</strong><span>{monthlyProgress.overall.target}</span></div>
          <div><strong>Atendidas:</strong><span>{monthlyProgress.overall.attended}</span></div>
          <div style={{width: '100%'}}>
              <strong>% Cumpl. Citas:</strong> <span className="percentage">{(Number(monthlyProgress.overall.percentage)||0).toFixed(1)}%</span>
              <ProgressBar percentage={monthlyProgress.overall.percentage} />
          </div>
          <div><strong>Fact. Real:</strong><span>{(Number(monthlyProgress.overall.facturacion_real)||0).toFixed(2)}€</span></div>
        </div>
      </CollapsibleCard>

      {/* --- Detalle Mensual --- */}
      <CollapsibleCard title="Detalle por Servicio" actionElement={<button className="button button-small" onClick={exportServiceDetail}>Descargar CSV</button>}>
        <div className="table-wrapper">
            <table className="service-table report-table detailed-report">
              <thead><tr><th>Servicio</th><th>Obj.</th><th>Citados</th><th>Confirm.</th><th>Nuevos</th><th>Atend.</th><th>Compr.</th><th>% Capta.</th><th>% Asist.</th><th>% Conv.</th><th>Fact. Obj</th><th>Fact. Real</th><th>% Fact.</th></tr></thead>
              <tbody>
                {monthlyProgress.detailed.length === 0 ? (<tr><td colSpan="13">No hay datos.</td></tr>) : (
                  monthlyProgress.detailed.map((item) => (
                    <tr key={item.serviceId}>
                        {/* Muestra el nombre y la farmacia si es 'all' y no se filtra por farmacia */}
                        <td>{item.serviceName} {filterPharmacyId === 'all' && <small style={{display:'block', color:'#666'}}>({item.pharmacyName})</small>}</td>
                        <td>{item.target}</td><td>{item.citados}</td><td>{item.confirmados}</td>
                        <td>{item.nuevos}</td><td>{item.asistentes}</td><td>{item.compradores}</td>
                        <td>{(Number(item.pct_captacion) || 0).toFixed(1)}%</td>
                        <td>{(Number(item.pct_asistencia) || 0).toFixed(1)}%</td>
                        <td>{(Number(item.tasa_conversion) || 0).toFixed(1)}%</td>
                        <td>{(Number(item.facturacion_objetivo) || 0).toFixed(0)}€</td>
                        <td>{(Number(item.facturacion_real) || 0).toFixed(0)}€</td>
                        <td>{(Number(item.pct_facturacion) || 0).toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                  <tr>
                      <th>TOTAL</th><th>{monthlyProgress.overall.target}</th><th>{monthlyProgress.overall.citados}</th><th>{monthlyProgress.overall.confirmados}</th><th>{monthlyProgress.overall.nuevos}</th><th>{monthlyProgress.overall.asistentes}</th><th>{monthlyProgress.overall.compradores}</th>
                      <th>-</th><th>-</th><th>-</th>
                      <th>{(Number(monthlyProgress.overall.facturacion_objetivo)||0).toFixed(0)}€</th>
                      <th>{(Number(monthlyProgress.overall.facturacion_real)||0).toFixed(0)}€</th>
                      <th>{(Number(monthlyProgress.overall.pct_facturacion)||0).toFixed(1)}%</th>
                  </tr>
              </tfoot>
            </table>
        </div>
      </CollapsibleCard>

      {/* --- Cumplimiento Individual --- */}
      <CollapsibleCard title="Cumplimiento por Empleado" actionElement={<button className="button button-small" onClick={exportEmployeeReport}>Descargar CSV</button>}>
        <div className="table-wrapper">
            <table className="service-table report-table">
                <thead>
                    <tr>
                        <th style={{minWidth: '150px'}}>Empleado</th>
                        {individualProgress.displayedServices && individualProgress.displayedServices.map(s => (
                            // Muestra nombre de farmacia si hay múltiples
                            <th key={s.id} style={{textAlign: 'center', fontSize:'0.85em'}}>{s.name}<br/><small>{filterPharmacyId==='all' && s.pharmacies ? `(${s.pharmacies.name})` : ''}</small></th>
                        ))}
                        <th>Total %</th>
                    </tr>
                </thead>
                <tbody>
                    {(!individualProgress.data || individualProgress.data.length === 0) ? (<tr><td colSpan="10">No hay datos.</td></tr>) : (
                        individualProgress.data.map((item) => (
                            <tr key={item.employeeId}>
                                <td>{item.employeeName}</td>
                                {item.serviceDetails.map(sd => (
                                    <td key={sd.serviceId} style={{textAlign: 'center'}}>
                                        <div style={{fontWeight: 'bold'}}>{sd.realTotal} / {sd.targetTotal}</div>
                                        <div style={{fontSize: '0.85em', color: 'green'}}>N: {sd.realNew} / {sd.targetNew}</div>
                                    </td>
                                ))}
                                <td>
                                    {(Number(item.percentage) || 0).toFixed(1)}%
                                    <ProgressBar percentage={item.percentage} />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </CollapsibleCard>

      {/* --- Lista Principal --- */}
      <CollapsibleCard title="Listado de Citas / Clientes" defaultOpen={true} actionElement={<button className="button button-small" onClick={exportAppointmentList}>Descargar CSV</button>}>
        <div className="report-controls list-filters" style={{borderTop:'none', paddingTop:0}}>
            {/* Filtros Locales */}
            <div className="filter-group"><label>Estado:</label><select value={filterStatus} onChange={handleStatusFilterChange}><option value="all">Todas</option><option value="confirmada">Confirmadas</option><option value="reserva">Reservas</option><option value="realizada">Realizadas</option></select></div>
            <div className="filter-group"><label>Buscar:</label><input type="search" value={searchTerm} onChange={handleSearchTermChange} placeholder="Cliente, Tel..." /></div>
        </div>

        <div className="table-wrapper">
            <table className="service-table report-table reminder-table">
              <thead>
                <tr><th>Fecha</th><th>Hora</th><th>Estado</th><th>Cliente</th><th>Nuevo</th><th>Tel</th><th>Tarjeta</th><th>Servicio</th><th>Observ.</th><th>Record.</th><th>Asist.</th><th>Importe</th><th>Creador</th></tr>
              </thead>
              <tbody>
                {filteredAppointmentList.length === 0 ? (<tr><td colSpan="13">No hay citas.</td></tr>) : (
                  filteredAppointmentList.map((app) => (
                    <tr key={app.id}>
                      <td>{new Date(app.appointment_time).toLocaleDateString()}</td>
                      <td>{new Date(app.appointment_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                      <td>{app.status}</td><td>{app.client_name}</td><td>{app.is_new_client?'Sí':'No'}</td><td>{app.client_phone}</td><td>{app.tarjeta_trebol}</td>
                      {/* Nombre del servicio y farmacia si corresponde */}
                      <td>{app.services?.name} {filterPharmacyId === 'all' && <small>({app.pharmacies?.name})</small>}</td>
                      <td title={app.observations}>{app.observations ? '...' : '-'}</td>
                      <td className="actions-cell-center"><input type="checkbox" checked={!!app.reminder_sent} onChange={(e) => handleUpdateField(app.id, { reminder_sent: e.target.checked })} /></td>
                      <td className="actions-cell-center"><input type="checkbox" checked={!!app.attended} onChange={(e) => handleUpdateField(app.id, { attended: e.target.checked })} disabled={parseFloat(app.amount_display ?? app.amount) > 0 || app.status === 'reserva'} /></td>
                      <td className="actions-cell"><input type="number" className="amount-input" value={app.amount_display ?? app.amount ?? ''} onChange={(e) => handleAmountInputChange(app.id, e.target.value)} onBlur={() => handleSaveAmount(app.id)} disabled={app.status==='reserva'} /></td>
                      <td>{app.profiles?.full_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         </div>
      </CollapsibleCard>
    </div>
  )
}