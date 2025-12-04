import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres"); return;
    }
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      alert("Error: " + error.message)
    } else {
      setMessage("Contraseña actualizada correctamente")
      setNewPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="settings-card" style={{maxWidth: '400px', margin: '20px auto'}}>
      <h3>Cambiar Mi Contraseña</h3>
      <form onSubmit={handleChangePassword} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        <input 
            type="password" 
            placeholder="Nueva contraseña" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)}
            style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
        />
        <button type="submit" className="button" disabled={loading}>
            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
        </button>
        {message && <p style={{color: 'green', textAlign:'center'}}>{message}</p>}
      </form>
    </div>
  )
}