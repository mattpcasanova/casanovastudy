const MAX_IMAGE_SIZE = 4.5 * 1024 * 1024 // 4.5MB to stay safely under Claude's 5MB limit
const TARGET_RESOLUTION = 1500 // Max width/height in pixels (good quality for handwriting)

interface ConvertedImage {
  data: Blob
  name: string
  type: string
  pageNumber: number
}

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
 * Convert a PDF file to an array of compressed image blobs
 * Uses dynamic import to avoid server-side rendering issues
 */
export async function convertPdfToImages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ConvertedImage[]> {
  // Dynamic import of pdf.js - only runs on client
  const pdfjsLib = await import('pdfjs-dist')

  // Set worker source to local file in public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdf.numPages
  const images: ConvertedImage[] = []
  const baseName = file.name.replace(/\.pdf$/i, '')

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages)
    }

    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })

    // Calculate scale to fit within target resolution while maintaining aspect ratio
    const scale = Math.min(
      TARGET_RESOLUTION / viewport.width,
      TARGET_RESOLUTION / viewport.height,
      2 // Max 2x scale to avoid huge images
    )

    const scaledViewport = page.getViewport({ scale })

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to create canvas context')
    }

    // Render page to canvas
    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
    }).promise

    // Compress the image
    const blob = await compressImage(canvas, MAX_IMAGE_SIZE)

    images.push({
      data: blob,
      name: `${baseName}_page_${pageNum}.jpg`,
      type: 'image/jpeg',
      pageNumber: pageNum,
    })

    // Clean up
    canvas.width = 0
    canvas.height = 0
  }

  return images
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
 * Check if a file needs processing (PDF or large image)
 */
export function needsProcessing(file: File): boolean {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isLargeImage = file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE
  return isPdf || isLargeImage
}

/**
 * Process a file - convert PDF to images or compress large images
 */
export async function processFile(
  file: File,
  onProgress?: (message: string) => void
): Promise<File[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    if (onProgress) onProgress(`Converting PDF to images...`)

    const images = await convertPdfToImages(file, (current, total) => {
      if (onProgress) onProgress(`Processing page ${current} of ${total}...`)
    })

    return images.map((img) => new File([img.data], img.name, { type: img.type }))
  }

  // For images, compress if needed
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_SIZE) {
      if (onProgress) onProgress(`Compressing image...`)
      const compressed = await compressImageFile(file)
      return [new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })]
    }
  }

  // Return as-is if no processing needed
  return [file]
}
