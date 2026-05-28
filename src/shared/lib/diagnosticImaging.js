import { supabase } from './supabaseClient.js'

export const DIAGNOSTIC_IMAGING_BUCKET = 'diagnostic-imaging'
export const DIAGNOSTIC_IMAGING_SIGNED_URL_TTL = 3600

function getStoragePath(fileUrl) {
  if (!fileUrl) return ''

  try {
    const url = new URL(fileUrl)
    const publicPrefix = `/storage/v1/object/public/${DIAGNOSTIC_IMAGING_BUCKET}/`
    const signedPrefix = `/storage/v1/object/sign/${DIAGNOSTIC_IMAGING_BUCKET}/`
    const matchingPrefix = [publicPrefix, signedPrefix].find((prefix) => url.pathname.includes(prefix))

    if (!matchingPrefix) return fileUrl

    const [, path] = url.pathname.split(matchingPrefix)
    return decodeURIComponent(path || '')
  } catch {
    return fileUrl
  }
}

export async function createDiagnosticImageSignedUrl(fileUrl) {
  const filePath = getStoragePath(fileUrl)
  if (!filePath) return ''

  const { data, error } = await supabase.storage
    .from(DIAGNOSTIC_IMAGING_BUCKET)
    .createSignedUrl(filePath, DIAGNOSTIC_IMAGING_SIGNED_URL_TTL)

  if (error) return ''
  return data?.signedUrl || ''
}

export async function addDiagnosticImageSignedUrls(records) {
  return Promise.all(
    (records || []).map(async (record) => ({
      ...record,
      imageSignedUrl: await createDiagnosticImageSignedUrl(record.image_path),
    })),
  )
}
