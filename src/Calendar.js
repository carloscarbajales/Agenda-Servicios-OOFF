import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import AppointmentModal from './AppointmentModal'

export default function Calendar({ profile }) {
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  // Usamos useEffect para que se ejecute CADA VEZ que el 'profile' cambie
  // (Aunque en la práctica, solo se carga una vez al inicio)
  useEffect(() => {
    loadInitialData()
  }, [profile]) // El [profile] asegura que la función se ejecuta con el perfil cargado

  // Función de carga adaptada a Roles
  async function loadInitialData() {
    let pharmacyId = profile.pharmacy_id // El ID de la farmacia del gerente/empleado

    // --- Peticiones de datos (Querys) ---
    let appointmentsQuery = supabase.from('appointments').select('*')
    let servicesQuery = supabase.from('services').select('*')

    // SI NO eres admin (eres gerente, gestor o empleado)
    if (profile.role !== 'admin') {
      if (pharmacyId) {
        // Filtra para pedir SÓLO los datos de TU farmacia
        appointmentsQuery = appointmentsQuery.eq('pharmacy_id', pharmacyId)
        servicesQuery = servicesQuery.eq('pharmacy_id', pharmacyId)
      } else if (profile.role === 'gestor') {
        // TODO: Un gestor es más complejo, necesita cargar datos
        // de MÚLTIPLES farmacias. Lo haremos más adelante.
        console.warn('Lógica de Gestor aún no implementada, mostrando todo.')
        // (Por ahora, la RLS de Supabase le protegerá de ver todo)
      } else {
        // No eres admin y no tienes farmacia (Error)
        console.error('Usuario sin farmacia asignada.')
        setAppointments([])
        setServices([])
        return
      }
    }

    // --- Ejecutar las peticiones ---
    const [appointmentsData, servicesData] = await Promise.all([
      appointmentsQuery,
      servicesQuery,
    ])

    // Procesar Citas
    if (appointmentsData.error) {
      console.error('Error cargando citas:', appointmentsData.error.message)
    } else {
      const formattedEvents = appointmentsData.data.map((app) => ({
        id: app.id,
        title: app.client_name,
        date: app.appointment_time,
      }))
      setAppointments(formattedEvents)
    }

    // Procesar Servicios
    if (servicesData.error) {
      console.error('Error cargando servicios:', servicesData.error.message)
    } else {
      setServices(servicesData.data)
    }
  }

  // Función para recargar solo las citas (después de guardar)
  async function loadAppointments() {
    let query = supabase.from('appointments').select('*')
    
    // Filtra si no es admin
    if (profile.role !== 'admin' && profile.pharmacy_id) {
        query = query.eq('pharmacy_id', profile.pharmacy_id)
    }

    const { data, error } = await query
    
    if (!error) {
      const formattedEvents = data.map((app) => ({
        id: app.id,
        title: app.client_name,
        date: app.appointment_time,
      }))
      setAppointments(formattedEvents)
    }
  }

  // Clic en un día (para crear cita)
  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr) // Ej: "2025-10-29"
    setIsModalOpen(true)
  }

  // Clic en una cita existente
  const handleEventClick = (arg) => {
    alert('Has hecho clic en la cita de: ' + arg.event.title)
    // TODO: Abrir modal para VER/EDITAR esta cita
  }

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
  }

  // Función para guardar la nueva cita
  const handleSaveAppointment = async (formData) => {
    // formData ahora incluye { ..., serviceId, pharmacyId }
    const appointmentTime = `${selectedDate}T${formData.time}`

    const { error } = await supabase
      .from('appointments')
      .insert({
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        tarjeta_trebol: formData.tarjetaTrebol,
        appointment_time: appointmentTime,
        service_id: formData.serviceId,
        pharmacy_id: formData.pharmacyId,
      })
      .select()

    if (error) {
      alert('Error al guardar la cita: ' + error.message)
    } else {
      alert('¡Cita guardada con éxito!')
      handleCloseModal()
      loadAppointments() // Recarga solo las citas
    }
  }

  return (
    <div className="calendar-container">
      {/* El <header> ya no está aquí, lo maneja la Navbar */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay',
        }}
        events={appointments}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        editable={true}
        selectable={true}
        locale="es"
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
        }}
      />

      {/* RENDERIZAR EL MODAL (si está abierto) */}
      {isModalOpen && (
        <AppointmentModal
          date={selectedDate}
          services={services}
          profile={profile} // <-- Le pasamos el perfil
          onClose={handleCloseModal}
          onSave={handleSaveAppointment}
        />
      )}
    </div>
  )
}