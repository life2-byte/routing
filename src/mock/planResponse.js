const R = 3958.8
const rad = (d) => (d * Math.PI) / 180

function hav(a, b) {
  const dLat = rad(b[1] - a[1])
  const dLon = rad(b[0] - a[0])
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function makeGeometry(o, d, bulge, n = 80) {
  const dx = d.lon - o.lon
  const dy = d.lat - o.lat
  const px = -dy
  const py = dx
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s = Math.sin(Math.PI * t) * bulge + Math.sin(3 * Math.PI * t) * bulge * 0.08
    pts.push([o.lon + dx * t + px * s, o.lat + dy * t + py * s])
  }
  return pts
}

function cumulative(geom, factor = 1.15) {
  const c = [0]
  for (let i = 1; i < geom.length; i++) c.push(c[i - 1] + hav(geom[i - 1], geom[i]) * factor)
  return c
}

function pointAt(geom, cum, mile) {
  const total = cum[cum.length - 1]
  const m = Math.min(Math.max(mile, 0), total)
  let i = 1
  while (i < cum.length - 1 && cum[i] < m) i++
  const t = (m - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
  return [
    geom[i - 1][0] + (geom[i][0] - geom[i - 1][0]) * t,
    geom[i - 1][1] + (geom[i][1] - geom[i - 1][1]) * t,
  ]
}

// Fake moving storm so the heatmap + slider actually change over 0-48h
function weatherAt(lat, lon, hour, o, d) {
  const dx = d.lon - o.lon
  const dy = d.lat - o.lat
  const span = Math.max(Math.abs(dx), Math.abs(dy), 0.5)
  const midLat = (o.lat + d.lat) / 2
  const midLon = (o.lon + d.lon) / 2
  const k = ((hour - 24) / 48) * 0.8
  const cLat = midLat + dy * k - dx * 0.12
  const cLon = midLon + dx * k + dy * 0.12
  const dist = Math.hypot(lat - cLat, lon - cLon)
  const radius = span * 0.45
  const intensity = Math.max(0, 1 - dist / radius)
  return {
    wind: 10 + 50 * intensity,
    rain: 1.25 * intensity ** 1.5,
    snow: intensity > 0.6 && lat > 35 ? (intensity - 0.6) * 7 : 0,
  }
}

// Same thresholds as the spec. Backend (risk.py) will own this for real.
function classify(w, rain, snow, loadLbs) {
  const wind = w < 25 ? 0 : w < 35 ? 1 : w < 45 ? 2 : w < 55 ? 3 : 4
  const rn = rain < 0.1 ? 0 : rain < 0.25 ? 1 : rain < 0.5 ? 2 : rain <= 1.0 ? 3 : 4
  const sn = snow < 0.5 ? 0 : snow < 1.0 ? 1 : snow < 2.0 ? 2 : snow <= 3.0 ? 3 : 4
  let level = Math.max(wind, rn, sn)
  if (w >= 55) level = 4
  else if (w >= 45 && loadLbs > 30000) level = 4
  else if (w >= 35 && loadLbs > 40000) level = Math.max(level, 3)
  return level
}

export function buildMockPlan(req) {
  const { origin, destination, load_lbs } = req
  const departure = new Date(req.departure)
  const depMs = departure.getTime()
  const straight = hav([origin.lon, origin.lat], [destination.lon, destination.lat]) * 1.15

  const interval =
    req.interval_miles === 'auto'
      ? straight < 150 ? 10 : straight < 400 ? 25 : 50
      : Number(req.interval_miles)

  const specs = [
    { id: 'r1', name: 'Route 1', bulge: 0.0, speed: 56 },
    { id: 'r2', name: 'Route 2', bulge: 0.11, speed: 52 },
    { id: 'r3', name: 'Route 3', bulge: -0.17, speed: 48 },
  ]

  const routes = specs.map((s) => {
    const geometry = makeGeometry(origin, destination, s.bulge)
    const cum = cumulative(geometry)
    const total = cum[cum.length - 1]
    const duration_min = (total / s.speed) * 60

    const miles = []
    for (let m = 0; m < total; m += interval) miles.push(m)
    miles.push(total)

    const checkpoints = miles.map((mile, i) => {
      const [lon, lat] = pointAt(geometry, cum, mile)
      const etaMs = depMs + (mile / total) * duration_min * 60000
      const hr = (etaMs - depMs) / 3600000
      const w = weatherAt(lat, lon, hr, origin, destination)
      const risk = classify(w.wind, w.rain, w.snow, load_lbs)
      const nextMile = i < miles.length - 1 ? miles[i + 1] : mile
      return {
        mile: Math.round(mile * 10) / 10,
        lat,
        lon,
        eta: new Date(etaMs).toISOString(),
        wind_mph: Math.round(w.wind * 10) / 10,
        rain_in_hr: Math.round(w.rain * 100) / 100,
        snow_in_hr: Math.round(w.snow * 100) / 100,
        risk,
        segment_miles: nextMile - mile,
      }
    })

    const byLevel = [0, 0, 0, 0, 0]
    let weighted = 0
    checkpoints.forEach((c) => {
      byLevel[c.risk] += c.segment_miles
      weighted += c.risk * c.segment_miles
    })

    const summary = {
      severe_miles: Math.round(byLevel[3] * 10) / 10,
      high_miles: Math.round(byLevel[2] * 10) / 10,
      no_travel_miles: Math.round(byLevel[4] * 10) / 10,
      avg_risk: Math.round((weighted / total) * 100) / 100,
      max_risk: Math.max(...checkpoints.map((c) => c.risk)),
      miles_by_level: byLevel.map((v) => Math.round(v * 10) / 10),
    }

    const warnings = []
    if (summary.no_travel_miles > 0) warnings.push('Contains No Travel conditions')

    return {
      id: s.id,
      name: s.name,
      distance_mi: Math.round(total * 10) / 10,
      duration_min: Math.round(duration_min),
      geometry,
      summary,
      checkpoints,
      warnings,
      recommended: false,
    }
  })

  const key = (r) => [
    r.summary.no_travel_miles > 0 ? 1 : 0,
    r.summary.severe_miles,
    r.summary.high_miles,
    r.summary.avg_risk,
    r.duration_min,
  ]
  const best = [...routes].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
    return 0
  })[0]
  best.recommended = true

  // Heatmap: sample points along all routes, 49 hourly risk values each (0..48h)
  const points = []
  routes.forEach((r, idx) => {
    const geometry = r.geometry
    const cum = cumulative(geometry)
    const total = cum[cum.length - 1]
    for (let m = 0; m <= total; m += 15) {
      const [lon, lat] = pointAt(geometry, cum, m)
      const risk = []
      for (let h = 0; h <= 48; h++) {
        const w = weatherAt(lat, lon, h, origin, destination)
        risk.push(classify(w.wind, w.rain, w.snow, load_lbs))
      }
      points.push({ lat, lon, risk })
    }
  })

  return {
    request: {
      origin,
      destination,
      departure: departure.toISOString(),
      load_lbs,
      interval_miles: interval,
    },
    recommended_route_id: best.id,
    routes,
    heatmap: { start: departure.toISOString(), hours: 49, points },
  }
}