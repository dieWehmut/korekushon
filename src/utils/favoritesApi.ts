import {
	addFavorite,
	getUserCollection,
	listFavoriteLinkIds,
	removeFavorite,
	ensureUserCollection as ensureLocalCollection,
	type UserCollectionRow,
} from '../localdb/store'

export type { UserCollectionRow }

type EnsureCollectionParams = {
  userId: string
  categoryId: number
  categoryName: string
}

type AddFavoriteParams = EnsureCollectionParams & {
  linkId: number
}

type RemoveFavoriteParams = {
  userId: string
  categoryId: number
  linkId: number
}

export type AdjustFavoriteResult = {
  collection: UserCollectionRow
  newCount: number | null
}

export async function getUserCollectionFor(userId: string, categoryId: number): Promise<UserCollectionRow | null> {
  return getUserCollection(userId, categoryId)
}

export async function ensureUserCollection({ userId, categoryId, categoryName }: EnsureCollectionParams): Promise<UserCollectionRow> {
  return ensureLocalCollection(userId, categoryId, categoryName)
}

export async function fetchUserFavoritesInCategory(userId: string, categoryId: number) {
  const collection = getUserCollection(userId, categoryId)
  if (!collection) {
    return { collection: null as UserCollectionRow | null, linkIds: [] as number[] }
  }
  return { collection, linkIds: listFavoriteLinkIds(userId, categoryId) }
}

export async function addFavoriteToCollection({
  userId,
  categoryId,
  categoryName,
  linkId,
}: AddFavoriteParams): Promise<AdjustFavoriteResult> {
  const collection = ensureLocalCollection(userId, categoryId, categoryName)
  const newCount = addFavorite(userId, categoryId, categoryName, linkId)
  return { collection, newCount }
}

export async function removeFavoriteFromCollection({ userId, categoryId, linkId }: RemoveFavoriteParams): Promise<number | null> {
  return removeFavorite(userId, categoryId, linkId)
}
