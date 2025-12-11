import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AppointmentModal({
  profile, services, onClose, mode, date, onSave,
  existingAppointment, onUpdate, onDelete,
  selectedPharmacyId // <-- RECIBE LA FARMACIA SELECCIONADA EN LOS FILTROS
}) {

  const formatTime = (timeStr, includeSeconds = false) => {
     if (!timeStr) return "";
     try {
       let dateObj;
       if (timeStr.includes('T')) { dateObj = new Date(timeStr); }
       else if (timeStr.includes(':')) {
         const parts = timeStr.split(':'); dateObj = new Date();
         dateObj.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), parts[2] ? parseInt(parts[2], 10) : 0, 0);
       } else { return ""; }
       const options = { hour: '2-digit', minute: '2-digit' };
       if (includeSeconds) options.second = '2-digit';
       return dateObj.toLocaleTimeString('en-GB', options);
     } catch (e) { console.error("Error formatTime:", e); return ""; }
  };
  
  // --- Inicialización Robusta de la Farmacia ---
  // Prioridad: 1. Cita existente (Edit) > 2. Filtro seleccionado (Create) > 3. Perfil usuario
  const getInitialPharmacyId = () => {
      if (existingAppointment?.pharmacy_id) return existingAppointment.pharmacy_id;
      if (selectedPharmacyId) return selectedPharmacyId;
      if (profile.pharmacy_id) return profile.pharmacy_id;
      return '';
  };

  const [formPharmacyId, setFormPharmacyId] = useState(getInitialPharmacyId());
  
  // Filtramos servicios según la farmacia decidida
  const filteredServices = formPharmacyId 
    ? services.filter(s => s.pharmacy_id?.toString() === formPharmacyId?.toString())
    : services;

  const getServiceName = (id) => Array.isArray(services) ? services.find(s => s.id?.toString() === id?.toString())?.name || "N/A" : "N/A";

  const [serviceId, setServiceId] = useState(() => {
    if (mode === 'edit' && existingAppointment?.service_id) return existingAppointment.service_id;
    if (mode === 'create' && existingAppointment?.service_id) return existingAppointment.service_id; // Pre-selección desde agenda
    if (mode === 'create' && filteredServices.length > 0) return filteredServices[0].id;
    return '';
  });

  const [clientName, setClientName] = useState(existingAppointment?.client_name || '');
  const [clientPhone, setClientPhone] = useState(existingAppointment?.client_phone || '');
  const [tarjetaTrebol, setTarjetaTrebol] = useState(existingAppointment?.tarjeta_trebol || '');
  const [observations, setObservations] = useState(existingAppointment?.observations || '');
  
  const [selectedTime, setSelectedTime] = useState(() =>
      mode === 'edit' && existingAppointment?.appointment_time
      ? formatTime(existingAppointment.appointment_time, true)
      : (date && existingAppointment?.appointment_time ? formatTime(existingAppointment.appointment_time, true) : '') // Pre-rellenar hora si viene de slot
  );

  const [allSlots, setAllSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');
  const [isReserve, setIsReserve] = useState(existingAppointment?.status === 'reserva');
  const [reminderSent, setReminderSent] = useState(existingAppointment?.reminder_sent || false);
  const [attended, setAttended] = useState(existingAppointment?.attended || false);
  const [amount, setAmount] = useState(existingAppointment?.amount ?? '');
  const [isNewClient, setIsNewClient] = useState(existingAppointment?.is_new_client || false);

  // --- Efecto: Recargar huecos si cambia servicio, fecha o farmacia ---
  useEffect(() => {
    const dateToLoad = mode === 'create' ? date : (existingAppointment?.appointment_time ? existingAppointment.appointment_time.substring(0, 10) : null);
    
    if (serviceId && dateToLoad) {
      loadAvailableSlots(dateToLoad, serviceId);
    } else {
      setAllSlots([]);
      if (!selectedTime) setSelectedTime(''); // Solo resetear si no venía preseleccionada
      setIsLoadingSlots(false);
      setSlotsMessage(!serviceId ? 'Selecciona un servicio...' : 'Esperando datos...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date, existingAppointment, serviceId]);

  useEffect(() => { if (parseFloat(amount) > 0) setAttended(true); }, [amount]);

  async function loadAvailableSlots(dateForSlots, serviceIdToLoad) {
       const serviceIdAsNumber = parseInt(serviceIdToLoad, 10);
       if (isNaN(serviceIdAsNumber)) { setSlotsMessage('ID servicio inválido.'); setIsLoadingSlots(false); return; }

       setIsLoadingSlots(true);
       setAllSlots([]);
       setSlotsMessage('');
       const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
       const appointmentIdToExclude = mode === 'edit' ? existingAppointment?.id : null;
       
       try {
           const { data, error } = await supabase.rpc('fn_get_all_slots_status', { p_service_id: serviceIdAsNumber, p_date: dateForSlots, p_timezone: userTimezone, p_exclude_appointment_id: appointmentIdToExclude });
           if (error) throw error;

           if (data && data.length > 0) {
             setAllSlots(data);
             // Lógica de autoselección
             let initialTime = selectedTime; 
             let initialReserve = isReserve;
             
             // Si no hay hora seleccionada, buscamos la primera libre
             if (!initialTime) {
                 const firstAvailable = data.find(s => s.is_available);
                 if (firstAvailable) { 
                     initialTime = firstAvailable.slot_time; 
                     initialReserve = false;
                 } else { 
                     initialTime = data[0].slot_time; 
                     initialReserve = true; 
                 }
                 setSelectedTime(initialTime);
             }
             
             // Verificar estado de la hora seleccionada
             const currentSlot = data.find(s => s.slot_time === initialTime);
             if (currentSlot) {
                 setIsReserve(!currentSlot.is_available);
                 if (!currentSlot.is_available && mode === 'create') setSlotsMessage('Hueco ocupado. Se guardará como Reserva.');
             }
             
           } else {
             setSlotsMessage('No hay horarios definidos para este servicio hoy.');
           }
       } catch (error) {
           console.error('Error slots:', error);
           setSlotsMessage(`Error: ${error.message}`);
       } finally {
           setIsLoadingSlots(false);
       }
  }

  const handleTimeChange = (e) => {
      const newTime = e.target.value; setSelectedTime(newTime);
      const slot = allSlots.find(s => s.slot_time === newTime);
      if (slot) setIsReserve(!slot.is_available);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceId || !selectedTime) { alert('Selecciona servicio y hueco.'); return; }
    if (!clientPhone || !tarjetaTrebol) { alert("Teléfono y Tarjeta son obligatorios."); return; }

    const numericAmount = amount === '' ? null : parseFloat(amount);
    
    // --- VALIDACIÓN FINAL DE FARMACIA ---
    if (!formPharmacyId) {
        alert("Error crítico: No se ha asignado una farmacia a esta cita. Si eres administrador, selecciona una farmacia en el filtro.");
        return;
    }

    const formData = {
      clientName, clientPhone, tarjetaTrebol, time: selectedTime, serviceId,
      pharmacyId: formPharmacyId, // <-- USAMOS EL ESTADO CALCULADO
      reminderSent, attended, amount: numericAmount, isReserve: isReserve,
      isNewClient: isNewClient, observations: observations
    };
    
    if (mode === 'create') { onSave(formData); } else { onUpdate(formData); }
  }
  const handleDeleteClick = () => { onDelete(); }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
         <h2>{mode === 'create' ? 'Nueva Cita' : 'Editar Cita'}</h2>
         {mode === 'create' && <p>Fecha: <strong>{date}</strong></p>}
         {mode === 'edit' && <p>Servicio: <strong>{getServiceName(serviceId)}</strong></p>}

         <form onSubmit={handleSubmit}>
            <div className="form-row">
                 <div className="form-group-select">
                     <label>Servicio</label>
                     <select value={serviceId || ''} onChange={(e) => setServiceId(e.target.value)} required disabled={mode === 'edit'}>
                         <option value="" disabled> {filteredServices.length > 0 ? '-- Selecciona --' : '-- Sin servicios --'} </option>
                         {filteredServices.map((service) => ( <option key={service.id} value={service.id}>{service.name}</option> ))}
                     </select>
                 </div>
                 <div className="form-group-select">
                     <label>Hora</label>
                     {isLoadingSlots ? ( <p>Cargando...</p> )
                     : allSlots.length > 0 ? (
                         <select value={selectedTime || ''} onChange={handleTimeChange} required>
                             {/* Si estamos editando y la hora original no está en los slots generados (ej. horario cambió), la añadimos visualmente */}
                             {mode === 'edit' && existingAppointment?.appointment_time && !allSlots.some(s => s.slot_time === formatTime(existingAppointment.appointment_time, true)) && (
                                 <option value={formatTime(existingAppointment.appointment_time, true)}>{formatTime(existingAppointment.appointment_time)} (Original)</option>
                             )}
                             {allSlots.map((slot) => ( <option key={slot.slot_time} value={slot.slot_time}> {formatTime(slot.slot_time)} {slot.is_available ? '' : '(Reserva)'} </option> ))}
                         </select>
                     ) : ( <p className="error-message">{slotsMessage}</p> )}
                 </div>
            </div>
            
            <div className="form-row">
                 <div className="form-group"><label>Nombre</label><input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required /></div>
                 <div className="form-group"><label>Teléfono *</label><input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required /></div>
            </div>
            <div className="form-row">
                 <div className="form-group"><label>Tarjeta *</label><input type="text" value={tarjetaTrebol} onChange={(e) => setTarjetaTrebol(e.target.value)} required /></div>
                 <div className="form-group"><label>Importe (€)</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            </div>
            <div className="form-group" style={{marginTop:10, marginBottom:10}}>
                <label>Observaciones</label>
                <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows="2" style={{width:'100%', padding:8, border:'1px solid #ccc'}} />
            </div>
            <div className="form-row-checkboxes">
                 <label className="checkbox-label"><input type="checkbox" checked={reminderSent} onChange={(e) => setReminderSent(e.target.checked)} /> Recordatorio</label>
                 <label className="checkbox-label"><input type="checkbox" checked={attended} onChange={(e) => setAttended(e.target.checked)} disabled={parseFloat(amount) > 0} /> Ha Acudido</label>
                 <label className="checkbox-label"><input type="checkbox" checked={isNewClient} onChange={(e) => setIsNewClient(e.target.checked)} /> Nuevo Cliente</label>
            </div>
            
            <div className="modal-actions">
                 {mode === 'edit' && (profile.role !== 'empleado' || existingAppointment.created_by_user_id === profile.id) && ( <button type="button" className="button-delete" onClick={handleDeleteClick}>Borrar</button> )}
                 <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
                 <button type="submit" className="button" disabled={isLoadingSlots || !selectedTime } > {mode === 'create' ? (isReserve ? 'Guardar Reserva' : 'Guardar') : 'Actualizar'} </button>
            </div>
         </form>
      </div>
    </div>
  )
}