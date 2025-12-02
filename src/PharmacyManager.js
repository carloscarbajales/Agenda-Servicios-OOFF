import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Componente visible solo para Admin/Gestor
export default function PharmacyManager({ profile }) {
  const [pharmacies, setPharmacies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false); // Para botones Crear/Borrar
  const [newPharmacyName, setNewPharmacyName] = useState('')
  const [newPharmacyAddress, setNewPharmacyAddress] = useState('')

  // Carga inicial de farmacias
  useEffect(() => {
    loadPharmacies()
  }, [])

  async function loadPharmacies() {
    setLoading(true)
    console.log("Debug Pharmacy: Cargando farmacias...");
    // La RLS ya debería filtrar si es necesario (aunque admin/gestor ven todo)
    const { data, error } = await supabase.from('pharmacies').select('*').order('name', { ascending: true }); // Ordena por nombre
    if (error) {
        console.error("Error cargando farmacias:", error);
        alert("Error al cargar la lista de farmacias.");
        setPharmacies([]); // Asegura array vacío en error
    } else {
        setPharmacies(data || []);
        console.log("Debug Pharmacy: Farmacias cargadas:", data);
    }
    setLoading(false);
  }

  // --- Manejador para CREAR Farmacia ---
  const handleCreatePharmacy = async (e) => {
    e.preventDefault();
    if (!newPharmacyName.trim()) {
         alert("El nombre de la farmacia es obligatorio.");
         return;
    }
    setActionLoading(true);
    console.log("Debug Pharmacy: Intentando crear farmacia:", newPharmacyName);
    try {
        // RLS permite a admin/gestor insertar
        const { data, error } = await supabase.from('pharmacies').insert({
            name: newPharmacyName.trim(),
            address: newPharmacyAddress.trim() || null, // Guarda null si la dirección está vacía
            // Valores iniciales para objetivos si los hubiera
            estimated_ops: 0,
            conversion_rate: 0,
        }).select(); // select() para confirmar

        if (error) throw error;

        console.log("Debug Pharmacy: Farmacia creada:", data);
        alert(`Farmacia "${newPharmacyName.trim()}" creada con éxito.`);
        setNewPharmacyName(''); // Limpia formulario
        setNewPharmacyAddress('');
        await loadPharmacies(); // Recarga la lista

    } catch(error) {
        console.error("Error al crear farmacia:", error);
        alert("Error al crear la farmacia: " + error.message);
    } finally {
        setActionLoading(false);
    }
  }

   // --- Manejador para BORRAR Farmacia ---
   const handleDeletePharmacy = async (pharmacyId, pharmacyName) => {
        // Confirmaciones
        if (!window.confirm(`¿BORRAR PERMANENTEMENTE la farmacia "${pharmacyName}"?\n\n¡¡¡ATENCIÓN!!!\nSe borrarán TODOS sus servicios, horarios, citas, objetivos y asignaciones asociadas.\n\nEsta acción NO SE PUEDE DESHACER.`)) return;
        const confirmName = prompt(`Para confirmar, escribe el nombre exacto de la farmacia: "${pharmacyName}"`);
        if(confirmName !== pharmacyName){ alert("Nombre incorrecto. Borrado cancelado."); return; }

        setActionLoading(true);
        console.log("Debug Pharmacy: Intentando borrar farmacia ID:", pharmacyId);
        try {
            // RLS permite borrar a admin/gestor
            const { error } = await supabase.from('pharmacies').delete().eq('id', pharmacyId);
            if (error) throw error;
            console.log("Debug Pharmacy: Farmacia borrada:", pharmacyId);
            alert(`Farmacia "${pharmacyName}" borrada correctamente.`);
            await loadPharmacies(); // Recarga la lista

        } catch(error) {
            console.error("Error al borrar farmacia:", error);
            // Podría fallar si hay dependencias inesperadas que no pusimos ON DELETE CASCADE
            alert("Error al borrar la farmacia: " + error.message + "\nAsegúrate de que no haya datos dependientes inesperados.");
        } finally {
            setActionLoading(false);
        }
   }


  if (loading) return <p>Cargando gestión de farmacias...</p>;
  // No renderiza nada si no es admin/gestor (aunque Settings.js ya debería hacer esto)
  if (profile.role !== 'admin' && profile.role !== 'gestor') return null;

  return (
    <div className="pharmacy-manager">
      {/* --- Formulario Crear --- */}
      <form onSubmit={handleCreatePharmacy} className="service-form"> {/* Reutiliza estilo */}
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

      {/* --- Tabla Farmacias Existentes --- */}
      <hr />
      <h3>Farmacias Existentes</h3>
      <table className="service-table"> {/* Reutiliza estilo */}
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
                <td>{p.address || '-'}</td> {/* Muestra guion si no hay dirección */}
                <td className="actions-cell">
                  {/* TODO: Botón Editar Farmacia */}
                  <button
                      className="button-delete"
                      onClick={() => handleDeletePharmacy(p.id, p.name)}
                      disabled={actionLoading} // Deshabilita mientras otra acción ocurre
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