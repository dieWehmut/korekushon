import {
	listCategories,
	listLinks,
	listComments,
	listUserCollections,
	listUserCollectionItems,
	type Category,
	type Comment,
	type Link,
} from '../localdb/store'

export type UserCollection = {
	id: number
	name: string
	category_id: number | null
}

export type UserCollectionItem = {
	collection_id: number
	links: Link | Link[] | null
}

export type PrefetchedData = {
	categories: Category[]
	links: Link[]
	comments: Comment[]
	fetchedAt: number
}

export type PrefetchedUserData = {
	userCollections: UserCollection[]
	userCollectionItems: Array<{ collection_id: number; links: Link | Link[] | null }>
	fetchedAt: number
}

let globalCache: PrefetchedData | null = null
let globalInFlight: Promise<PrefetchedData> | null = null

let userCache: PrefetchedUserData | null = null
let userInFlight: Promise<PrefetchedUserData> | null = null
let cachedForUserId: string | null = null

export function getPrefetchedData(): PrefetchedData | null {
	return globalCache
}

export function getPrefetchedUserData(): PrefetchedUserData | null {
	return userCache
}

export function getPrefetchedComments(categoryId: number | null, linkId: number | null) {
	if (!globalCache) return null
	return globalCache.comments.filter((c) => {
		const sameCategory = (c.category_id ?? null) === categoryId
		const sameLink = (c.link_id ?? null) === linkId
		return sameCategory && sameLink
	})
}

export function getPrefetchedLinks(categoryId: number): Link[] | null {
	if (!globalCache) return null
	return globalCache.links.filter((l) => l.category_id === categoryId)
}

export async function ensurePrefetch(): Promise<PrefetchedData> {
	if (globalCache) return globalCache
	if (globalInFlight) return globalInFlight
	globalInFlight = Promise.resolve().then(() => {
		globalCache = {
			categories: listCategories(),
			links: listLinks(),
			comments: listComments(),
			fetchedAt: Date.now(),
		}
		globalInFlight = null
		return globalCache
	})
	return globalInFlight
}

export async function ensureUserPrefetch(userId: string): Promise<PrefetchedUserData> {
	if (userCache && cachedForUserId === userId) return userCache
	if (userInFlight && cachedForUserId === userId) return userInFlight

	cachedForUserId = userId
	userInFlight = Promise.resolve().then(() => {
		const collections = listUserCollections(userId)
		const linksById = new Map(listLinks().map((link) => [link.id, link]))
		const collectionItems = listUserCollectionItems(userId)
			.map((item) => ({ collection_id: item.collection_id, links: linksById.get(item.link_id) ?? null }))
			.filter((item) => item.links != null)
		userCache = {
			userCollections: collections,
			userCollectionItems: collectionItems,
			fetchedAt: Date.now(),
		}
		userInFlight = null
		return userCache
	})
	return userInFlight
}

export function invalidatePrefetch() {
	globalCache = null
	globalInFlight = null
	// Also invalidate user data as it might depend on global data (e.g. links)
	invalidateUserPrefetch()
}

export function invalidateUserPrefetch() {
	userCache = null
	userInFlight = null
	cachedForUserId = null
}
