import { createSignal } from 'solid-js'
import './App.css'

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div>
      <h1>Demo Solid</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        Count: {count()}
      </button>
    </div>
  )
}

export default App
