import { useEffect, useState, type FormEvent } from 'react'
import type { Destination, DestinationInput } from '../types'

interface Props {
  initialValue: Destination | null
  busy: boolean
  onSubmit: (values: DestinationInput) => Promise<void>
  onCancel: () => void
}

const blank: DestinationInput = { name: '', description: '', location: '', image_url: null }

export function DestinationForm({ initialValue, busy, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<DestinationInput>(blank)
  const [error, setError] = useState('')

  useEffect(() => {
    setValues(initialValue ? {
      name: initialValue.name,
      description: initialValue.description,
      location: initialValue.location,
      image_url: initialValue.image_url,
    } : blank)
    setError('')
  }, [initialValue])

  function change(field: keyof DestinationInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await onSubmit({ ...values, image_url: values.image_url?.trim() || null })
      if (!initialValue) setValues(blank)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save destination.')
    }
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <div><p className="eyebrow">{initialValue ? 'Keep it up to date' : 'Add a new place'}</p><h2>{initialValue ? 'Edit destination' : 'Create destination'}</h2></div>
      <label>Destination name<input required minLength={2} maxLength={160} value={values.name} onChange={(event) => change('name', event.target.value)} placeholder="e.g. Bandarban" /></label>
      <label>Location<input required minLength={2} maxLength={160} value={values.location} onChange={(event) => change('location', event.target.value)} placeholder="District or region" /></label>
      <label>Image URL <span className="optional">(optional)</span><input type="url" value={values.image_url ?? ''} onChange={(event) => change('image_url', event.target.value)} placeholder="https://example.com/photo.jpg" /></label>
      <label>Description<textarea required minLength={5} maxLength={5000} rows={5} value={values.description} onChange={(event) => change('description', event.target.value)} placeholder="What makes this destination special?" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initialValue ? 'Save changes' : 'Add destination'}</button>{initialValue && <button className="button button-subtle" type="button" onClick={onCancel}>Cancel</button>}</div>
    </form>
  )
}
