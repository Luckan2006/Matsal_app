import { useState, useEffect } from 'react'
import './app.css'
import { supabase } from './supabaseClient'

function App() {
  const [counts, setCounts] = useState({
    one: 0,
    two: 0,
    three: 0,
    four: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCounts = async () => {
      const { data, error } = await supabase
        .from('clicks')
        .select('one, two, three, four')
        .eq('id', 1)
        .single()

      if (error) {
        setError('Kunde inte hämta data')
        console.error(error)
      } else {
        setCounts(data)
      }

      setLoading(false)
    }

    fetchCounts()
  }, [])

  const handleClick = async (key) => {
    const updated = { ...counts, [key]: counts[key] + 1 }

    const { error } = await supabase
      .from('clicks')
      .update(updated)
      .eq('id', 1)

    if (error) {
      setError('Kunde inte spara klicket')
      return
    }

    setCounts(updated)
  }

  const handleReset = async () => {
    const resetValues = { one: 0, two: 0, three: 0, four: 0 }

    const { error } = await supabase
      .from('clicks')
      .update(resetValues)
      .eq('id', 1)

    if (error) {
      setError('Kunde inte återställa värdena')
      return
    }

    setCounts(resetValues)
  }

  if (loading) return <h1>Laddar...</h1>

  return (
    <div className="app">
      <h1>Varför slängde du maten?</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="grid">
        <button onClick={() => handleClick('one')}>
          Hann inte äta ({counts.one})
        </button>
        <button onClick={() => handleClick('two')}>
          Tog för mycket ({counts.two})
        </button>
        <button onClick={() => handleClick('three')}>
          Ogillade maten ({counts.three})
        </button>
        <button onClick={() => handleClick('four')}>
          Slängde inte ({counts.four})
        </button>
      </div>

      <button style={{ marginTop: 20 }} onClick={handleReset}>
        Återställ alla värden
      </button>
    </div>
  )
}

export default App
