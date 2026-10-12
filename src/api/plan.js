import axios from 'axios'
import { buildMockPlan } from '../mock/planResponse'

const USE_MOCK = false

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

export async function planTrip(payload) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 900))
    return buildMockPlan(payload)
  }
  try {
    const { data } = await api.post('/api/plan/', payload)
    return data
  } catch (e) {
    throw new Error(e.response?.data?.error || e.message)
  }
}