import { useEffect, useState } from 'react'
import { signOut } from '../localdb/store'
import { getSavedTheme, setTheme, setAvatarUrl, clearAvatarUrl } from '../utils/theme'
import '../styles/Settings.css'

type Props = {
  user: { id: string; email?: string } | null
}

export default function Settings({ user }: Props) {
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [theme, setThemeState] = useState(getSavedTheme())

  useEffect(() => {
    // Local mode: profile fields live in this browser only.
    const stored = localStorage.getItem('korekushon.localdb.profile')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { username?: string; avatarUrl?: string | null }
        if (parsed.username) setUsername(parsed.username)
        if (parsed.avatarUrl) setAvatarPreview(parsed.avatarUrl)
      } catch {
        // ignore malformed profile
      }
    }
  }, [user])

  // Keep local `theme` state in sync with global theme changes
  useEffect(() => {
    const onThemeChanged = (ev: Event) => {
      try {
        type ThemeDetail = { saved?: string; applied?: string }
        const ce = ev as CustomEvent<ThemeDetail>
        const saved = ce.detail?.saved
        const applied = ce.detail?.applied
        if (saved === 'light' || saved === 'dark' || saved === 'system') setThemeState(saved)
        else if (applied === 'light' || applied === 'dark') setThemeState(applied as 'light' | 'dark')
      } catch {
        // ignore
      }
    }
    document.addEventListener('app:theme-changed', onThemeChanged as EventListener)
    return () => document.removeEventListener('app:theme-changed', onThemeChanged as EventListener)
  }, [])

  const persistProfile = (patch: { username?: string; avatarUrl?: string | null }) => {
    try {
      const raw = localStorage.getItem('korekushon.localdb.profile')
      const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      localStorage.setItem('korekushon.localdb.profile', JSON.stringify({ ...current, ...patch }))
    } catch {
      // ignore storage errors
    }
  }

  if (!user) {
    return (
      <div className="settings-wrap">
        <h2>设置</h2>
        <section>
          <h3>主题</h3>
          <div className="segmented">
            <button className={theme === 'light' ? 'active' : ''} onClick={() => { setTheme('light'); setThemeState('light') }}>亮色主题</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => { setTheme('dark'); setThemeState('dark') }}>暗色主题</button>
            <button className={theme === 'system' ? 'active' : ''} onClick={() => { setTheme('system'); setThemeState('system') }}>跟随系统</button>
          </div>
        </section>
        <div className="muted"></div>
        <div className="auth-cta-wrap">
          <button className="auth-cta" onClick={() => document.dispatchEvent(new CustomEvent('app:open-auth'))}>登录 / 注册</button>
        </div>
      </div>
    )
  }

  const saveUsername = () => {
    const u = username.trim()
    if (!u) return alert('用户名不能为空')
    persistProfile({ username: u })
    document.dispatchEvent(new CustomEvent('app:username-updated', { detail: { username: u } }))
    alert('用户名已更新')
  }

  const onUploadAvatar = async (file: File) => {
    setLoading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
        reader.readAsDataURL(file)
      })
      setAvatarPreview(dataUrl)
      persistProfile({ avatarUrl: dataUrl })
      setAvatarUrl(dataUrl)
      document.dispatchEvent(new CustomEvent('app:avatar-updated', { detail: { url: dataUrl } }))
    } catch (error) {
      alert(error instanceof Error ? error.message : '头像上传失败')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await signOut()
      clearAvatarUrl()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-wrap">
      <h2>设置</h2>

      {/* 1: Theme (always shown) */}
      <section>
        <h3>主题</h3>
        <div className="segmented">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => { setTheme('light'); setThemeState('light') }}>亮色主题</button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => { setTheme('dark'); setThemeState('dark') }}>暗色主题</button>
          <button className={theme === 'system' ? 'active' : ''} onClick={() => { setTheme('system'); setThemeState('system') }}>跟随系统</button>
        </div>
      </section>

      {/* 2: Avatar (left) + Username (right) in the same card */}
      <section className="profile-card">
        <div className="avatar-row">
          <div className="avatar-preview">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" />
            ) : (
              <div className="avatar-fallback">头像</div>
            )}
          </div>
          <div className="profile-forms">
            <div className="row">
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="新的用户名" />
              <button onClick={saveUsername} disabled={loading}>保存</button>
            </div>
            <div className="avatar-actions">
              <label className="upload-btn">
                <input type="file" accept="image/*" onChange={e => e.target.files && e.target.files[0] && onUploadAvatar(e.target.files[0])} />
                上传头像
              </label>
            </div>
            <div className="muted">资料仅保存在当前浏览器。</div>
          </div>
        </div>
      </section>

      {/* 3: Logout button */}
      <section className="logout-card">
        <button className="danger" onClick={logout} disabled={loading}>退出登录</button>
      </section>
    </div>
  )
}
