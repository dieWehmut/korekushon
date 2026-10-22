// Local-only data layer.
//
// This project used to talk to Supabase. It now runs entirely in the browser
// with localStorage, so the site can be built and served as a plain static
// GitHub Pages deployment without any backend or credentials.

// ---------------------------------------------------------------------------
// Types (shape kept compatible with the previous Supabase schema)
// ---------------------------------------------------------------------------

export type UserProfile = {
	id: string
	username: string
	email: string
	created_at?: string
}

export type Category = {
	id: number
	name: string
	description?: string | null
	created_at?: string
}

export type Link = {
	id: number
	category_id: number
	title: string
	url: string
	featured?: boolean
	favorite_count?: number | null
	created_at?: string
}

export type Comment = {
	id: number
	content: string
	author_id: string | null
	author_name?: string | null
	author_email?: string | null
	category_id: number | null
	link_id: number | null
	parent_id?: number | null
	created_at?: string
}

export type UserCollection = {
	id: number
	user_id: string
	name: string
	category_id: number | null
}

export type UserCollectionItem = {
	id: number
	collection_id: number
	link_id: number
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'korekushon.localdb.v1'

type Database = {
	version: 1
	categories: Category[]
	links: Link[]
	comments: Comment[]
	collections: UserCollection[]
	collectionItems: UserCollectionItem[]
}

type Listener = () => void

function now() {
	return new Date().toISOString()
}

function nextId(rows: Array<{ id: number }>): number {
	return rows.reduce((max, row) => (row.id > max ? row.id : max), 0) + 1
}

function createEmptyDb(): Database {
	return {
		version: 1,
		categories: [],
		links: [],
		comments: [],
		collections: [],
		collectionItems: [],
	}
}

function load(): Database {
	if (typeof localStorage === 'undefined') return createEmptyDb()
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return createEmptyDb()
		const parsed = JSON.parse(raw) as Partial<Database>
		const empty = createEmptyDb()
		return {
			version: 1,
			categories: Array.isArray(parsed.categories) ? parsed.categories : empty.categories,
			links: Array.isArray(parsed.links) ? parsed.links : empty.links,
			comments: Array.isArray(parsed.comments) ? parsed.comments : empty.comments,
			collections: Array.isArray(parsed.collections) ? parsed.collections : empty.collections,
			collectionItems: Array.isArray(parsed.collectionItems) ? parsed.collectionItems : empty.collectionItems,
		}
	} catch (error) {
		console.warn('[localdb] failed to read storage, starting fresh', error)
		return createEmptyDb()
	}
}

let db: Database = load()
const listeners = new Set<Listener>()

function persist() {
	if (typeof localStorage === 'undefined') return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
	} catch (error) {
		console.warn('[localdb] failed to write storage', error)
	}
	listeners.forEach((listener) => {
		try {
			listener()
		} catch (error) {
			console.error('[localdb] listener error', error)
		}
	})
}

/** Subscribe to any local database change. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

// ---------------------------------------------------------------------------
// Auth (local demo accounts)
// ---------------------------------------------------------------------------

const SESSION_KEY = 'korekushon.localdb.session'

export type LocalUser = {
	id: string
	email: string
	user_metadata: { username?: string | null }
}

export type LocalSession = { user: LocalUser } | null

function readSession(): LocalSession {
	if (typeof localStorage === 'undefined') return null
	try {
		const raw = localStorage.getItem(SESSION_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as LocalSession
		if (!parsed || typeof parsed !== 'object' || !parsed.user) return null
		return parsed
	} catch {
		return null
	}
}

function writeSession(session: LocalSession) {
	if (typeof localStorage === 'undefined') return
	try {
		if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
		else localStorage.removeItem(SESSION_KEY)
	} catch (error) {
		console.warn('[localdb] failed to persist session', error)
	}
}

function makeId(): string {
	const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined
	if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
	return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function getUser(): Promise<LocalUser | null> {
	return readSession()?.user ?? null
}

export async function signIn(email: string, username?: string): Promise<LocalUser> {
	const user: LocalUser = {
		id: makeId(),
		email,
		user_metadata: { username: username ?? email.split('@')[0] },
	}
	writeSession({ user })
	notifySessionChanged()
	return user
}

export async function signOut() {
	writeSession(null)
	notifySessionChanged()
}

/** Tell the app to re-read the local session (fired on sign in / sign out). */
export function notifySessionChanged() {
	if (typeof document === 'undefined') return
	document.dispatchEvent(new CustomEvent('app:session-changed'))
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function listCategories(): Category[] {
	return [...db.categories].sort((a, b) => a.id - b.id)
}

export function createCategory(name: string): Category {
	const row: Category = { id: nextId(db.categories), name, created_at: now() }
	db = { ...db, categories: [...db.categories, row] }
	persist()
	return row
}

export function renameCategory(id: number, name: string): Category | null {
	let updated: Category | null = null
	db = {
		...db,
		categories: db.categories.map((row) => {
			if (row.id !== id) return row
			updated = { ...row, name }
			return updated
		}),
	}
	persist()
	return updated
}

export function deleteCategory(id: number): void {
	const linkIds = new Set(db.links.filter((link) => link.category_id === id).map((link) => link.id))
	db = {
		...db,
		categories: db.categories.filter((row) => row.id !== id),
		links: db.links.filter((link) => link.category_id !== id),
		comments: db.comments.filter(
			(comment) => comment.category_id !== id && !(comment.link_id != null && linkIds.has(comment.link_id)),
		),
		collections: db.collections.filter((collection) => collection.category_id !== id),
	}
	persist()
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function listLinks(): Link[] {
	return [...db.links].sort((a, b) => a.category_id - b.category_id || a.id - b.id)
}

export function createLink(input: { category_id: number; title: string; url: string }): Link {
	const row: Link = {
		id: nextId(db.links),
		category_id: input.category_id,
		title: input.title,
		url: input.url,
		featured: false,
		favorite_count: 0,
		created_at: now(),
	}
	db = { ...db, links: [...db.links, row] }
	persist()
	return row
}

export function updateLink(id: number, patch: Partial<Pick<Link, 'title' | 'url' | 'featured' | 'favorite_count'>>): void {
	db = { ...db, links: db.links.map((row) => (row.id === id ? { ...row, ...patch } : row)) }
	persist()
}

export function deleteLink(id: number): void {
	db = {
		...db,
		links: db.links.filter((row) => row.id !== id),
		comments: db.comments.filter((comment) => comment.link_id !== id),
		collectionItems: db.collectionItems.filter((item) => item.link_id !== id),
	}
	persist()
}

function adjustFavoriteCount(linkId: number, delta: number): number | null {
	let count: number | null = null
	db = {
		...db,
		links: db.links.map((row) => {
			if (row.id !== linkId) return row
			const base = typeof row.favorite_count === 'number' ? row.favorite_count : 0
			count = Math.max(0, base + delta)
			return { ...row, favorite_count: count }
		}),
	}
	persist()
	return count
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function listComments(): Comment[] {
	return [...db.comments].sort((a, b) => {
		const at = a.created_at ? new Date(a.created_at).getTime() : 0
		const bt = b.created_at ? new Date(b.created_at).getTime() : 0
		return at - bt
	})
}

export function listCommentsFor(categoryId: number | null, linkId: number | null): Comment[] {
	return listComments().filter(
		(comment) => (comment.category_id ?? null) === categoryId && (comment.link_id ?? null) === linkId,
	)
}

export function createComment(input: Omit<Comment, 'id' | 'created_at'>): Comment {
	const row: Comment = { ...input, id: nextId(db.comments), created_at: now() }
	db = { ...db, comments: [...db.comments, row] }
	persist()
	return row
}

export function deleteComment(id: number): void {
	const doomed = new Set<number>([id])
	let changed = true
	while (changed) {
		changed = false
		for (const comment of db.comments) {
			if (comment.parent_id != null && doomed.has(comment.parent_id) && !doomed.has(comment.id)) {
				doomed.add(comment.id)
				changed = true
			}
		}
	}
	db = { ...db, comments: db.comments.filter((comment) => !doomed.has(comment.id)) }
	persist()
}

export function countComments(categoryId?: number | null, linkId?: number | null): number {
	return db.comments.filter((comment) => {
		if (categoryId !== undefined && (comment.category_id ?? null) !== categoryId) return false
		if (linkId !== undefined && (comment.link_id ?? null) !== linkId) return false
		return true
	}).length
}

export type CommentsFilter = {
	categoryId?: number | null
	linkId?: number | null
}

export function buildCommentsFilter({ categoryId, linkId }: CommentsFilter): string {
	const parts: string[] = []
	if (categoryId === null) parts.push('category_id=is.null')
	else if (typeof categoryId === 'number') parts.push(`category_id=eq.${categoryId}`)
	if (linkId === null) parts.push('link_id=is.null')
	else if (typeof linkId === 'number') parts.push(`link_id=eq.${linkId}`)
	return parts.join(',')
}

// ---------------------------------------------------------------------------
// Collections / favorites
// ---------------------------------------------------------------------------

export type UserCollectionRow = {
	id: number
	name: string
	category_id: number | null
}

export function getUserCollection(userId: string, categoryId: number): UserCollectionRow | null {
	const found = db.collections.find(
		(collection) => collection.user_id === userId && collection.category_id === categoryId,
	)
	return found ? { id: found.id, name: found.name, category_id: found.category_id } : null
}

export function ensureUserCollection(userId: string, categoryId: number, categoryName: string): UserCollectionRow {
	const existing = getUserCollection(userId, categoryId)
	if (existing) return existing
	const row: UserCollection = {
		id: nextId(db.collections),
		user_id: userId,
		name: categoryName,
		category_id: categoryId,
	}
	db = { ...db, collections: [...db.collections, row] }
	persist()
	return { id: row.id, name: row.name, category_id: row.category_id }
}

export function listUserCollections(userId: string): UserCollectionRow[] {
	return db.collections
		.filter((collection) => collection.user_id === userId)
		.map((collection) => ({ id: collection.id, name: collection.name, category_id: collection.category_id }))
}

export function listUserCollectionItems(userId: string): Array<{ collection_id: number; link_id: number }> {
	const ids = new Set(db.collections.filter((collection) => collection.user_id === userId).map((c) => c.id))
	return db.collectionItems
		.filter((item) => ids.has(item.collection_id))
		.map((item) => ({ collection_id: item.collection_id, link_id: item.link_id }))
}

export function listFavoriteLinkIds(userId: string, categoryId: number): number[] {
	const collection = getUserCollection(userId, categoryId)
	if (!collection) return []
	return db.collectionItems.filter((item) => item.collection_id === collection.id).map((item) => item.link_id)
}

export function addFavorite(userId: string, categoryId: number, categoryName: string, linkId: number): number | null {
	const collection = ensureUserCollection(userId, categoryId, categoryName)
	const exists = db.collectionItems.some(
		(item) => item.collection_id === collection.id && item.link_id === linkId,
	)
	if (exists) {
		const link = db.links.find((row) => row.id === linkId)
		return typeof link?.favorite_count === 'number' ? link.favorite_count : null
	}
	const item: UserCollectionItem = {
		id: nextId(db.collectionItems),
		collection_id: collection.id,
		link_id: linkId,
	}
	db = { ...db, collectionItems: [...db.collectionItems, item] }
	persist()
	return adjustFavoriteCount(linkId, 1)
}

export function removeFavorite(userId: string, categoryId: number, linkId: number): number | null {
	const collection = getUserCollection(userId, categoryId)
	if (!collection) return null
	const before = db.collectionItems.length
	db = {
		...db,
		collectionItems: db.collectionItems.filter(
			(item) => !(item.collection_id === collection.id && item.link_id === linkId),
		),
	}
	if (db.collectionItems.length === before) return null
	persist()
	return adjustFavoriteCount(linkId, -1)
}

// ---------------------------------------------------------------------------
// Overview helpers
// ---------------------------------------------------------------------------

export function fetchCommentsOverview() {
	const categories = listCategories()
	const perCategory = categories.map((category) => ({
		id: category.id,
		name: category.name,
		commentsCount: db.comments.filter((comment) => comment.category_id === category.id).length,
		linksCount: db.links.filter((link) => link.category_id === category.id).length,
	}))

	const linkMap = new Map(db.links.map((link) => [link.id, link]))
	const categoryMap = new Map(categories.map((category) => [category.id, category]))

	const indexMap = new Map<number, number>()
	const grouped = new Map<number, Link[]>()
	for (const link of listLinks()) {
		const arr = grouped.get(link.category_id) ?? []
		arr.push(link)
		grouped.set(link.category_id, arr)
	}
	for (const arr of grouped.values()) {
		arr.sort((a, b) => a.id - b.id)
		arr.forEach((link, index) => indexMap.set(link.id, index + 1))
	}

	const recent = [...db.comments]
		.sort((a, b) => b.id - a.id)
		.slice(0, 3)
		.map((comment) => {
			const link = comment.link_id != null ? linkMap.get(comment.link_id) : undefined
			const category = comment.category_id != null ? categoryMap.get(comment.category_id) : undefined
			return {
				...comment,
				category_name: comment.category_id ? (category?.name ?? '已删除栏目') : '首页',
				link_title: comment.link_id ? (link?.title ?? '已删除内容') : '',
				link_url: comment.link_id ? (link?.url ?? '') : '',
				link_index: comment.link_id ? (indexMap.get(comment.link_id) ?? 0) : 0,
			}
		})

	return {
		total: db.comments.length,
		perCategory,
		recent,
	}
}

/** Reset every locally stored row. Useful from the UI or the console. */
export function resetLocalData() {
	db = createEmptyDb()
	persist()
}
