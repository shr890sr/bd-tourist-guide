import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export function Login() {
  return <AuthForm mode="login" />
}

export function Register() {
  return <AuthForm mode="register" />
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const registering = mode === 'register'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post(`/auth/${mode}`, { email, password })
      signIn(data)
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(axios.isAxiosError(reason) ? reason.response?.data?.detail ?? 'Unable to authenticate.' : 'Unable to authenticate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="eyebrow">BD Tourist Guide</p>
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">{registering ? 'Create your account' : 'Welcome back'}</h1>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">Email
          <input className="rounded-md border border-slate-300 px-3 py-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Password
          <input className="rounded-md border border-slate-300 px-3 py-2" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : registering ? 'Register' : 'Log in'}</button>
      </form>
      <p className="mt-5 text-sm text-slate-600">{registering ? 'Already registered?' : 'New here?'}{' '}
        <Link className="font-semibold text-emerald-800 underline" to={registering ? '/login' : '/register'}>{registering ? 'Log in' : 'Create an account'}</Link>
      </p>
    </main>
  )
}
