import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?url'
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre'
import { format } from 'date-fns'
import { ROUTE_COLORS, riskColor, riskLabel } from '../utils/risk'

maplibregl.setWorkerUrl(maplibreWorkerUrl)

const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const HEAT_PAINT = {
  'heatmap-weight': [
    'interpolate', ['linear'], ['get', 'risk'],
    0, 0.05, 1, 0.3, 2, 0.55, 3, 0.8, 4, 1,
  ],
  'heatmap-intensity': 1,
  'heatmap-radius': [
    'interpolate', ['linear'], ['zoom'],
    3, 12, 6, 35, 9, 70, 12, 120,
  ],
  'heatmap-opacity': 0.75,
  'heatmap-color': [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(46,158,91,0)',
    0.15, 'rgba(46,158,91,0.45)',
    0.35, 'rgba(232,197,34,0.7)',
    0.55, 'rgba(240,138,36,0.8)',
    0.75, 'rgba(214,40,40,0.85)',
    1, 'rgba(91,15,15,0.95)',
  ],
}

export default function MapView({ plan, selectedId, onSelect, hour, showHeat }) {
  const mapRef = useRef(null)
  const [popup, setPopup] = useState(null)
  const [cursor, setCursor] = useState('')

  const routes = plan?.routes ?? []
  const selected = routes.find((r) => r.id === selectedId)

  const routeGeo = useMemo(
    () =>
      routes.map((r) => ({
        id: r.id,
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: r.geometry } },
      })),
    [routes],
  )

  const heatData = useMemo(() => {
    if (!plan) return { type: 'FeatureCollection', features: [] }
    return {
      type: 'FeatureCollection',
      features: plan.heatmap.points.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { risk: p.risk[hour] ?? 0 },
      })),
    }
  }, [plan, hour])

  useEffect(() => {
    setPopup(null)
    if (!plan || !mapRef.current) return
    const pts = plan.routes.flatMap((r) => r.geometry)
    const lons = pts.map((p) => p[0])
    const lats = pts.map((p) => p[1])
    mapRef.current.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: { top: 60, left: 60, right: 60, bottom: 160 }, duration: 900 },
    )
  }, [plan])

  const handleClick = (e) => {
    const f = e.features?.[0]
    if (f) onSelect(f.layer.id.replace('line-', ''))
    else setPopup(null)
  }

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={STYLE}
      initialViewState={{ longitude: -96, latitude: 38, zoom: 3.6 }}
      interactiveLayerIds={routes.map((r) => `line-${r.id}`)}
      onClick={handleClick}
      onMouseEnter={() => setCursor('pointer')}
      onMouseLeave={() => setCursor('')}
      cursor={cursor}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />

      {plan && (
        <Source id="heat" type="geojson" data={heatData}>
          <Layer id="heat-layer" type="heatmap" paint={HEAT_PAINT} layout={{ visibility: showHeat ? 'visible' : 'none' }} />
        </Source>
      )}

      {routeGeo.map((g) => {
        const idx = routes.findIndex((r) => r.id === g.id)
        const sel = g.id === selectedId
        return (
          <Source key={g.id} id={`src-${g.id}`} type="geojson" data={g.data}>
            <Layer
              id={`casing-${g.id}`}
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#ffffff', 'line-width': sel ? 9 : 6, 'line-opacity': 0.9 }}
            />
            <Layer
              id={`line-${g.id}`}
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': ROUTE_COLORS[idx % 3],
                'line-width': sel ? 5 : 3,
                'line-opacity': sel ? 1 : 0.55,
              }}
            />
          </Source>
        )
      })}

      {plan && (
        <>
          <Marker longitude={plan.request.origin.lon} latitude={plan.request.origin.lat}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2563EB] text-xs font-bold text-white shadow">A</div>
          </Marker>
          <Marker longitude={plan.request.destination.lon} latitude={plan.request.destination.lat}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] text-xs font-bold text-white shadow">B</div>
          </Marker>
        </>
      )}

      {selected?.checkpoints.map((c, i) => (
        <Marker
          key={`${selected.id}-${i}`}
          longitude={c.lon}
          latitude={c.lat}
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            setPopup(c)
          }}
        >
          <div
            className="h-3.5 w-3.5 cursor-pointer rounded-full border-2 border-white shadow"
            style={{ background: riskColor(c.risk) }}
          />
        </Marker>
      ))}

      {popup && (
        <Popup
          longitude={popup.lon}
          latitude={popup.lat}
          anchor="bottom"
          offset={12}
          onClose={() => setPopup(null)}
          closeOnClick={false}
        >
          <div className="min-w-[170px] text-sm">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: riskColor(popup.risk) }} />
              {riskLabel(popup.risk)}
            </div>
            <div className="text-xs text-ink/60">
              Mile {popup.mile} · ETA {format(new Date(popup.eta), 'EEE d MMM, HH:mm')}
            </div>
            <div className="mt-2 space-y-0.5 text-xs">
              <div>Wind: <b>{popup.wind_mph} mph</b></div>
              <div>Rain: <b>{popup.rain_in_hr} in/hr</b></div>
              <div>Snow: <b>{popup.snow_in_hr} in/hr</b></div>
            </div>
          </div>
        </Popup>
      )}
    </Map>
  )
}