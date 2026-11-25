import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { apiErrorMessage, destinationApi } from '../api'
import type { Destination, DestinationInput } from '../types'

const emptyForm: DestinationInput = { name: '', description: '', location: '', image_url: null }

export default function Dashboard() {
  const { user, role, signOut } = useAuth()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isAdmin = role === 'admin'

  const loadDestinations = useCallback(async () => {
    setError('')
    try {
      const data = await destinationApi.list()
      setDestinations(data)
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDestinations() }, [loadDestinations])

  async function createDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await destinationApi.create({ ...form, image_url: form.image_url?.trim() || null })
      setForm(emptyForm)
      setNotice('Destination created. You are its owner.')
      await loadDestinations()
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function deleteDestination(destination: Destination) {
    if (!window.confirm(`Delete ${destination.name}?`)) return
    setError('')
    setNotice('')
    try {
      await destinationApi.remove(destination.id)
      setNotice('Destination deleted.')
      await loadDestinations()
    } catch (reason) {
      setError(apiErrorMessage(reason))
    }
  }

  function updateField(field: keyof DestinationInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Your account</p><h1 className="text-4xl font-semibold text-emerald-950">Dashboard</h1><p className="mt-2 text-slate-600">Signed in as {user?.email}.</p></div>
        <div className="flex gap-3"><Link className="button button-subtle" to="/">Home</Link><button className="button button-subtle" onClick={signOut}>Log out</button></div>
      </div>

      {error && <p role="alert" className="alert alert-error mt-5">{error}</p>}
      {notice && <p role="status" className="alert alert-success mt-5">{notice}</p>}

      <section className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <div>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-semibold text-emerald-950">Destinations</h2><span className="text-sm text-slate-500">{destinations.length} total</span></div>
          {loading ? <p className="text-slate-500">Loading destinations…</p> : destinations.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-slate-500">No destinations yet. Add the first one.</p> : (
            <ul className="grid gap-4">
              {destinations.map((destination) => {
                // The UI mirrors the API permission rule for convenience; the backend
                // remains authoritative and returns 403 for any unauthorized delete.
                const canDelete = isAdmin || destination.owner_id === user?.id
                return <li key={destination.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div><h3 className="text-lg font-semibold text-emerald-950">{destination.name}</h3><p className="text-sm text-emerald-800">{destination.location}</p><p className="mt-2 text-sm text-slate-600">{destination.description}</p><p className="mt-3 text-xs text-slate-500">{destination.owner_id === user?.id ? 'Owned by you' : `Owner ID: ${destination.owner_id ?? 'legacy record'}`}</p></div>
                    {canDelete && <button className="button button-danger shrink-0" onClick={() => void deleteDestination(destination)}>Delete</button>}
                  </div>
                </li>
              })}
            </ul>
          )}
        </div>

        <form className="form-panel h-fit" onSubmit={(event) => void createDestination(event)}>
          <div><p className="eyebrow">Share a place</p><h2>Create destination</h2></div>
          <label>Name<input required minLength={2} maxLength={160} value={form.name} onChange={(event) => updateField('name', event.target.value)} /></label>
          <label>Location<input required minLength={2} maxLength={160} value={form.location} onChange={(event) => updateField('location', event.target.value)} /></label>
          <label>Image URL <span className="optional">(optional)</span><input type="url" value={form.image_url ?? ''} onChange={(event) => updateField('image_url', event.target.value)} /></label>
          <label>Description<textarea required minLength={5} maxLength={5000} rows={5} value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Create destination'}</button>
        </form>
      </section>
    </main>
  )
}
