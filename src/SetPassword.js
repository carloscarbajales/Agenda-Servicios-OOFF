import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function SetPassword() {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState('')

  const handleSetPassword = async (e) => {
    e.preventDefault()
    setMessage('')

    if (password !== passwordConfirm) {
      setMessage('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      // Supabase es inteligente. Sabe que estás en una URL de invitación
      // y usará el token de la URL automáticamente.
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setMessage('¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.')
      // Opcional: redirigir al login después de unos segundos
      setTimeout(() => {
         window.location.hash = '' // Limpia el token de la URL
         window.location.reload() // Recarga la app (que mostrará el Login)
      }, 3000)

    } catch (error) {
      setMessage('Error al actualizar la contraseña: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row flex-center">
      <div className="col-6 form-widget">
        <h1 className="header">Farmacias Trébol 🍀</h1>
        <p className="description">Crea tu contraseña</p>
        <form className="form-widget" onSubmit={handleSetPassword}>
          <div>
            <label htmlFor="password">Nueva Contraseña</label>
            <input
              id="password"
              className="inputField"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="passwordConfirm">Confirmar Contraseña</label>
            <input
              id="passwordConfirm"
              className="inputField"
              type="password"
              placeholder="********"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
          <div>
            <button className={'button block'} disabled={loading}>
              {loading ? <span>Guardando...</span> : <span>Guardar Contraseña</span>}
            </button>
          </div>
          {message && <p style={{ textAlign: 'center', color: 'green' }}>{message}</p>}
        </form>
      </div>
    </div>
  )
}