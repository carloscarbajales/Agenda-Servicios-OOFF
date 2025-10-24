import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Recibe el 'profile' para saber qué mostrar/hacer
export default function ServiceManager({ profile }) {
  const [services, setServices] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados para el formulario de "Nuevo Servicio"
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceTime, setNewServiceTime] = useState(15)
  const [newServiceBilling, setNewServiceBilling] = useState(0)
  
  // Para el admin, guardará el ID del desplegable.
  // Para el gerente, se rellenará automáticamente con su ID.
  const [newServicePharmacyId, setNewServicePharmacyId] = useState('')

  // Carga los datos basándose en el rol
  useEffect(() => {
    loadInitialData()
  }, [profile]) // Se ejecuta cuando el 'profile' está listo

  async function loadInitialData() {
    setLoading(true)

    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let serviceQuery = supabase.from('services').select('*, pharmacies(name)')

    // --- LÓGICA DE ROLES ---
    if (profile.role !== 'admin') {
      const myPharmacyId = profile.pharmacy_id
      
      // Un gerente/empleado solo puede ver su farmacia
      pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
      // Y solo puede ver los servicios de su farmacia
      serviceQuery = serviceQuery.eq('pharmacy_id', myPharmacyId)

      // Auto-rellena el ID de farmacia para el formulario
      setNewServicePharmacyId(myPharmacyId)
    }
    // (Un admin se salta este IF y carga todo)

    const [pharmacyData, serviceData] = await Promise.all([
      pharmacyQuery,
      serviceQuery,
    ])

    if (pharmacyData.data) {
      setPharmacies(pharmacyData.data)
      // Si eres admin y no has seleccionado nada, selecciona la primera
      if (profile.role === 'admin' && pharmacyData.data.length > 0) {
        setNewServicePharmacyId(pharmacyData.data[0].id)
      }
    }
    if (serviceData.data) {
      setServices(serviceData.data)
    }
    setLoading(false)
  }

  // --- Manejador para CREAR un servicio ---
  const handleCreateService = async (e) => {
    e.preventDefault()

    if (!newServiceName || !newServicePharmacyId || !newServiceTime) {
      alert('Nombre, Tiempo y Farmacia son obligatorios.')
      return
    }

    const { data, error } = await supabase
      .from('services')
      .insert({
        name: newServiceName,
        time_per_service: newServiceTime,
        estimated_billing: newServiceBilling,
        pharmacy_id: newServicePharmacyId, // Ya está filtrado por rol
      })
      .select()

    if (error) {
      // La RLS de Supabase nos protege, pero por si acaso
      alert('Error al crear el servicio: ' + error.message)
    } else {
      alert('¡Servicio creado!')
      setNewServiceName('')
      setNewServiceTime(15)
      setNewServiceBilling(0)
      loadInitialData() // Recarga todo
    }
  }

  // --- Manejador para BORRAR un servicio ---
  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('¿Estás seguro de que quieres borrar este servicio?')) {
      return
    }
    // La RLS de Supabase se encarga de que un gerente
    // no pueda borrar un servicio de OTRA farmacia.
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      alert('Error al borrar el servicio: ' + error.message)
    } else {
      alert('¡Servicio borrado!')
      loadInitialData() // Recarga todo
    }
  }

  if (loading) {
    return <p>Cargando gestión de servicios...</p>
  }

  return (
    <div className="service-manager">
      {/* --- Formulario de CREACIÓN --- */}
      <form onSubmit={handleCreateService} className="service-form">
        <h3>Crear Nuevo Servicio</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="s-name">Nombre</label>
            <input
              id="s-name" type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="s-time">Tiempo (min)</label>
            <input
              id="s-time" type="number" min="1"
              value={newServiceTime}
              onChange={(e) => setNewServiceTime(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="s-billing">Fact. Estimada (€)</label>
            <input
              id="s-billing" type="number" min="0" step="0.01"
              value={newServiceBilling}
              onChange={(e) => setNewServiceBilling(e.target.value)}
            />
          </div>
          
          {/* --- CAMPO CONDICIONAL --- */}
          {/* Solo el 'admin' ve el desplegable de Farmacias */}
          {profile.role === 'admin' && (
            <div>
              <label htmlFor="s-pharmacy">Farmacia</label>
              <select
                id="s-pharmacy"
                value={newServicePharmacyId}
                onChange={(e) => setNewServicePharmacyId(e.target.value)}
              >
                <option disabled value="">-- Asignar a farmacia --</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Un 'gerente' no ve el desplegable, su ID ya está asignado */}
          
          <button type="submit" className="button">Crear</button>
        </div>
      </form>

      {/* --- Tabla de Servicios EXISTENTES --- */}
      <hr />
      <h3>Servicios Existentes</h3>
      <table className="service-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tiempo</th>
            <th>Fact. Estimada</th>
            {/* Solo el admin necesita ver la columna de farmacia */}
            {profile.role === 'admin' && <th>Farmacia</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0 ? (
            <tr><td colSpan={profile.role === 'admin' ? 5 : 4}>No hay servicios creados.</td></tr>
          ) : (
            services.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{service.time_per_service} min</td>
                <td>{service.estimated_billing} €</td>
                {profile.role === 'admin' && (
                  <td>{service.pharmacies?.name || 'N/A'}</td>
                )}
                <td>
                  {/* TODO: Botón de Editar */}
                  <button
                    className="button-delete"
                    onClick={() => handleDeleteService(service.id)}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}