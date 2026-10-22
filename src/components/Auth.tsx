import { useState } from 'react'
import { signIn } from '../localdb/store'

type Props = { onClose: () => void; onAuthed: () => void; recovering?: boolean }

// Local-only sign in. This deployment has no backend, so accounts are just a
// display name kept in localStorage; nothing is sent anywhere.
export default function Auth({ onClose, onAuthed, recovering }: Props) {
	const [identifier, setIdentifier] = useState('')
	const [password, setPassword] = useState('')
	const [message, setMessage] = useState<string | null>(null)

	const doLogin = async () => {
		const value = identifier.trim()
		if (!value) return setMessage('请输入用户名或邮箱')
		const email = /.+@.+\..+/.test(value) ? value : `${value}@local`
		await signIn(email, value.split('@')[0])
		onAuthed()
	}

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<div className="auth-tabs">
						<button className="auth-tab active">登录</button>
					</div>
					<button className="close" onClick={onClose}>×</button>
				</div>
				<div className="modal-body">
					{recovering && <div className="message">本地演示模式：无需密码即可进入。</div>}
					<div className="form-row">
						<label>用户名或邮箱</label>
						<input
							value={identifier}
							onChange={(e) => setIdentifier(e.target.value)}
							placeholder="用户名或邮箱"
							onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
						/>
					</div>
					<div className="form-row">
						<label>密码</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="本地演示，任意密码"
							onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
						/>
					</div>
					<div className="message muted">数据只保存在当前浏览器本地，不会上传到服务器。</div>
					{message && <div className="message">{message}</div>}
				</div>
				<div className="modal-footer">
					<button className="primary" onClick={doLogin}>进入</button>
				</div>
			</div>
		</div>
	)
}
