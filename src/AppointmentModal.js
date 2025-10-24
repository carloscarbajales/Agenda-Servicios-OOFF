import { useState } from 'react'

// 1. El modal ahora recibe "profile"
export default function AppointmentModal({
  date,
  services,
  profile,
  onClose,
  onSave,
}) {
  // Estados internos
  const [serviceId, setServiceId] = useState(services?.[0]?.id || '')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [tarjetaTrebol, setTarjetaTrebol] = useState('')
  const [time, setTime] = useState('09:00')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!serviceId) {
      alert('Por favor, selecciona un servicio.')
      return
    }

    const selectedService = services.find(
      (s) => s.id.toString() === serviceId.toString()
    )

    if (!selectedService) {
      alert('Error: Servicio no encontrado.')
      return
    }

    // --- 2. LÓGICA DE ROLES ---
    let pharmacyIdToSave

    if (profile.role === 'admin') {
      // El admin usa la farmacia DEL SERVICIO seleccionado
      pharmacyIdToSave = selectedService.pharmacy_id
    } else {
      // Un gerente o empleado usa SU PROPIA farmacia
      pharmacyIdToSave = profile.pharmacy_id
    }
    // ----------------------

    const formData = {
      clientName,
      clientPhone,
      tarjetaTrebol,
      time,
      serviceId,
      pharmacyId: pharmacyIdToSave, // <-- Lo pasamos al guardado
    }
    onSave(formData)
  }

  return (
    // El fondo oscuro semitransparente
    <div className="modal-backdrop" onClick={onClose}>
      {/* El contenido del modal */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Nueva Cita</h2>
        <p>Creando cita para el día: <strong>{date}</strong></p>

        <form onSubmit={handleSubmit}>
          {/* Campo: Hora */}
          <div>
            <label htmlFor="time">Hora</label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          {/* Campo: Servicio */}
          <div>
            <label htmlFor="service">Servicio</label>
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Selecciona un servicio --
              </option>
              {/* 3. LÓGICA DE ROLES EN EL RENDER */}
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}{' '}
                  {profile.role === 'admin' &&
                    `(Farmacia ID: ${service.pharmacy_id})`}
                </option>
              ))}
            </select>
            {services.length === 0 && (
              <small style={{ color: 'red' }}>
                No hay servicios disponibles para tu farmacia.
              </small>
            )}
          </div>

          {/* Campo: Nombre del Cliente */}
          <div>
            <label htmlFor="clientName">Nombre del Cliente</label>
            <input
              id="clientName"
              type="text"
              placeholder="Nombre Apellido"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          {/* Campo: Teléfono */}
          <div>
            <label htmlFor="clientPhone">Teléfono</label>
            <input
              id="clientPhone"
              type="tel"
              placeholder="600123456"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>

          {/* Campo: Tarjeta Trébol */}
          <div>
            <label htmlFor="tarjetaTrebol">Tarjeta Trébol</label>
            <input
              id="tarjetaTrebol"
              type="text"
              placeholder="123456789"
              value={tarjetaTrebol}
              onChange={(e) => setTarjetaTrebol(e.target.value)}
            />
          }
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="button">
              Guardar Cita
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}