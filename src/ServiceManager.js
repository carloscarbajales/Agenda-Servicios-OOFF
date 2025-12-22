import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ServiceManager({ profile }) {
  const [services, setServices] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Estados Formulario
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceTime, setNewServiceTime] = useState(15)
  const [newServiceBilling, setNewServiceBilling] = useState(0)
  const [newTargetPct, setNewTargetPct] = useState(0)
  
  // Array de IDs para selección múltiple
  const [selectedPharmacyIds, setSelectedPharmacyIds] = useState([])

  // Estado para Edición
  const [editingServiceId, setEditingServiceId] = useState(null)

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadInitialData() {
    setLoading(true)

    let pharmacyQuery = supabase.from('pharmacies').select('*')
    let serviceQuery = supabase.from('services').select('*, pharmacies(name)').order('name', { ascending: true })

    // Permisos: Si no es Admin/Gestor, filtrar por su farmacia
    if (profile.role !== 'admin' && profile.role !== 'gestor') {
      const myPharmacyId = profile.pharmacy_id
      if (myPharmacyId) {
        pharmacyQuery = pharmacyQuery.eq('id', myPharmacyId)
        serviceQuery = serviceQuery.eq('pharmacy_id', myPharmacyId)
        // Auto-selección para gerente
        setSelectedPharmacyIds([myPharmacyId.toString()])
      } else {
        setLoading(false); return;
      }
    }

    try {
        const [pharmacyData, serviceData] = await Promise.all([pharmacyQuery, serviceQuery])
        
        if (pharmacyData.data) setPharmacies(pharmacyData.data)
        if (serviceData.data) setServices(serviceData.data)
        
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  // Manejador del select múltiple
  const handlePharmacySelectionChange = (e) => {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) value.push(options[i].value);
    }
    setSelectedPharmacyIds(value);
  }

  // --- PREPARAR EDICIÓN ---
  const handleEditClick = (service) => {
      setEditingServiceId(service.id);
      setNewServiceName(service.name);
      setNewServiceTime(service.time_per_service);
      setNewServiceBilling(service.estimated_billing);
      setNewTargetPct(service.target_new_clients_pct || 0);
      
      // Al editar, cargamos la farmacia actual.
      if (service.pharmacy_id) {
          setSelectedPharmacyIds([service.pharmacy_id.toString()]);
      } else {
          setSelectedPharmacyIds([]);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
      setEditingServiceId(null);
      setNewServiceName('');
      setNewServiceTime(15);
      setNewServiceBilling(0);
      setNewTargetPct(0);
      if (profile.role === 'admin' || profile.role === 'gestor') setSelectedPharmacyIds([]);
  }

  // --- GUARDAR (Crear o Actualizar + Expandir) ---
  const handleSaveService = async (e) => {
    e.preventDefault()

    if (!newServiceName || !newServiceTime) {
      alert('Nombre y Tiempo son obligatorios.')
      return
    }

    setActionLoading(true)

    try {
        // Datos comunes para update o insert
        const serviceData = {
            name: newServiceName,
            time_per_service: parseInt(newServiceTime),
            estimated_billing: parseFloat(newServiceBilling),
            target_new_clients_pct: parseFloat(newTargetPct)
        };

        if (editingServiceId) {
            // --- MODO ACTUALIZAR ---
            
            // 1. Actualizamos el servicio original (sin cambiar su farmacia)
            const { error } = await supabase.from('services').update(serviceData).eq('id', editingServiceId);
            if (error) throw error;

            // 2. Lógica de "Adición" (Expandir a otras farmacias)
            // Solo para Admin/Gestor
            if (profile.role === 'admin' || profile.role === 'gestor') {
                const originalService = services.find(s => s.id === editingServiceId);
                const originalPharmacyId = originalService?.pharmacy_id?.toString();

                // Filtramos las farmacias seleccionadas que NO son la original
                // (Es decir, las nuevas donde queremos clonar el servicio)
                const newPharmacyIds = selectedPharmacyIds.filter(id => id !== originalPharmacyId);

                if (newPharmacyIds.length > 0) {
                    if (window.confirm(`Has seleccionado farmacias nuevas. ¿Quieres crear copias de este servicio en ${newPharmacyIds.length} farmacia(s) más?`)) {
                        const servicesToInsert = newPharmacyIds.map(pharmacyId => ({
                            ...serviceData,
                            pharmacy_id: parseInt(pharmacyId)
                        }));
                        const { error: insertError } = await supabase.from('services').insert(servicesToInsert);
                        if (insertError) throw insertError;
                        
                        alert(`Servicio actualizado y clonado en ${newPharmacyIds.length} farmacia(s).`);
                    } else {
                         alert('Servicio actualizado (sin clonar).');
                    }
                } else {
                    alert('Servicio actualizado correctamente.');
                }
            } else {
                alert('Servicio actualizado correctamente.');
            }
            
            handleCancelEdit();

        } else {
            // --- MODO CREAR (Soporta Múltiple) ---
            if (selectedPharmacyIds.length === 0) {
                alert("Selecciona al menos una farmacia.");
                setActionLoading(false); return;
            }

            const servicesToInsert = selectedPharmacyIds.map(pharmacyId => ({
                ...serviceData,
                pharmacy_id: parseInt(pharmacyId)
            }));

            const { data, error } = await supabase.from('services').insert(servicesToInsert).select();
            if (error) throw error;
            alert(`¡Servicio creado en ${data.length} farmacia(s)!`);
            
            setNewServiceName(''); setNewServiceTime(15); setNewServiceBilling(0); setNewTargetPct(0);
            if (profile.role === 'admin' || profile.role === 'gestor') setSelectedPharmacyIds([]);
        }

        loadInitialData(); // Recargar tabla

    } catch(error) {
        alert('Error: ' + error.message)
    } finally {
        setActionLoading(false)
    }
  }

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('¿Borrar servicio? Esto eliminará citas y horarios asociados.')) return
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) alert('Error: ' + error.message)
    else { alert('¡Servicio borrado!'); loadInitialData(); }
  }

  if (loading) return <p>Cargando servicios...</p>;

  // Permisos
  const canManageAll = ['admin', 'gestor'].includes(profile.role);

  return (
    <div className="service-manager">
      <form onSubmit={handleSaveService} className="service-form" style={editingServiceId ? {border:'2px solid #2e7d32', padding:'15px', borderRadius:'8px'} : {}}>
        
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
            <h3>{editingServiceId ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</h3>
            {editingServiceId && <button type="button" onClick={handleCancelEdit} style={{background:'none', border:'none', color:'#d32f2f', cursor:'pointer', fontWeight:'bold'}}>Cancelar Edición ✕</button>}
        </div>

        <div className="form-grid">
          <div><label>Nombre</label><input type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} required placeholder="Ej: Nutrición"/></div>
          <div><label>Tiempo (min)</label><input type="number" min="1" value={newServiceTime} onChange={(e) => setNewServiceTime(e.target.value)} required/></div>
          <div><label>Fact. Estimada (€)</label><input type="number" min="0" step="0.01" value={newServiceBilling} onChange={(e) => setNewServiceBilling(e.target.value)}/></div>
          <div><label>Obj. % Nuevos</label><input type="number" min="0" max="100" step="0.1" value={newTargetPct} onChange={(e) => setNewTargetPct(e.target.value)}/></div>
          
          {/* Selector Farmacia */}
          {pharmacies.length > 0 && (
            <div className={canManageAll ? "full-width-select" : ""}>
              <label>Farmacia(s) {editingServiceId && <small style={{fontWeight:'normal', color:'#666'}}>(Añade farmacias para expandir el servicio)</small>}</label>
              <select
                multiple={canManageAll} // Múltiple SIEMPRE habilitado para admin/gestor
                value={selectedPharmacyIds}
                onChange={handlePharmacySelectionChange}
                size={canManageAll ? 5 : 1}
                disabled={!canManageAll} 
                required
              >
                {!canManageAll && <option value="" disabled>-- Tu Farmacia --</option>}
                {pharmacies.map((p) => ( <option key={p.id} value={p.id}>{p.name}</option> ))}
              </select>
              {canManageAll && <small style={{display:'block', color:'#666'}}>Mantén Ctrl para seleccionar varias.</small>}
            </div>
          )}
          
          <button type="submit" className="button" disabled={actionLoading}>
              {actionLoading ? 'Guardando...' : (editingServiceId ? 'Guardar Cambios' : 'Crear Servicio')}
          </button>
        </div>
      </form>

      <hr />
      <h3>Servicios Existentes</h3>
      
      <div className="table-wrapper">
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
                <tr key={service.id} style={editingServiceId === service.id ? {backgroundColor:'#e8f5e9'} : {}}>
                    <td>{service.name}</td>
                    <td>{service.time_per_service} min</td>
                    <td>{service.estimated_billing} €</td>
                    <td>{service.target_new_clients_pct || 0}%</td>
                    {canManageAll && <td>{service.pharmacies?.name || 'N/A'}</td>}
                    <td className="actions-cell">
                        <button className="button-secondary" onClick={() => handleEditClick(service)} disabled={editingServiceId !== null}>
                            Editar
                        </button>
                        <button className="button-delete" onClick={() => handleDeleteService(service.id)} disabled={editingServiceId !== null}>
                            Borrar
                        </button>
                    </td>
                </tr>
                ))
            )}
            </tbody>
        </table>
      </div>
    </div>
  )
}