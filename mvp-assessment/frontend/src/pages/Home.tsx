import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="eyebrow">BD Tourist Guide</p>
      <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-emerald-950">Find your next Bangladesh story.</h1>
      <p className="mt-5 max-w-xl text-slate-600">Explore places across Bangladesh and keep your travel plans in one place.</p>
      <div className="mt-8 flex gap-3"><Link className="button button-primary" to="/register">Get started</Link><Link className="button button-subtle" to="/login">Log in</Link><Link className="button button-subtle" to="/destinations">Browse destinations</Link></div>
    </main>
  )
}
