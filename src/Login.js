import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault() // Evita que la página se recargue

    try {
      setLoading(true)
      // Usamos el cliente de Supabase para iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (error) throw error
      // Si el login es exitoso, el componente App.js detectará el cambio
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row flex-center">
      <div className="col-6 form-widget">
        <h1 className="header">Farmacias Trébol 🍀</h1>
        <p className="description">Inicia sesión para acceder al panel</p>
        <form className="form-widget" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="inputField"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
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
            <button className={'button block'} disabled={loading}>
              {loading ? <span>Cargando...</span> : <span>Entrar</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}