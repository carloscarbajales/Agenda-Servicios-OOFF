import { useState } from 'react'
import { supabase } from './supabaseClient'
import logoTrebol from './assets/logo.png' // Asegúrate de que la imagen esté aquí

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault() 

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })
      if (error) throw error
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="form-widget" style={{ maxWidth: '400px', width: '100%', padding: '30px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        
        {/* --- LOGO --- */}
        <img 
            src={logoTrebol} 
            alt="Logo Farmacias Trébol" 
            style={{ width: '120px', height: 'auto', marginBottom: '20px' }} 
        />
        
        <h1 className="header" style={{ fontSize: '1.8rem', color: '#2e7d32', marginBottom: '10px' }}>Farmacias Trébol</h1>
        <p className="description" style={{ color: '#666', marginBottom: '30px' }}>Inicia sesión para acceder al gestor</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <label htmlFor="email" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#444' }}>Email</label>
            <input
              id="email"
              className="inputField"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '5px' }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label htmlFor="password" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#444' }}>Contraseña</label>
            <input
              id="password"
              className="inputField"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '5px' }}
            />
          </div>
          <div>
            <button className="button" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
              {loading ? <span>Cargando...</span> : <span>Entrar</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}