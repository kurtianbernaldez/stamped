export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024

const imageObjectUrls = new WeakMap<HTMLImageElement, string>()

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageUploadError'
  }
}

/** Revoke the object URL associated with a previously loaded image. Safe to repeat. */
export function releaseImageFile(image: HTMLImageElement): void {
  const url = imageObjectUrls.get(image)
  if (!url) return
  imageObjectUrls.delete(image)
  URL.revokeObjectURL(url)
}

/** Read and decode a local image before making it available to the canvas. */
export async function loadImageFile(file: File, signal?: AbortSignal): Promise<HTMLImageElement> {
  if (!file.type.startsWith('image/')) {
    throw new ImageUploadError('Choose an image file.')
  }
  if (file.size === 0) {
    throw new ImageUploadError('This image file is empty.')
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new ImageUploadError('Image files must be 20 MB or smaller.')
  }
  if (signal?.aborted) {
    throw new ImageUploadError('Image loading was cancelled.')
  }

  // Keep this URL alive while the image is in use: the crop editor reuses image.src.
  const image = new Image()
  image.decoding = 'async'
  const url = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: ImageUploadError) => {
        if (settled) return
        settled = true
        image.onload = null
        image.onerror = null
        signal?.removeEventListener('abort', onAbort)
        if (error) reject(error)
        else resolve()
      }
      const onAbort = () => {
        finish(new ImageUploadError('Image loading was cancelled.'))
        image.removeAttribute('src')
      }

      image.onload = () => {
        if (image.naturalWidth === 0 || image.naturalHeight === 0) {
          finish(new ImageUploadError('This image has no usable dimensions.'))
        } else if (image.naturalWidth * image.naturalHeight > 40_000_000) {
          finish(new ImageUploadError('This image is too large to process. Use one under 40 million pixels.'))
        } else if (typeof image.decode === 'function') {
          void image.decode().then(
            () => finish(),
            () => finish(new ImageUploadError('Could not read this image. Please try another format.')),
          )
        } else {
          finish()
        }
      }
      image.onerror = () => finish(new ImageUploadError('Could not read this image. Please try another format.'))
      signal?.addEventListener('abort', onAbort, { once: true })
      if (signal?.aborted) {
        onAbort()
      } else {
        try {
          image.src = url
        } catch {
          finish(new ImageUploadError('Could not read this image. Please try another file.'))
        }
      }
    })

    if (signal?.aborted) {
      throw new ImageUploadError('Image loading was cancelled.')
    }
    imageObjectUrls.set(image, url)
    return image
  } catch (error) {
    image.removeAttribute('src')
    URL.revokeObjectURL(url)
    throw error
  }
}

export function getImageUploadErrorMessage(error: unknown): string {
  return error instanceof ImageUploadError
    ? error.message
    : 'Could not open this image. Please try another file.'
}
