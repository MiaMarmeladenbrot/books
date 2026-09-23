import { useState, type ReactElement, type SyntheticEvent } from 'react'
import { LogOut, Pencil } from 'lucide-react'
import { useAuth } from '../store/useAuth'
import { useBooks } from '../store/useBooks'
import { useProfile } from '../store/useProfile'
import { Avatar, DEFAULT_AVATAR } from '../components/Avatar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ExportPanel } from '../components/ExportPanel'
import { Panel } from '../components/Panel'
import { PasswordField } from '../components/PasswordField'
import { auth } from '../lib/supabase'
import { refusalText, tooShort } from '../lib/password'
import { m } from '../paraglide/messages.js'
import { getLocale, locales, setLocale } from '../paraglide/runtime.js'
import { AVATAR_LABEL, AVATAR_ORDER, languageLabel } from '../types'
import type { AvatarName } from '../types'

const fieldClass =
  'border-line bg-card focus:border-accent w-full rounded-xl border px-3.5 py-3 text-base outline-none'
const labelClass = 'text-ink-2 mb-1.5 block text-xs font-semibold'
const quietButtonClass =
  'border-line bg-paper text-ink flex-1 rounded-xl border py-3 text-sm font-semibold'
const strongButtonClass =
  'bg-accent flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60'

const FLAGS: Record<string, ReactElement> = {
  de: (
    <>
      <rect width="20" height="14" fill="#000" />
      <rect y="4.67" width="20" height="4.66" fill="#dd0000" />
      <rect y="9.33" width="20" height="4.67" fill="#ffce00" />
    </>
  ),
  'en-GB': (
    <>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" strokeWidth="3.4" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.7" />
      <path d="M10 0 V14 M0 7 H20" stroke="#fff" strokeWidth="5.4" />
      <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="3.2" />
    </>
  ),
}

function Flag({ locale }: { locale: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      width={20}
      height={14}
      aria-hidden
      className="border-ink/15 shrink-0 rounded-xs border"
    >
      {FLAGS[locale]}
    </svg>
  )
}

export function Profile() {
  const { user, signOut } = useAuth()
  const { books } = useBooks()
  const { profile, saveProfile } = useProfile()

  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState<AvatarName>(DEFAULT_AVATAR)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [changing, setChanging] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordDone, setPasswordDone] = useState(false)

  const [leaving, setLeaving] = useState(false)

  const startEditing = () => {
    setDisplayName(profile?.display_name ?? '')
    setAvatar(profile?.avatar ?? DEFAULT_AVATAR)
    setSaveError('')
    setEditing(true)
  }

  const handleSave = async (event: SyntheticEvent) => {
    event.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await saveProfile({
        display_name: displayName.trim() === '' ? null : displayName.trim(),
        avatar,
      })
      setEditing(false)
    } catch {
      setSaveError(m.error_save_failed())
    }
    setSaving(false)
  }

  const handlePassword = async (event: SyntheticEvent) => {
    event.preventDefault()
    setPasswordError('')
    const short = tooShort(nextPassword)
    if (short) {
      setPasswordError(short)
      return
    }
    setPasswordBusy(true)
    const { error: wrongPassword } = await auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    })
    if (wrongPassword) {
      setPasswordError(m.error_password_wrong())
      setPasswordBusy(false)
      return
    }
    const { error: refused } = await auth.updateUser({ password: nextPassword })
    if (refused) setPasswordError(refusalText(refused))
    else {
      setPasswordDone(true)
      setChanging(false)
      setCurrentPassword('')
      setNextPassword('')
    }
    setPasswordBusy(false)
  }

  const shownAvatar = editing ? avatar : (profile?.avatar ?? null)

  return (
    <div className="pb-28">
      <header className="border-line sticky top-0 z-10 border-b bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">{m.profile_title()}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-6">
        <div className="mb-7 flex items-center gap-5">
          <Avatar name={shownAvatar} size={80} className="shrink-0" />
          <div className="min-w-0 grow">
            <p className="font-serif truncate text-2xl leading-tight font-semibold tracking-tight">
              {profile?.display_name ?? m.profile_no_name()}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setLeaving(true)}
              aria-label={m.profile_sign_out()}
              className="border-line text-ink-3 flex size-10 items-center justify-center rounded-xl border"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                aria-label={m.profile_edit()}
                className="border-accent text-accent flex size-10 items-center justify-center rounded-xl border"
              >
                <Pencil size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {editing && (
          <Panel title={m.profile_edit_panel()}>
            <form onSubmit={handleSave}>
              <span className={labelClass}>{m.profile_avatar()}</span>
              <div className="mb-5 flex flex-wrap gap-2">
                {AVATAR_ORDER.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAvatar(name)}
                    aria-label={AVATAR_LABEL[name]()}
                    aria-pressed={avatar === name}
                    className={`rounded-full p-1 ${avatar === name ? 'ring-accent ring-2' : ''}`}
                  >
                    <Avatar name={name} size={44} className="block" />
                  </button>
                ))}
              </div>

              <label className="block">
                <span className={labelClass}>{m.profile_display_name()}</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={40}
                  placeholder={m.profile_display_name_placeholder()}
                  className={fieldClass}
                />
              </label>

              {saveError && <p className="text-danger mt-3 text-sm">{saveError}</p>}

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={quietButtonClass}
                >
                  {m.action_cancel()}
                </button>
                <button type="submit" disabled={saving} className={strongButtonClass}>
                  {saving ? m.action_busy() : m.action_save()}
                </button>
              </div>
            </form>
          </Panel>
        )}

        <Panel title={m.profile_account()}>
          <span className={labelClass}>{m.label_email()}</span>
          <p className="text-ink text-sm break-all">{user?.email}</p>

          {changing ? (
            <form onSubmit={handlePassword} className="border-line mt-4 border-t pt-4">
              <label className="mb-4 block">
                <span className={labelClass}>{m.profile_current_password()}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
              <PasswordField
                label={m.profile_new_password()}
                value={nextPassword}
                onChange={setNextPassword}
              />

              {passwordError && <p className="text-danger mt-3 text-sm">{passwordError}</p>}

              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setChanging(false)}
                  className={quietButtonClass}
                >
                  {m.action_cancel()}
                </button>
                <button type="submit" disabled={passwordBusy} className={strongButtonClass}>
                  {passwordBusy ? m.action_busy() : m.profile_change()}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPasswordDone(false)
                setChanging(true)
              }}
              className="text-accent mt-4 text-sm font-semibold"
            >
              {m.profile_change_password()}
            </button>
          )}

          {passwordDone && <p className="text-leaf mt-3 text-sm">{m.profile_password_changed()}</p>}
        </Panel>

        <Panel title={m.label_language()}>
          <div className="flex flex-wrap gap-2">
            {locales.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === getLocale()}
                onClick={() => void setLocale(option)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  option === getLocale()
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper text-ink-2'
                }`}
              >
                <Flag locale={option} />
                {languageLabel(new Intl.Locale(option).language)}
              </button>
            ))}
          </div>
        </Panel>

        <ExportPanel books={books} />
      </main>

      <ConfirmDialog
        open={leaving}
        title={m.profile_sign_out_title()}
        description={m.profile_sign_out_body()}
        confirmLabel={m.profile_sign_out()}
        onConfirm={() => void signOut()}
        onCancel={() => setLeaving(false)}
      />
    </div>
  )
}
