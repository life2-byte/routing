import { useEffect, useState } from 'react'
import { addHours, format } from 'date-fns'
import { RISK_LEVELS } from '../utils/risk'

export default function TimeSlider({ hour, setHour, departure, showHeat, setShowHeat }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setHour((h) => {
        if (h >= 48) {
          setPlaying(false)
          return 48
        }
        return h + 1
      })
    }, 500)
    return () => clearInterval(t)
  }, [playing, setHour])

  const when = addHours(new Date(departure), hour)

  return (
    <div className="pointer-events-auto rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (hour >= 48 ? (setHour(0), setPlaying(true)) : setPlaying((p) => !p))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
            aria-label="Play forecast"
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <div>
            <div className="text-sm font-bold">
              +{hour}h · {format(when, 'EEE d MMM, HH:mm')}
            </div>
            <div className="text-xs text-ink/60">Weather heatmap forecast</div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showHeat}
            onChange={(e) => setShowHeat(e.target.checked)}
            className="h-4 w-4 accent-[#0B5D3B]"
          />
          Heatmap
        </label>
      </div>

      <input
        type="range"
        min="0"
        max="48"
        step="1"
        value={hour}
        onChange={(e) => {
          setPlaying(false)
          setHour(Number(e.target.value))
        }}
        className="w-full accent-[#0B5D3B]"
      />
      <div className="flex justify-between text-[10px] text-ink/50">
        <span>0h</span><span>12h</span><span>24h</span><span>36h</span><span>48h</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {RISK_LEVELS.map((r) => (
          <div key={r.level} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}