import { useEffect, useState } from 'react'
import { getHealth, getMongoOverview, getNeo4jOverview, seedData } from './api'

function StatusCard({ title, status, detail }) {
  const state = !status ? 'checking' : status.connected ? 'ok' : 'down'
  const label = { checking: 'Checking…', ok: 'Connected', down: 'Not connected' }[state]
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className={`badge ${state}`}>{label}</span>
      </div>
      <p className="muted">{detail}</p>
      {status?.error && <pre className="error">{status.error}</pre>}
    </div>
  )
}

function Table({ columns, rows }) {
  if (!rows.length) return <p className="muted">No data yet — click “Load sample data”.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(([key]) => <td key={key}>{row[key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [mongo, setMongo] = useState(null)
  const [neo, setNeo] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const h = await getHealth()
      setHealth(h)
      setMongo(h.mongodb.connected ? await getMongoOverview() : null)
      setNeo(h.neo4j.connected ? await getNeo4jOverview() : null)
    } catch (e) {
      setMessage(`Backend unreachable: ${e.message}. Is uvicorn running on port 8000?`)
    }
  }

  async function handleSeed() {
    setBusy(true)
    setMessage('')
    try {
      const r = await seedData()
      const parts = Object.entries(r).map(([db, v]) => `${db}: ${v.ok ? 'loaded' : v.error}`)
      setMessage(parts.join(' · '))
      await refresh()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <main>
      <header>
        <h1>Smart Sports Analytics Platform</h1>
        <p className="muted">MongoDB + Neo4j · FastAPI backend</p>
      </header>

      <section className="grid">
        <StatusCard title="MongoDB" status={health?.mongodb} detail={`Database: ${health?.mongodb.database ?? '…'}`} />
        <StatusCard title="Neo4j" status={health?.neo4j} detail={`URI: ${health?.neo4j.uri || 'not set'}`} />
      </section>

      <div className="actions">
        <button onClick={refresh}>Recheck connections</button>
        <button onClick={handleSeed} disabled={busy}>{busy ? 'Loading…' : 'Load sample data'}</button>
        {message && <span className="muted">{message}</span>}
      </div>

      {mongo && (
        <section className="card">
          <h2>MongoDB · players</h2>
          <p className="muted">
            {Object.entries(mongo.collections).map(([c, n]) => `${c} (${n})`).join(' · ')}
          </p>
          <Table
            columns={[['player_id', 'ID'], ['name', 'Name'], ['sport', 'Sport'], ['position', 'Position'], ['team', 'Team'], ['age', 'Age']]}
            rows={mongo.players}
          />
        </section>
      )}

      {neo && (
        <section className="card">
          <h2>Neo4j · player graph</h2>
          <p className="muted">
            {neo.labels.map((l) => `${l.label} (${l.count})`).join(' · ')}
            {neo.relationships.length > 0 && ' — '}
            {neo.relationships.map((r) => `${r.type} (${r.count})`).join(' · ')}
          </p>
          <Table
            columns={[['playerId', 'ID'], ['name', 'Name'], ['sport', 'Sport'], ['fitnessScore', 'Fitness'], ['team', 'PLAYS_FOR'], ['coach', 'COACHED BY']]}
            rows={neo.players}
          />
        </section>
      )}
    </main>
  )
}
