import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { adminApi, apiErrorMessage } from '../api'
import type { AdminUser, AuditLog } from '../types'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users')
  const [error, setError] = useState('')

  const loadUsers = useCallback(async () => {
    setError('')
    try {
      setUsers(await adminApi.users())
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadUsers() }, [loadUsers])

  async function showLogs() {
    setActiveTab('logs')
    setError('')
    setLogsLoading(true)
    try {
      setLogs(await adminApi.auditLogs())
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setLogsLoading(false)
    }
  }

  async function toggleBan(target: AdminUser) {
    setError('')
    try {
      // The backend flips is_banned and independently enforces the no-admin-ban rule.
      const updated = await adminApi.toggleBan(target.id)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(apiErrorMessage(reason))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Administration</p><h1 className="text-4xl font-semibold text-emerald-950">Admin Dashboard</h1><p className="mt-2 text-slate-600">Manage user access for this application.</p></div>
        <Link className="button button-subtle" to="/dashboard">Back to dashboard</Link>
      </div>
      {error && <p role="alert" className="alert alert-error mt-5">{error}</p>}
      <nav className="mt-8 flex gap-2" aria-label="Admin sections">
        <button className={activeTab === 'users' ? 'button button-primary' : 'button button-subtle'} aria-pressed={activeTab === 'users'} onClick={() => setActiveTab('users')}>Users</button>
        <button className={activeTab === 'logs' ? 'button button-primary' : 'button button-subtle'} aria-pressed={activeTab === 'logs'} onClick={() => void showLogs()}>Activity Logs</button>
      </nav>
      {activeTab === 'users' && <section className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading ? <p className="p-5 text-slate-500">Loading users…</p> : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
            <tbody>
              {users.map((target) => {
                const self = target.id === user?.id
                const cannotBanAdmin = target.role === 'admin' && !target.is_banned
                const disabled = self || cannotBanAdmin
                return <tr className="border-t border-slate-100" key={target.id}>
                  <td className="p-4"><span className="font-medium text-slate-900">{target.email}</span>{self && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td>
                  <td className="p-4">{target.role}</td>
                  <td className="p-4"><span className={target.is_banned ? 'text-red-700' : 'text-emerald-800'}>{target.is_banned ? 'Banned' : 'Active'}</span></td>
                  <td className="p-4"><button className={target.is_banned ? 'button button-primary' : 'button button-danger'} disabled={disabled} title={disabled ? 'Admins cannot ban themselves or another admin.' : undefined} onClick={() => void toggleBan(target)}>{target.is_banned ? 'Unban' : 'Ban'}</button></td>
                </tr>
              })}
              {users.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={4}>No users found.</td></tr>}
            </tbody>
          </table>
        )}
      </section>}
      {activeTab === 'logs' && <section className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {logsLoading ? <p className="p-5 text-slate-500">Loading activity logs…</p> : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Who</th><th className="p-4">Action</th><th className="p-4">Details</th><th className="p-4">When</th><th className="p-4">IP address</th></tr></thead>
            <tbody>
              {logs.map((log) => <tr className="border-t border-slate-100" key={log.id}>
                <td className="p-4">{log.user_email ?? (log.user_id ? `User #${log.user_id}` : 'Unknown user')}</td>
                <td className="p-4"><span className="font-medium text-emerald-900">{log.action.replaceAll('_', ' ')}</span></td>
                <td className="p-4">{log.details}</td>
                <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-4">{log.ip_address ?? '—'}</td>
              </tr>)}
              {logs.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={5}>No activity logged yet.</td></tr>}
            </tbody>
          </table>
        )}
      </section>}
    </main>
  )
}
