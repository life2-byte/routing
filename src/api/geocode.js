import axios from 'axios'

export async function searchPlaces(query, signal) {
  const { data } = await axios.get('https://photon.komoot.io/api/', {
    params: { q: query, limit: 5 },
    signal,
  })

  return data.features.map((f) => {
    const p = f.properties
    const label = [
      p.name,
      p.city && p.city !== p.name ? p.city : null,
      p.state,
      p.country,
    ]
      .filter(Boolean)
      .join(', ')

    return {
      label,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }
  })
}