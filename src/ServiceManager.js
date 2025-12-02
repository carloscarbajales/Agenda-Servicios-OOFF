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
  // --- NUEVO: Estado para el % objetivo de nuevos clientes ---
  const [newTargetPct, setNewTargetPct] = useState(0)
  
  // --- MODIFICADO: Para el admin, guardará un ARRAY de IDs para selección múltiple ---
  // Para el gerente, se rellenará automáticamente con su ID en un array de un solo elemento.
  const [newServicePharmacyIds, setNewServicePharmacyIds] = useState([])

  // Carga los datos basándose en el rol
  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Auto-rellena el ID de farmacia para el formulario (como array)
      if (myPharmacyId) {
        setNewServicePharmacyIds([myPharmacyId.toString()])
      }
    }
    // (Un admin se salta este IF y carga todo)

    const [pharmacyData, serviceData] = await Promise.all([
      pharmacyQuery,
      serviceQuery,
    ])

    if (pharmacyData.data) {
      setPharmacies(pharmacyData.data)
      // Si eres admin, inicializamos vacío para forzar selección
      if (profile.role === 'admin') {
        setNewServicePharmacyIds([])
      }
    }
    if (serviceData.data) {
      setServices(serviceData.data)
    }
    setLoading(false)
  }

  // --- NUEVO: Manejador para cambios en el select múltiple ---
  const handlePharmacySelectionChange = (e) => {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    setNewServicePharmacyIds(value);
  }

  // --- Manejador para CREAR un servicio (Soporta Múltiples Farmacias) ---
  const handleCreateService = async (e) => {
    e.preventDefault()

    // Validación actualizada para array de farmacias
    if (!newServiceName || newServicePharmacyIds.length === 0 || !newServiceTime) {
      alert('Nombre, Tiempo y al menos una Farmacia son obligatorios.')
      return
    }

    // Preparamos los datos para insertar (mapeamos cada farmacia seleccionada a un nuevo servicio)
    const servicesToInsert = newServicePharmacyIds.map(pharmacyId => ({
        name: newServiceName,
        time_per_service: parseInt(newServiceTime, 10),
        estimated_billing: parseFloat(newServiceBilling) || 0,
        target_new_clients_pct: parseFloat(newTargetPct) || 0, // ¡NUEVO CAMPO!
        pharmacy_id: parseInt(pharmacyId, 10)
    }));

    const { data, error } = await supabase
      .from('services')
      .insert(servicesToInsert)
      .select()

    if (error) {
      // La RLS de Supabase nos protege, pero por si acaso
      alert('Error al crear el servicio: ' + error.message)
    } else {
      alert(`¡Servicio creado exitosamente en ${data.length} farmacia(s)!`)
      setNewServiceName('')
      setNewServiceTime(15)
      setNewServiceBilling(0)
      setNewTargetPct(0)
      // Si es admin limpiamos selección, si es gerente mantenemos la suya
      if (profile.role === 'admin') setNewServicePharmacyIds([]); 
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
          
          {/* --- NUEVO CAMPO --- */}
          <div>
            <label htmlFor="s-target">Obj. % Nuevos</label>
            <input
              id="s-target" type="number" min="0" max="100" step="0.1"
              value={newTargetPct}
              onChange={(e) => setNewTargetPct(e.target.value)}
            />
          </div>
          
          {/* --- CAMPO CONDICIONAL FARMACIA (MODIFICADO PARA MÚLTIPLE) --- */}
          {/* Solo mostramos si hay farmacias cargadas */}
          {pharmacies.length > 0 && (
            <div className={profile.role === 'admin' ? "full-width-select" : ""}>
              <label htmlFor="s-pharmacy">Farmacia(s)</label>
              <select
                id="s-pharmacy"
                multiple={profile.role === 'admin'} // Múltiple solo si es admin
                value={newServicePharmacyIds}
                onChange={handlePharmacySelectionChange} // Usamos el nuevo manejador
                size={profile.role === 'admin' ? 5 : 1} // Altura del select
                style={{ height: profile.role === 'admin' ? 'auto' : 'initial' }}
              >
                {profile.role !== 'admin' && <option value="" disabled>-- Asignar a farmacia --</option>}
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {profile.role === 'admin' && <small style={{display:'block', color:'#666'}}>Mantén Ctrl (o Cmd) para seleccionar varias.</small>}
            </div>
          )}
          
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
            <th>% Nuevos</th> {/* NUEVA COLUMNA */}
            {/* Solo el admin ve la columna de farmacia */}
            {profile.role === 'admin' && <th>Farmacia</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0 ? (
            <tr><td colSpan={profile.role === 'admin' ? 6 : 5}>No hay servicios creados.</td></tr>
          ) : (
            services.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{service.time_per_service} min</td>
                <td>{service.estimated_billing} €</td>
                <td>{service.target_new_clients_pct || 0}%</td> {/* NUEVO DATO */}
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