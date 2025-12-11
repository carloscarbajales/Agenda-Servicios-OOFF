import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AppointmentModal from './AppointmentModal'

// --- Helpers ---
const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

const expandMonthlyRecurrence = (schedule, targetMonth, targetYear) => {
    const events = [];
    const targetWeek = schedule.week_number;
    const targetDay = schedule.day_of_week;
    const d = new Date(targetYear, targetMonth, 1);
    while (d.getMonth() === targetMonth) {
        if (d.getDay() === targetDay) {
            let isMatch = false;
            if (!targetWeek) {
                isMatch = true;
            } else {
                const day = d.getDate();
                const weekNum = Math.ceil(day / 7);
                if (weekNum === targetWeek) isMatch = true;
            }
            if (isMatch) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                events.push(`${y}-${m}-${dayStr}`);
            }
        }
        d.setDate(d.getDate() + 1);
    }
    return events;
};

export default function AgendaTable({ profile, activeEmployeeId }) {
  const [loading, setLoading] = useState(false);
  
  // Datos Maestros
  const [services, setServices] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  // Filtros
  const [filterPharmacyId, setFilterPharmacyId] = useState('');
  const [filterServiceId, setFilterServiceId] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDate, setFilterDate] = useState('');

  // Datos de la Tabla
  const [daySlots, setDaySlots] = useState([]); 
  const [dayAppointments, setDayAppointments] = useState([]); 
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSlotTime, setSelectedSlotTime] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => { loadMasterData() }, [profile]);
  useEffect(() => { setFilterServiceId(''); setFilterDate(''); }, [filterPharmacyId]);
  useEffect(() => { setFilterDate(''); }, [filterServiceId, filterMonth, filterYear]);
  useEffect(() => { if (filterDate && filterServiceId) loadAgendaForDay(); }, [filterDate, filterServiceId]);

  async function loadMasterData() {
      setLoading(true);
      if (['admin','gestor'].includes(profile.role)) {
          const { data } = await supabase.from('pharmacies').select('*');
          setPharmacies(data || []);
      } else {
          setFilterPharmacyId(profile.pharmacy_id?.toString());
      }
      let servQuery = supabase.from('services').select('*, service_schedule(*)');
      if (profile.role !== 'admin' && profile.role !== 'gestor') {
          servQuery = servQuery.eq('pharmacy_id', profile.pharmacy_id);
      }
      const { data: servData } = await servQuery;
      setServices(servData || []);
      setLoading(false);
  }

  const getAvailableDates = () => {
      if (!filterServiceId) return [];
      const service = services.find(s => s.id.toString() === filterServiceId);
      if (!service || !service.service_schedule) return [];
      let dates = [];
      service.service_schedule.forEach(sch => {
          if (sch.is_recurrent) {
              dates = [...dates, ...expandMonthlyRecurrence(sch, parseInt(filterMonth), parseInt(filterYear))];
          } else {
              const d = new Date(sch.specific_date);
              if (d.getMonth() === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear)) {
                  dates.push(sch.specific_date);
              }
          }
      });
      return [...new Set(dates)].sort();
  };

  async function loadAgendaForDay() {
      setLoading(true);
      const { data: slots, error: rpcError } = await supabase.rpc('fn_get_all_slots_status', {
          p_service_id: parseInt(filterServiceId),
          p_date: filterDate,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          p_exclude_appointment_id: null 
      });
      
      const { data: apps, error: appError } = await supabase
          .from('appointments')
          .select('*, profiles(full_name)') 
          .eq('service_id', filterServiceId)
          .gte('appointment_time', `${filterDate}T00:00:00`)
          .lte('appointment_time', `${filterDate}T23:59:59`);

      if (rpcError) alert(`Error al generar huecos: ${rpcError.message}`);
      else if (appError) alert(`Error al cargar citas: ${appError.message}`);
      else {
          setDaySlots(slots || []);
          setDayAppointments(apps || []);
      }
      setLoading(false);
  }

  // --- Handlers de Actualización Directa (Inline) ---
  const handleUpdateField = async (id, update) => {
      const { error } = await supabase.from('appointments').update(update).eq('id', id);
      if (error) alert(`Error: ${error.message}`);
      else loadAgendaForDay();
  }

  const handleAmountInputChange = (id, val) => {
      setDayAppointments(prev => prev.map(app => app.id === id ? { ...app, amount_display: val } : app));
  }

  const handleSaveAmount = async (id) => {
      const app = dayAppointments.find(a => a.id === id);
      if (!app) return;
      const val = app.amount_display ?? app.amount;
      const num = val === '' || val === null ? null : parseFloat(val);
      const attended = num !== null && num > 0 ? true : (app.attended || false);
      handleUpdateField(id, { amount: num, attended });
  }

  // --- Handlers Modal ---
  const handleSlotClick = (slotTime, existingApp) => {
      if (existingApp) {
          setModalMode('edit');
          setSelectedAppointment(existingApp);
          setSelectedSlotTime(null);
      } else {
          setModalMode('create');
          setSelectedAppointment(null);
          setSelectedSlotTime(slotTime); 
      }
      setIsModalOpen(true);
  }

  // --- NUEVO: Handler para Añadir Reserva Manual ---
  const handleAddReservation = () => {
      setModalMode('create');
      // Pre-configuramos la cita como reserva
      setSelectedAppointment({
          status: 'reserva',
          // Usamos 09:00 como hora por defecto para que no falle la validación,
          // aunque al ser reserva no ocupa hueco real en la lógica de visualización de slots.
          appointment_time: `${filterDate}T09:00:00`,
          pharmacy_id: parseInt(filterPharmacyId), 
          service_id: parseInt(filterServiceId)
      });
      setSelectedSlotTime("09:00"); 
      setIsModalOpen(true);
  }

  const handleCloseModal = () => { setIsModalOpen(false); };
  
  const handleSave = async (formData) => {
     const appointmentTime = new Date(`${filterDate}T${formData.time}`).toISOString();
     const creatorId = activeEmployeeId || profile.id;
     
     const finalPharmacyId = filterPharmacyId 
        ? parseInt(filterPharmacyId, 10) 
        : (profile.pharmacy_id || formData.pharmacyId);
     const finalServiceId = filterServiceId ? parseInt(filterServiceId, 10) : formData.serviceId;

     if (!finalPharmacyId) { alert("Error: No se ha identificado la farmacia."); return; }

     const payload = {
          client_name: formData.clientName, client_phone: formData.clientPhone, tarjeta_trebol: formData.tarjetaTrebol,
          appointment_time: appointmentTime, service_id: finalServiceId, pharmacy_id: finalPharmacyId,
          reminder_sent: formData.reminderSent, attended: formData.attended, amount: formData.amount,
          status: formData.isReserve ? 'reserva' : 'confirmada', is_new_client: formData.isNewClient,
          observations: formData.observations, created_by_user_id: creatorId
     };

     let error = null;
     if (modalMode === 'create') {
         const res = await supabase.from('appointments').insert(payload);
         error = res.error;
     } else {
         const res = await supabase.from('appointments').update(payload).eq('id', selectedAppointment.id);
         error = res.error;
     }
     
     if (error) alert("Error al guardar: " + error.message);
     else { setIsModalOpen(false); loadAgendaForDay(); }
  }
  
  const handleDelete = async () => {
      if(!window.confirm("¿Borrar cita?")) return;
      const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);
      if (error) alert("Error al borrar: " + error.message);
      else { setIsModalOpen(false); loadAgendaForDay(); }
  }

  // --- Render ---
  const visibleServices = services.filter(s => !filterPharmacyId || s.pharmacy_id.toString() === filterPharmacyId);
  const reservations = dayAppointments.filter(app => app.status === 'reserva');

  return (
    <div className="reports-container">
       <h1>Agenda por Servicio</h1>
       
       <div className="report-controls" style={{backgroundColor: '#e3f2fd', border: '1px solid #90caf9'}}>
           {['admin','gestor'].includes(profile.role) && (
               <div className="filter-group">
                   <label>Farmacia</label>
                   <select value={filterPharmacyId} onChange={e=>setFilterPharmacyId(e.target.value)}>
                       <option value="">-- Selecciona --</option>
                       {pharmacies.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
               </div>
           )}
           <div className="filter-group">
               <label>Servicio</label>
               <select value={filterServiceId} onChange={e=>setFilterServiceId(e.target.value)} disabled={!filterPharmacyId && ['admin','gestor'].includes(profile.role)}>
                   <option value="">-- Selecciona --</option>
                   {visibleServices.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
           </div>
           <div className="filter-group">
               <label>Mes</label>
               <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                   {Array.from({length:12}, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('es', {month:'long'})}</option>)}
               </select>
           </div>
           <div className="filter-group">
               <label>Año</label>
               <input type="number" value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={{width:'80px'}}/>
           </div>
           <div className="filter-group">
               <label>Día (Disponible)</label>
               <select value={filterDate} onChange={e=>setFilterDate(e.target.value)} disabled={!filterServiceId} style={{minWidth:'150px', fontWeight:'bold', color: '#2e7d32'}}>
                   <option value="">-- Elige Día --</option>
                   {getAvailableDates().map(dateStr => (
                       <option key={dateStr} value={dateStr}>{new Date(dateStr).toLocaleDateString('es-ES', {weekday: 'short', day: 'numeric', month:'long'})}</option>
                   ))}
               </select>
           </div>
       </div>

       {filterDate && filterServiceId && (
           <>
           {/* TABLA PRINCIPAL */}
           <div className="report-card">
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:10, marginBottom:10}}>
                    <h2 style={{margin:0, border:0}}>
                        {services.find(s=>s.id.toString()===filterServiceId)?.name} 
                        <span style={{fontWeight:'normal', fontSize:'0.8em', color:'#666', marginLeft:10}}>
                            {new Date(filterDate).toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                        </span>
                    </h2>
                    <button className="button button-small" onClick={loadAgendaForDay}>🔄 Refrescar</button>
               </div>
               
               <div className="table-wrapper">
                   <table className="service-table" style={{borderCollapse:'separate', borderSpacing: '0 5px'}}>
                       <thead>
                           <tr>
                               <th style={{width:'80px'}}>Hora</th>
                               <th style={{width:'100px'}}>Estado</th>
                               <th>Cliente</th>
                               <th>Teléfono</th>
                               <th>Tarjeta</th>
                               <th style={{width: '150px'}}>Observaciones</th>
                               <th style={{width:'50px', textAlign:'center'}}>Record.</th>
                               <th style={{width:'50px', textAlign:'center'}}>Asist.</th>
                               <th style={{width:'90px'}}>Gasto (€)</th>
                               <th style={{width:'120px'}}>Acción</th>
                           </tr>
                       </thead>
                       <tbody>
                           {daySlots.length === 0 ? (
                               <tr><td colSpan="10" style={{textAlign:'center', padding:20}}>No hay huecos generados para este día.</td></tr>
                           ) : (
                               daySlots.map(slot => {
                                   const app = dayAppointments.find(a => a.status !== 'reserva' && formatTime(new Date(a.appointment_time).toLocaleTimeString('en-GB')) === formatTime(slot.slot_time));
                                   const isOccupied = !!app;

                                   return (
                                       <tr key={slot.slot_time} style={{backgroundColor: isOccupied ? '#e3f2fd' : 'white'}}>
                                           <td style={{fontWeight:'bold', fontSize:'1.1em'}}>{formatTime(slot.slot_time)}</td>
                                           <td>
                                               {isOccupied ? 
                                                   <span style={{padding:'4px 8px', borderRadius:'4px', fontSize:'0.8em', fontWeight:'bold', backgroundColor: '#0d6efd', color:'white'}}>OCUPADO</span> 
                                                   : <span style={{color:'#2e7d32'}}>Libre</span>
                                               }
                                           </td>
                                           <td>{app?.client_name || '-'}</td>
                                           <td>{app?.client_phone || '-'}</td>
                                           <td>{app?.tarjeta_trebol || '-'}</td>
                                           <td style={{fontSize:'0.85em', color:'#666', maxWidth:'150px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={app?.observations}>
                                               {app?.observations || '-'}
                                           </td>
                                           
                                           <td style={{textAlign:'center'}}>
                                               <input type="checkbox" checked={!!app?.reminder_sent} disabled={!isOccupied} 
                                                      onChange={e => handleUpdateField(app.id, { reminder_sent: e.target.checked })} />
                                           </td>

                                           <td style={{textAlign:'center'}}>
                                               <input type="checkbox" checked={!!app?.attended} disabled={!isOccupied} 
                                                      onChange={e => handleUpdateField(app.id, { attended: e.target.checked })} />
                                           </td>

                                           <td>
                                               <input type="number" step="0.01" className="amount-input" disabled={!isOccupied} 
                                                      value={app?.amount_display ?? app?.amount ?? ''} 
                                                      onChange={e => handleAmountInputChange(app.id, e.target.value)} 
                                                      onBlur={() => handleSaveAmount(app.id)} />
                                           </td>

                                           <td>
                                               <button 
                                                   className={isOccupied ? "button-secondary" : "button"}
                                                   style={!isOccupied ? {padding:'4px 10px', fontSize:'0.85em'} : {}}
                                                   onClick={() => handleSlotClick(slot.slot_time, app)}
                                               >
                                                   {isOccupied ? 'Editar' : 'Reservar'}
                                               </button>
                                           </td>
                                       </tr>
                                   );
                               })
                           )}
                       </tbody>
                   </table>
               </div>
           </div>

           {/* SECCIÓN RESERVAS (LISTA DE ESPERA) */}
           <div className="report-card" style={{borderLeft: '5px solid #fd7e14'}}>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                   <h3 style={{color: '#fd7e14', margin:0}}>Lista de Espera / Reservas ({reservations.length})</h3>
                   {/* ¡BOTÓN NUEVO! */}
                   <button className="button button-small" style={{backgroundColor:'#fd7e14', borderColor:'#fd7e14'}} onClick={handleAddReservation}>
                       + Añadir Reserva
                   </button>
               </div>
               
               {reservations.length > 0 ? (
                   <div className="table-wrapper">
                       <table className="service-table">
                           <thead>
                               <tr>
                                   <th>Hora Aprox.</th><th>Cliente</th><th>Teléfono</th><th>Tarjeta</th><th>Observaciones</th><th>Acciones</th>
                               </tr>
                           </thead>
                           <tbody>
                               {reservations.map(res => (
                                   <tr key={res.id} style={{backgroundColor: '#fff3e0'}}>
                                       <td>{new Date(res.appointment_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                       <td>{res.client_name}</td>
                                       <td>{res.client_phone}</td>
                                       <td>{res.tarjeta_trebol}</td>
                                       <td>{res.observations || '-'}</td>
                                       <td>
                                           <button className="button-secondary" onClick={() => handleSlotClick(null, res)}>Editar / Asignar</button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               ) : (
                   <p style={{color:'#666', fontStyle:'italic'}}>No hay pacientes en lista de espera para este día.</p>
               )}
           </div>
           </>
       )}
       
       {!filterDate && (
           <div style={{textAlign:'center', padding:40, color:'#999'}}>
               <h3>Selecciona una farmacia, un servicio y un día disponible para ver la agenda.</h3>
           </div>
       )}

       {isModalOpen && (
        <AppointmentModal
          profile={profile} 
          services={visibleServices} 
          onClose={handleCloseModal}
          mode={modalMode} 
          date={filterDate} 
          existingAppointment={selectedAppointment ? selectedAppointment : { 
              appointment_time: `${filterDate}T${selectedSlotTime || '09:00'}`, 
              pharmacy_id: parseInt(filterPharmacyId), 
              service_id: parseInt(filterServiceId) 
          }}
          onSave={handleSave} 
          onUpdate={handleSave} 
          onDelete={handleDelete}
          selectedPharmacyId={filterPharmacyId}
        />
      )}
    </div>
  )
}