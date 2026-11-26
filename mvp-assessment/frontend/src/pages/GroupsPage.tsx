import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { apiErrorMessage, groupApi } from '../api'
import type { GroupRole, UserGroup } from '../types'

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [groupName, setGroupName] = useState('')
  const [inviteEmails, setInviteEmails] = useState<Record<number, string>>({})
  const [inviteRoles, setInviteRoles] = useState<Record<number, GroupRole>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadGroups = useCallback(async () => {
    setError('')
    try {
      setGroups(await groupApi.list())
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadGroups() }, [loadGroups])

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const created = await groupApi.create(groupName.trim())
      setGroups((current) => [created, ...current])
      setGroupName('')
      setNotice('Group created. You are its owner.')
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>, group: UserGroup) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await groupApi.addMember(group.id, (inviteEmails[group.id] ?? '').trim(), inviteRoles[group.id] ?? 'member')
      setGroups((current) => current.map((item) => item.id === updated.id ? updated : item))
      setInviteEmails((current) => ({ ...current, [group.id]: '' }))
      setNotice(`Member added to ${group.name}.`)
    } catch (reason) {
      setError(apiErrorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(group: UserGroup, memberId: number) {
    setError('')
    setNotice('')
    try {
      const updated = await groupApi.removeMember(group.id, memberId)
      setGroups((current) => current.map((item) => item.id === updated.id ? updated : item))
      setNotice(`Member removed from ${group.name}.`)
    } catch (reason) {
      setError(apiErrorMessage(reason))
    }
  }

  async function deleteGroup(group: UserGroup) {
    if (!window.confirm(`Delete ${group.name} and its membership list?`)) return
    setError('')
    setNotice('')
    try {
      await groupApi.remove(group.id)
      setGroups((current) => current.filter((item) => item.id !== group.id))
      setNotice(`${group.name} deleted.`)
    } catch (reason) {
      setError(apiErrorMessage(reason))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Shared spaces</p><h1 className="text-4xl font-semibold text-emerald-950">Groups</h1><p className="mt-2 text-slate-600">Create a group and invite people with admin or member access.</p></div>
        <Link className="button button-subtle" to="/dashboard">Back to dashboard</Link>
      </div>

      {error && <p role="alert" className="alert alert-error mt-5">{error}</p>}
      {notice && <p role="status" className="alert alert-success mt-5">{notice}</p>}

      <form className="form-panel mt-8 max-w-xl" onSubmit={(event) => void createGroup(event)}>
        <div><p className="eyebrow">Start collaborating</p><h2>Create a group</h2></div>
        <label>Group name<input required minLength={2} maxLength={120} value={groupName} onChange={(event) => setGroupName(event.target.value)} /></label>
        <button className="button button-primary w-fit" disabled={busy}>{busy ? 'Saving…' : 'Create group'}</button>
      </form>

      <section className="mt-10" aria-labelledby="your-groups-heading">
        <div className="mb-4 flex items-center justify-between"><h2 id="your-groups-heading" className="text-2xl font-semibold text-emerald-950">Your groups</h2><span className="text-sm text-slate-500">{groups.length} total</span></div>
        {loading ? <p className="text-slate-500">Loading groups…</p> : groups.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-slate-500">You are not a member of any groups yet.</p> : (
          <ul className="grid gap-5">
            {groups.map((group) => {
              const isOwner = group.owner_id === user?.id
              return <li key={group.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="eyebrow">{isOwner ? 'Group owner' : `Owner ID ${group.owner_id}`}</p><h3 className="text-xl font-semibold text-emerald-950">{group.name}</h3><p className="mt-1 text-sm text-slate-500">{group.members.length} members</p></div>
                  {isOwner && <button className="button button-danger" onClick={() => void deleteGroup(group)}>Delete Group</button>}
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Member</th><th className="p-3">Group role</th>{isOwner && <th className="p-3">Action</th>}</tr></thead>
                    <tbody>
                      {group.members.map((member) => <tr className="border-t border-slate-100" key={member.user_id}>
                        <td className="p-3">{member.email}{member.user_id === user?.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td>
                        <td className="p-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{member.role}</span></td>
                        {isOwner && <td className="p-3">{member.user_id !== group.owner_id && <button className="button button-danger" onClick={() => void removeMember(group, member.user_id)}>Remove</button>}</td>}
                      </tr>)}
                    </tbody>
                  </table>
                </div>

                {isOwner && <form className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end" onSubmit={(event) => void inviteMember(event, group)}>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">Invite by email<input className="rounded-md border border-slate-300 bg-white px-3 py-2" type="email" required value={inviteEmails[group.id] ?? ''} onChange={(event) => setInviteEmails((current) => ({ ...current, [group.id]: event.target.value }))} /></label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">Role<select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={inviteRoles[group.id] ?? 'member'} onChange={(event) => setInviteRoles((current) => ({ ...current, [group.id]: event.target.value as GroupRole }))}><option value="member">Member</option><option value="admin">Admin</option></select></label>
                  <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Invite'}</button>
                </form>}
              </li>
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
