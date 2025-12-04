import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ServiceManager({ profile }) {
  const [services, setServices] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados Formulario
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceTime, setNewServiceTime] = useState(15)
  const [newServiceBilling, setNewServiceBilling] = useState(0)
  const [newTargetPct, setNewTargetPct] = useState(0)
  const [newServicePharmacyIds, setNewServicePharmacyIds] = useState([]) // Array para selección múltiple

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadInitialData() {
    setLoading(true)

    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let serviceQuery = supabase.from('services').select('*, pharmacies(name)')

    // --- CORRECCIÓN AQUÍ: Admin y Gestor cargan todo ---
    // Solo filtramos si NO es ninguno de los dos
    if (profile.role !== 'admin' && profile.role !== 'gestor') {
      const myPharmacyId = profile.pharmacy_id
      
      pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
      serviceQuery = serviceQuery.eq('pharmacy_id', myPharmacyId)

      // Auto-rellena para gerente
      if (myPharmacyId) {
        setNewServicePharmacyIds([myPharmacyId.toString()])
      }
    }
    
    try {
        const [pharmacyData, serviceData] = await Promise.all([
          pharmacyQuery,
          serviceQuery,
        ])

        if (pharmacyData.data) {
          setPharmacies(pharmacyData.data)
          // Si es admin/gestor, inicializamos vacío para forzar selección
          if (profile.role === 'admin' || profile.role === 'gestor') {
            setNewServicePharmacyIds([])
          }
        }
        if (serviceData.data) {
          setServices(serviceData.data)
        }
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  const handlePharmacySelectionChange = (e) => {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) value.push(options[i].value);
    }
    setNewServicePharmacyIds(value);
  }

  const handleCreateService = async (e) => {
    e.preventDefault()

    if (!newServiceName || newServicePharmacyIds.length === 0 || !newServiceTime) {
      alert('Nombre, Tiempo y al menos una Farmacia son obligatorios.')
      return
    }

    const servicesToInsert = newServicePharmacyIds.map(pharmacyId => ({
        name: newServiceName,
        time_per_service: parseInt(newServiceTime, 10),
        estimated_billing: parseFloat(newServiceBilling) || 0,
        target_new_clients_pct: parseFloat(newTargetPct) || 0,
        pharmacy_id: parseInt(pharmacyId, 10)
    }));

    const { data, error } = await supabase.from('services').insert(servicesToInsert).select()

    if (error) {
      alert('Error al crear el servicio: ' + error.message)
    } else {
      alert(`¡Servicio creado en ${data.length} farmacia(s)!`)
      setNewServiceName('')
      setNewServiceTime(15)
      setNewServiceBilling(0)
      setNewTargetPct(0)
      if (profile.role === 'admin' || profile.role === 'gestor') setNewServicePharmacyIds([]);
      loadInitialData()
    }
  }

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('¿Borrar servicio?')) return
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) alert('Error: ' + error.message)
    else { alert('¡Servicio borrado!'); loadInitialData(); }
  }

  if (loading) return <p>Cargando servicios...</p>;

  // Permisos
  const canManageAll = ['admin', 'gestor'].includes(profile.role);

  return (
    <div className="service-manager">
      <form onSubmit={handleCreateService} className="service-form">
        <h3>Crear Nuevo Servicio</h3>
        <div className="form-grid">
          <div><label>Nombre</label><input type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} required/></div>
          <div><label>Tiempo (min)</label><input type="number" min="1" value={newServiceTime} onChange={(e) => setNewServiceTime(e.target.value)} required/></div>
          <div><label>Fact. Estimada (€)</label><input type="number" min="0" step="0.01" value={newServiceBilling} onChange={(e) => setNewServiceBilling(e.target.value)}/></div>
          <div><label>Obj. % Nuevos</label><input type="number" min="0" max="100" step="0.1" value={newTargetPct} onChange={(e) => setNewTargetPct(e.target.value)}/></div>
          
          {/* Selector Farmacia (Visible si hay farmacias cargadas) */}
          {pharmacies.length > 0 && (
            <div className={canManageAll ? "full-width-select" : ""}>
              <label>Farmacia(s)</label>
              <select
                multiple={canManageAll} // Múltiple para Admin/Gestor
                value={newServicePharmacyIds}
                onChange={handlePharmacySelectionChange}
                size={canManageAll ? 5 : 1}
                disabled={!canManageAll} // Bloqueado para Gerente (solo ve la suya)
              >
                {!canManageAll && <option value="" disabled>-- Tu Farmacia --</option>}
                {pharmacies.map((p) => ( <option key={p.id} value={p.id}>{p.name}</option> ))}
              </select>
              {canManageAll && <small style={{display:'block', color:'#666'}}>Mantén Ctrl (o Cmd) para seleccionar varias.</small>}
            </div>
          )}
          
          <button type="submit" className="button">Crear</button>
        </div>
      </form>

      <hr />
      <h3>Servicios Existentes</h3>
      <table className="service-table">
        <thead>
          <tr>
            <th>Nombre</th><th>Tiempo</th><th>Fact. Est.</th><th>% Nuevos</th>
            {canManageAll && <th>Farmacia</th>}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0 ? (<tr><td colSpan={canManageAll ? 6 : 5}>No hay servicios.</td></tr>) : (
            services.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td>
                <td>{service.time_per_service} min</td>
                <td>{service.estimated_billing} €</td>
                <td>{service.target_new_clients_pct || 0}%</td>
                {canManageAll && <td>{service.pharmacies?.name || 'N/A'}</td>}
                <td><button className="button-delete" onClick={() => handleDeleteService(service.id)}>Borrar</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}