export const RISK_LEVELS = [
  { level: 0, label: 'Low', color: '#2E9E5B' },
  { level: 1, label: 'Moderate', color: '#E8C522' },
  { level: 2, label: 'High', color: '#F08A24' },
  { level: 3, label: 'Severe', color: '#D62828' },
  { level: 4, label: 'No Travel', color: '#5B0F0F' },
]

export const ROUTE_COLORS = ['#2563EB', '#7C3AED', '#DB2777']

export const riskColor = (level) => RISK_LEVELS[Math.round(level)]?.color ?? '#999999'
export const riskLabel = (level) => RISK_LEVELS[Math.round(level)]?.label ?? 'Unknown'

export function fmtDuration(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export const fmtMiles = (mi) => `${Math.round(mi * 10) / 10} mi`