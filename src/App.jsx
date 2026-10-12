import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import TripForm from './components/TripForm'
import RouteCards from './components/RouteCards'
import MapView from './components/MapView'
import TimeSlider from './components/TimeSlider'
import { planTrip } from './api/plan'

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl bg-ink/10" />
      ))}
    </div>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState(null)
  const [hour, setHour] = useState(0)
  const [showHeat, setShowHeat] = useState(true)

  const mutation = useMutation({
    mutationFn: planTrip,
    onSuccess: (data) => {
      setSelectedId(data.recommended_route_id)
      setHour(0)
    },
  })

  const plan = mutation.data

  return (
    <div className="flex h-full">
      <aside className="flex w-[390px] shrink-0 flex-col border-r border-ink/10 bg-paper">
        <header className="flex items-center gap-2 bg-brand px-5 py-4 text-white">
          <span className="text-xl">🚚</span>
          <div>
            <h1 className="text-base font-bold leading-tight">Weather-Aware Truck Routing</h1>
            <p className="text-xs text-white/70">Safest route, not just the fastest</p>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <TripForm onSubmit={(p) => mutation.mutate(p)} loading={mutation.isPending} />

          {mutation.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {mutation.error.message}
            </p>
          )}

          {mutation.isPending && <Skeleton />}

          {plan && !mutation.isPending && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
                Route options
              </h2>
              <RouteCards routes={plan.routes} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}

          {!plan && !mutation.isPending && !mutation.isError && (
            <div className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/60">
              Origin, destination, departure aur load daalo, phir <b>Plan Safest Route</b> dabao.
            </div>
          )}
        </div>
      </aside>

      <main className="relative flex-1">
        <MapView
          plan={plan}
          selectedId={selectedId}
          onSelect={setSelectedId}
          hour={hour}
          showHeat={showHeat}
        />

        {plan && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto max-w-2xl">
            <TimeSlider
              hour={hour}
              setHour={setHour}
              departure={plan.heatmap.start}
              showHeat={showHeat}
              setShowHeat={setShowHeat}
            />
          </div>
        )}
      </main>
    </div>
  )
}