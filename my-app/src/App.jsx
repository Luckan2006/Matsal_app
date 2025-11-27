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

  if (loading) return <h1>Laddar...</h1>

return (
  <div className="app">
    <h1 className="title">Varför slängde du maten?</h1>
    <div className="grid">
      <button className="button" onClick={() => handleClick('one')}>
        Hann inte äta ({counts.one})
      </button>
      <button className="button" onClick={() => handleClick('two')}>
        Tog för mycket ({counts.two})
      </button>
      <button className="button" onClick={() => handleClick('three')}>
        Ogillade maten ({counts.three})
      </button>
      <button className="button" onClick={() => handleClick('four')}>
        Slängde inte ({counts.four})
      </button>
    </div>
  </div>
)

}

export default App
