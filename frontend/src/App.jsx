// src/App.jsx
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import SubscribeButton from './SubscribeButton'

export default function App() {
  const [count, setCount] = useState(0)
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const pedirPermiso = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador no soporta notificaciones.')
      return
    }
    const result = await Notification.requestPermission()
    setPerm(result)
    console.log('permiso:', result)
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1>Lorra News</h1>

      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>count is {count}</button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p>Permiso de notificaciones: <b>{perm}</b></p>

        {perm !== 'granted'
          ? <button onClick={pedirPermiso}>Permitir notificaciones</button>
          : <SubscribeButton />
        }
      </div>
    </>
  )
}
