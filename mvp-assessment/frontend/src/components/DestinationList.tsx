import type { Destination } from '../types'

interface Props {
  destinations: Destination[]
  selectedId: number | null
  onSelect: (id: number) => void
  onEdit: (destination: Destination) => void
  onDelete: (destination: Destination) => void
}

export function DestinationList({ destinations, selectedId, onSelect, onEdit, onDelete }: Props) {
  if (destinations.length === 0) {
    return <div className="empty-state">No destinations yet. Add one to start your guide.</div>
  }

  return (
    <div className="destination-grid">
      {destinations.map((destination) => (
        <article className={`destination-card ${selectedId === destination.id ? 'is-selected' : ''}`} key={destination.id}>
          <button className="card-select" onClick={() => onSelect(destination.id)} aria-label={`View ${destination.name}`}>
            {destination.image_url ? (
              <img src={destination.image_url} alt={destination.name} loading="lazy" />
            ) : (
              <div className="image-placeholder" aria-hidden="true">BD</div>
            )}
            <span className="card-location">{destination.location}</span>
            <strong>{destination.name}</strong>
            <span className="card-description">{destination.description}</span>
          </button>
          <div className="card-actions">
            <button className="button button-subtle" onClick={() => onEdit(destination)}>Edit</button>
            <button className="button button-danger" onClick={() => onDelete(destination)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  )
}
