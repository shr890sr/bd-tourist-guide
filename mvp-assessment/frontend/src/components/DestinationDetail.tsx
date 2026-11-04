import type { Destination } from '../types'

interface Props {
  destination: Destination | null
  onEdit: (destination: Destination) => void
}

export function DestinationDetail({ destination, onEdit }: Props) {
  if (!destination) {
    return <section className="detail-panel detail-empty"><p>Select a destination to see its details.</p></section>
  }

  return (
    <section className="detail-panel" aria-live="polite">
      <div className="detail-heading">
        <div><p className="eyebrow">Destination details</p><h2>{destination.name}</h2></div>
        <button className="button button-light" onClick={() => onEdit(destination)}>Edit details</button>
      </div>
      <p className="detail-location">⌖ &nbsp;{destination.location}</p>
      {destination.image_url && <img className="detail-image" src={destination.image_url} alt={destination.name} />}
      <p className="detail-description">{destination.description}</p>
      <span className="detail-id">Destination #{destination.id}</span>
    </section>
  )
}
