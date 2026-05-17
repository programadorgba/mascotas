import { supabase } from './supabaseClient.js'

export const PET_PHOTOS_BUCKET = 'pet-photos'
export const PET_PHOTO_SIGNED_URL_TTL = 3600

function getStoragePath(photoUrl) {
  if (!photoUrl) return ''

  try {
    const url = new URL(photoUrl)
    const publicPrefix = `/storage/v1/object/public/${PET_PHOTOS_BUCKET}/`
    const signedPrefix = `/storage/v1/object/sign/${PET_PHOTOS_BUCKET}/`
    const matchingPrefix = [publicPrefix, signedPrefix].find((prefix) => url.pathname.includes(prefix))

    if (!matchingPrefix) return photoUrl

    const [, path] = url.pathname.split(matchingPrefix)
    return decodeURIComponent(path || '')
  } catch {
    return photoUrl
  }
}

export async function createPetPhotoSignedUrl(photoUrl) {
  const filePath = getStoragePath(photoUrl)
  if (!filePath) {
    console.warn('[petPhotos] No filePath para:', photoUrl)
    return ''
  }

  console.log('[petPhotos] Intentando signed URL para:', filePath)

  const { data, error } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .createSignedUrl(filePath, PET_PHOTO_SIGNED_URL_TTL)

  if (error) {
    console.error('[petPhotos] Error createSignedUrl:', error)
    return ''
  }

  console.log('[petPhotos] Signed URL generada:', data?.signedUrl?.substring(0, 80) + '...')
  return data?.signedUrl || ''
}

export async function addPetPhotoSignedUrls(pets) {
  return Promise.all(
    (pets || []).map(async (pet) => ({
      ...pet,
      photoSignedUrl: await createPetPhotoSignedUrl(pet.photo_url),
    })),
  )
}
