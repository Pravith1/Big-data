async function request(path, options) {
  const res = await fetch(`/api${path}`, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`)
  return body
}

export const getHealth = () => request('/health')
export const seedData = () => request('/seed', { method: 'POST' })
export const getMongoOverview = () => request('/mongo/overview')
export const getNeo4jOverview = () => request('/neo4j/overview')
