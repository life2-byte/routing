import { RISK_LEVELS, ROUTE_COLORS, fmtDuration, fmtMiles, riskLabel } from '../utils/risk'

function RiskBar({ milesByLevel, total }) {
  return (
    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-ink/10">
      {milesByLevel.map((m, i) =>
        m > 0 ? (
          <div
            key={i}
            title={`${RISK_LEVELS[i].label}: ${fmtMiles(m)}`}
            style={{ width: `${(m / total) * 100}%`, background: RISK_LEVELS[i].color }}
          />
        ) : null,
      )}
    </div>
  )
}

export default function RouteCards({ routes, selectedId, onSelect }) {
  return (
    <div className="space-y-3">
      {routes.map((r, idx) => {
        const selected = r.id === selectedId
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`w-full rounded-xl border-2 bg-white p-4 text-left transition hover:shadow-md ${
              selected ? 'border-brand shadow-md' : 'border-transparent shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: ROUTE_COLORS[idx % 3] }} />
                <span className="font-semibold">{r.name}</span>
              </div>
              {r.recommended && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-ink">
                  Recommended
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-xl font-bold">{fmtDuration(r.duration_min)}</span>
              <span className="text-sm text-ink/60">{fmtMiles(r.distance_mi)}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-ink/5 py-1.5">
                <div className="font-bold text-[#D62828]">{fmtMiles(r.summary.severe_miles)}</div>
                <div className="text-ink/60">Severe</div>
              </div>
              <div className="rounded-lg bg-ink/5 py-1.5">
                <div className="font-bold text-[#F08A24]">{fmtMiles(r.summary.high_miles)}</div>
                <div className="text-ink/60">High</div>
              </div>
              <div className="rounded-lg bg-ink/5 py-1.5">
                <div className="font-bold">
                  {r.summary.avg_risk.toFixed(2)}
                </div>
                <div className="text-ink/60">Avg ({riskLabel(r.summary.avg_risk)})</div>
              </div>
            </div>

            <RiskBar milesByLevel={r.summary.miles_by_level} total={r.distance_mi} />

            {r.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs font-semibold text-[#5B0F0F]">
                ⚠ {w}
              </p>
            ))}
          </button>
        )
      })}
    </div>
  )
}