import { useCallback, useEffect, useMemo, useState } from 'react'
import { destinationApi } from './api'
import { DestinationDetail } from './components/DestinationDetail'
import { DestinationForm } from './components/DestinationForm'
import { DestinationList } from './components/DestinationList'
import type { Destination, DestinationInput } from './types'

export default function App() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Destination | null>(null)
  const [editing, setEditing] = useState<Destination | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await destinationApi.list()
      setDestinations(data)
      const existingIds = new Set(data.map((item) => item.id))
      setSelectedId((current) => current !== null && !existingIds.has(current) ? null : current)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load destinations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (selectedId === null) { setSelected(null); return }
    let active = true
    destinationApi.get(selectedId)
      .then((destination) => { if (active) { setSelected(destination); setError('') } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load destination details.') })
    return () => { active = false }
  }, [selectedId])

  const visibleDestinations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return destinations
    return destinations.filter((destination) =>
      `${destination.name} ${destination.location} ${destination.description}`.toLocaleLowerCase().includes(query),
    )
  }, [destinations, search])

  async function save(values: DestinationInput) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const destination = editing
        ? await destinationApi.update(editing.id, values)
        : await destinationApi.create(values)
      setNotice(editing ? 'Destination updated.' : 'Destination created.')
      setEditing(null)
      setSelectedId(destination.id)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(destination: Destination) {
    if (!window.confirm(`Delete ${destination.name}? This cannot be undone.`)) return
    setError('')
    setNotice('')
    try {
      await destinationApi.remove(destination.id)
      if (selectedId === destination.id) { setSelectedId(null); setSelected(null) }
      if (editing?.id === destination.id) setEditing(null)
      setNotice(`${destination.name} deleted.`)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete destination.')
    }
  }

  function startEdit(destination: Destination) {
    setSelectedId(destination.id)
    setEditing(destination)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BD Tourist Guide home"><span className="brand-mark">BD</span><span>BD <strong>Tourist Guide</strong></span></a>
        <span className="assessment-label">University assessment · MVP</span>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">A little closer to somewhere wonderful</p>
            <h1>Find your next<br /><em>Bangladesh story.</em></h1>
            <p className="hero-copy">Browse destination details and help build a thoughtful guide to places across Bangladesh.</p>
            <a className="button button-light" href="#destinations">Explore destinations <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-orbit orbit-one" aria-hidden="true" />
          <div className="hero-orbit orbit-two" aria-hidden="true" />
          <span className="hero-coordinate">23° 41′ N &nbsp; 90° 21′ E</span>
        </section>

        <section className="workspace" id="destinations">
          <div className="workspace-heading">
            <div><p className="eyebrow">Explore and manage</p><h2>Destinations</h2></div>
            <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search places" aria-label="Search destinations" /></label>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          <div className="content-layout">
            <section className="list-section" aria-label="Destination list">
              <div className="list-heading"><h3>All places</h3><span>{loading ? 'Loading…' : `${visibleDestinations.length} ${visibleDestinations.length === 1 ? 'place' : 'places'}`}</span></div>
              {loading ? <div className="empty-state">Loading destinations…</div> : (
                <DestinationList
                  destinations={visibleDestinations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onEdit={startEdit}
                  onDelete={(destination) => void remove(destination)}
                />
              )}
            </section>

            <aside className="side-column">
              <DestinationDetail destination={selected} onEdit={startEdit} />
              <DestinationForm
                initialValue={editing}
                busy={busy}
                onSubmit={save}
                onCancel={() => setEditing(null)}
              />
            </aside>
          </div>
        </section>
      </main>

      <footer className="footer"><span>BD Tourist Guide</span><span>Discover more of Bangladesh.</span></footer>
    </div>
  )
}
