const MAX_IMAGE_SIZE = 350 * 1024 // 350KB per image - allows ~12 pages within Vercel's 4.5MB body limit
const TARGET_RESOLUTION = 1200 // Max width/height in pixels (good quality for handwriting)
const MAX_TOTAL_UPLOAD_SIZE = 4.2 * 1024 * 1024 // 4.2MB total to stay under Vercel's 4.5MB body limit (with FormData overhead)

export { MAX_TOTAL_UPLOAD_SIZE }

/**
 * Compress an image blob to be under the max size
 */
async function compressImage(
  canvas: HTMLCanvasElement,
  maxSize: number,
  startQuality: number = 0.9
): Promise<Blob> {
  let quality = startQuality
  let blob: Blob | null = null

  // Try progressively lower quality until under size limit
  while (quality > 0.1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    })

    if (blob && blob.size <= maxSize) {
      return blob
    }

    quality -= 0.1
  }

  // If still too large, reduce resolution
  const ctx = canvas.getContext('2d')
  if (!ctx || !blob) {
    throw new Error('Failed to compress image')
  }

  // Create a smaller canvas
  const scale = Math.sqrt(maxSize / (blob?.size || maxSize))
  const newWidth = Math.floor(canvas.width * scale)
  const newHeight = Math.floor(canvas.height * scale)

  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = newWidth
  smallCanvas.height = newHeight
  const smallCtx = smallCanvas.getContext('2d')

  if (!smallCtx) {
    throw new Error('Failed to create canvas context')
  }

  smallCtx.drawImage(canvas, 0, 0, newWidth, newHeight)

  return new Promise<Blob>((resolve, reject) => {
    smallCanvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Failed to create blob'))
      },
      'image/jpeg',
      0.85
    )
  })
}

/**
 * Load PDF.js library from CDN
 * This avoids Turbopack bundling issues with pdfjs-dist
 */
export async function loadPdfJs(): Promise<any> {
  // Check if already loaded
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib
  }

  // Load the UMD build from CDN (more compatible than ES modules)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(pdfjsLib)
      } else {
        reject(new Error('PDF.js failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'))
    document.head.appendChild(script)
  })
}

/**
 * Compress a single image file to be under the max size
 */
export async function compressImageFile(
  file: File,
  maxSize: number = MAX_IMAGE_SIZE
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(url)

      // Calculate dimensions
      let width = img.width
      let height = img.height

      // Scale down if larger than target resolution
      if (width > TARGET_RESOLUTION || height > TARGET_RESOLUTION) {
        const scale = Math.min(
          TARGET_RESOLUTION / width,
          TARGET_RESOLUTION / height
        )
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
      }

      // Create canvas and draw image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to create canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      try {
        const blob = await compressImage(canvas, maxSize)
        resolve(blob)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Prepare one grading upload (teacher page and student assignments): every PDF
 * page and photo becomes a JPEG (HEIC included, decoded in the browser), and
 * Word/PowerPoint/text files become a plain-text file, so the grader never gets
 * a mislabeled file. Uses the shared preparer in lib/uploads/prepare.ts.
 */
export async function processFile(
  file: File,
  onProgress?: (message: string) => void
): Promise<File[]> {
  const { prepareMaterials } = await import('./uploads/prepare')
  const prepared = await prepareMaterials([file], { pdfMode: 'images', maxImages: 100, onProgress })
  if (prepared.problems.length && !prepared.images.length && !prepared.texts.length) {
    throw new Error(prepared.problems.join(' '))
  }
  return [
    ...prepared.images.map((img) => new File([img.blob], img.name, { type: 'image/jpeg' })),
    ...prepared.texts.map((t) => new File([t.content], t.name.replace(/\.[^.]+$/, '') + '.txt', { type: 'text/plain' })),
  ]
}
