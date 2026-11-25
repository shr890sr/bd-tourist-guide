import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Discover Bangladesh</p>
          <h1>Find your next <em>Bangladesh story.</em></h1>
          <p className="hero-copy">Explore places across Bangladesh and keep your travel plans in one place.</p>
          <div className="flex flex-wrap gap-3">
            <Link className="button button-light" to="/destinations">Explore destinations</Link>
            <Link className="button button-subtle" to="/register">Get started</Link>
          </div>
        </div>
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <span className="hero-coordinate" aria-hidden="true">20.85 N / 90.27 E</span>
      </section>
    </main>
  )
}
