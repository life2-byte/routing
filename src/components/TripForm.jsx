import { useState } from 'react'
import { addDays, addHours, format } from 'date-fns'
import PlaceInput from './PlaceInput'

const toLocalInput = (d) => format(d, "yyyy-MM-dd'T'HH:mm")

export default function TripForm({ onSubmit, loading }) {
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [departure, setDeparture] = useState(() => toLocalInput(addHours(new Date(), 1)))
  const [load, setLoad] = useState(35000)
  const [interval, setIntervalMi] = useState('auto')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!origin || !destination) return setError('Dropdown me se origin aur destination select karo.')
    const dep = new Date(departure)
    if (isNaN(dep.getTime())) return setError('Departure date/time sahi nahi hai.')
    if (dep.getTime() < Date.now() - 5 * 60000) return setError('Departure past me nahi ho sakta.')
    if (dep > addDays(new Date(), 15)) return setError('Forecast sirf 16 din tak available hai.')
    if (!load || Number(load) <= 0) return setError('Load weight sahi daalo (lb).')

    setError('')
    onSubmit({
      origin: { name: origin.label, lat: origin.lat, lon: origin.lon },
      destination: { name: destination.label, lat: destination.lat, lon: destination.lon },
      departure: dep.toISOString(),
      load_lbs: Number(load),
      interval_miles: interval === 'auto' ? 'auto' : Number(interval),
    })
  }

  const input =
    'w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'
  const lbl = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60'

  return (
    <form onSubmit={submit} className="space-y-3">
      <PlaceInput label="Origin" placeholder="e.g. Dallas, Texas" dot="#2563EB" onSelect={setOrigin} />
      <PlaceInput label="Destination" placeholder="e.g. Houston, Texas" dot="#DC2626" onSelect={setDestination} />

      <div>
        <label className={lbl}>Departure</label>
        <input
          type="datetime-local"
          value={departure}
          min={toLocalInput(new Date())}
          max={toLocalInput(addDays(new Date(), 15))}
          onChange={(e) => setDeparture(e.target.value)}
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Load (lb)</label>
          <input
            type="number"
            min="1"
            step="500"
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={lbl}>Checkpoints</label>
          <select value={interval} onChange={(e) => setIntervalMi(e.target.value)} className={input}>
            <option value="auto">Auto</option>
            <option value="10">Every 10 mi</option>
            <option value="25">Every 25 mi</option>
            <option value="50">Every 50 mi</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? 'Planning...' : 'Plan Safest Route'}
      </button>
    </form>
  )
}