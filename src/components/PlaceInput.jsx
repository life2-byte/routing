import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../api/geocode'

export default function PlaceInput({ label, placeholder, dot, onSelect }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (picked || text.trim().length < 3) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        setResults(await searchPlaces(text.trim(), ctrl.signal))
        setOpen(true)
      } catch (e) {
        if (e.code !== 'ERR_CANCELED') setResults([])
      } finally {
        setBusy(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [text, picked])

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (p) => {
    setText(p.label)
    setPicked(true)
    setOpen(false)
    onSelect(p)
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{ background: dot }}
        />
        <input
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            setPicked(false)
            onSelect(null)
          }}
          onFocus={() => results.length && setOpen(true)}
          className="w-full rounded-lg border border-ink/15 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {busy && (
          <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-ink/10 bg-white shadow-lg">
          {results.map((p, i) => (
            <li
              key={`${p.lat}-${p.lon}-${i}`}
              onMouseDown={() => choose(p)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-brand/10"
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}