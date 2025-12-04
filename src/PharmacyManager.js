import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function PharmacyManager({ profile }) {
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [newPharmacyName, setNewPharmacyName] = useState('')
  const [newPharmacyAddress, setNewPharmacyAddress] = useState('')

  useEffect(() => {
    loadPharmacies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadPharmacies() {
    setLoading(true)
    console.log("Debug Pharmacy: Cargando farmacias...")
    
    // Consulta base
    let query = supabase.from('pharmacies').select('*').order('name', { ascending: true })

    // CORRECCIÓN DE PERMISOS:
    // Si es Admin O Gestor, cargamos TODO (no filtramos por ID).
    // Si es otro rol (raro que acceda aquí), filtramos.
    if (profile.role !== 'admin' && profile.role !== 'gestor') {
        if (profile.pharmacy_id) {
            query = query.eq('id', profile.pharmacy_id)
        } else {
            setPharmacies([])
            setLoading(false)
            return
        }
    }

    const { data, error } = await query

    if (error) {
        console.error("Error cargando farmacias:", error)
        alert("Error al cargar la lista de farmacias.")
        setPharmacies([])
    } else {
        setPharmacies(data || [])
        console.log("Debug Pharmacy: Farmacias cargadas:", data)
    }
    setLoading(false)
  }

  const handleCreatePharmacy = async (e) => {
    e.preventDefault()
    if (!newPharmacyName.trim()) {
         alert("El nombre de la farmacia es obligatorio.")
         return
    }
    setActionLoading(true)
    try {
        const { data, error } = await supabase.from('pharmacies').insert({
            name: newPharmacyName.trim(),
            address: newPharmacyAddress.trim() || null,
            estimated_ops: 0,
            conversion_rate: 0,
        }).select()

        if (error) throw error

        alert(`Farmacia "${newPharmacyName.trim()}" creada con éxito.`)
        setNewPharmacyName('')
        setNewPharmacyAddress('')
        await loadPharmacies()

    } catch(error) {
        console.error("Error al crear farmacia:", error)
        alert("Error al crear la farmacia: " + error.message)
    } finally {
        setActionLoading(false)
    }
  }

   const handleDeletePharmacy = async (pharmacyId, pharmacyName) => {
        if (!window.confirm(`¿BORRAR PERMANENTEMENTE la farmacia "${pharmacyName}"?\n\n¡¡¡ATENCIÓN!!!\nSe borrarán TODOS sus servicios, horarios, citas y objetivos.\n\nEsta acción NO SE PUEDE DESHACER.`)) return
        const confirmName = prompt(`Para confirmar, escribe el nombre exacto: "${pharmacyName}"`)
        if(confirmName !== pharmacyName){ alert("Nombre incorrecto. Borrado cancelado."); return }

        setActionLoading(true)
        try {
            const { error } = await supabase.from('pharmacies').delete().eq('id', pharmacyId)
            if (error) throw error
            alert(`Farmacia "${pharmacyName}" borrada correctamente.`)
            await loadPharmacies()
        } catch(error) {
            console.error("Error al borrar farmacia:", error)
            alert("Error al borrar la farmacia: " + error.message)
        } finally {
            setActionLoading(false)
        }
   }

  if (loading) return <p>Cargando gestión de farmacias...</p>
  if (profile.role !== 'admin' && profile.role !== 'gestor') return null

  return (
    <div className="pharmacy-manager">
      {/* Formulario Crear */}
      <form onSubmit={handleCreatePharmacy} className="service-form">
        <h3>Crear Nueva Farmacia</h3>
        <div className="form-grid">
           <div>
               <label htmlFor="p-name">Nombre Farmacia</label>
               <input id="p-name" type="text" value={newPharmacyName} onChange={e => setNewPharmacyName(e.target.value)} required />
           </div>
           <div>
               <label htmlFor="p-address">Dirección (Opcional)</label>
               <input id="p-address" type="text" value={newPharmacyAddress} onChange={e => setNewPharmacyAddress(e.target.value)} />
           </div>
           <button type="submit" className="button" disabled={actionLoading}>
               {actionLoading ? 'Creando...' : 'Crear Farmacia'}
           </button>
        </div>
      </form>

      {/* Tabla Farmacias Existentes (SIN ESPACIOS EXTRAÑOS) */}
      <hr />
      <h3>Farmacias Existentes</h3>
      <table className="service-table">
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
          {pharmacies.length === 0 ? (
              <tr><td colSpan="3">No hay farmacias creadas o visibles.</td></tr>
          ) : (
              pharmacies.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.address || '-'}</td>
                <td className="actions-cell">
                  <button
                      className="button-delete"
                      onClick={() => handleDeletePharmacy(p.id, p.name)}
                      disabled={actionLoading}
                  >
                      Borrar
                  </button>
                </td>
              </tr>
           )))}
        </tbody>
      </table>
    </div>
  )
}