// Convert PDF pages to images for Claude vision API using pdfjs-dist + Node.js Canvas
// This is serverless-friendly and doesn't require Puppeteer/Chrome
import { createCanvas } from 'canvas'

// Polyfill DOMMatrix for Node.js (required by pdfjs-dist)
// This MUST run before pdfjs-dist is imported
if (typeof globalThis.DOMMatrix === 'undefined') {
  // Simple DOMMatrix polyfill for pdfjs-dist
  class DOMMatrixPolyfill {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
    
    constructor(init?: string | number[]) {
      if (typeof init === 'string') {
        // Parse matrix string like "matrix(a, b, c, d, e, f)"
        const match = init.match(/matrix\(([^)]+)\)/)
        if (match) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()))
          this.a = values[0] || 1
          this.b = values[1] || 0
          this.c = values[2] || 0
          this.d = values[3] || 1
          this.e = values[4] || 0
          this.f = values[5] || 0
        } else {
          this.setIdentity()
        }
      } else if (Array.isArray(init)) {
        this.a = init[0] || 1
        this.b = init[1] || 0
        this.c = init[2] || 0
        this.d = init[3] || 1
        this.e = init[4] || 0
        this.f = init[5] || 0
      } else {
        this.setIdentity()
      }
    }
    
    setIdentity() {
      this.a = 1
      this.b = 0
      this.c = 0
      this.d = 1
      this.e = 0
      this.f = 0
      return this
    }
    
    multiply(other: DOMMatrixPolyfill) {
      const result = new DOMMatrixPolyfill()
      result.a = this.a * other.a + this.c * other.b
      result.b = this.b * other.a + this.d * other.b
      result.c = this.a * other.c + this.c * other.d
      result.d = this.b * other.c + this.d * other.d
      result.e = this.a * other.e + this.c * other.f + this.e
      result.f = this.b * other.e + this.d * other.f + this.f
      return result
    }
    
    translate(x: number, y: number) {
      this.e += x
      this.f += y
      return this
    }
    
    scale(x: number, y?: number) {
      this.a *= x
      this.d *= (y !== undefined ? y : x)
      return this
    }
  }
  
  ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill
  ;(globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill
  
  // Also add to global if needed
  if (typeof (global as any).DOMMatrix === 'undefined') {
    ;(global as any).DOMMatrix = DOMMatrixPolyfill
    ;(global as any).DOMMatrixReadOnly = DOMMatrixPolyfill
  }
}

// Ensure window object exists for pdfjs-dist compatibility
if (typeof globalThis.window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

export interface PDFImage {
  pageNumber: number
  imageData: string // base64 encoded PNG
  mimeType: 'image/png'
}

/**
 * Convert PDF pages to PNG images using pdfjs-dist + Node.js Canvas
 * Returns array of base64-encoded PNG images (one per page, up to maxPages)
 * This approach is serverless-friendly and doesn't require Puppeteer/Chrome
 */
export async function convertPDFToImages(pdfBuffer: Buffer, maxPages: number = 10): Promise<PDFImage[]> {
  try {
    console.log('📄 Converting PDF to images using pdfjs-dist + Node.js Canvas...')
    
    // Dynamically import pdfjs-dist AFTER polyfills are set up
    const pdfjsLib = await import('pdfjs-dist')
    
    // Configure pdfjs worker (required for pdfjs-dist in Node.js)
    // For Node.js, we can disable the worker or use a file path
    // In newer versions of pdfjs-dist, we can use disableWorker: true or set workerSrc
    try {
      // Try to set worker to a file path (if available)
      const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.mjs')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
    } catch {
      // If worker file not found, disable worker (some operations may be slower)
      // This is fine for server-side rendering
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    }
    
    // Load the PDF document
    // Convert Buffer to Uint8Array (required by pdfjs-dist)
    const uint8Array = new Uint8Array(pdfBuffer)
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0, // Suppress warnings
      useSystemFonts: true // Use system fonts for better compatibility
    })
    
    const pdf = await loadingTask.promise
    const numPages = Math.min(pdf.numPages, maxPages)
    console.log(`📄 PDF has ${pdf.numPages} pages, converting first ${numPages} pages to images`)
    
    const images: PDFImage[] = []
    
    // Render each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const scale = 2.0 // Higher scale = better quality
        const viewport = page.getViewport({ scale })
        
        // Create a Node.js Canvas
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')
        
        // Ensure DOMMatrix is available on the context if needed
        if (context && typeof (context as any).getTransform === 'function') {
          // Canvas context might need DOMMatrix for transforms
          if (typeof globalThis.DOMMatrix !== 'undefined') {
            ;(context as any).DOMMatrix = globalThis.DOMMatrix
          }
        }
        
        // Render the PDF page to the canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        
        // Convert canvas to base64 PNG
        // Node.js canvas uses toBuffer() method, not toDataURL()
        const imageBuffer = canvas.toBuffer('image/png')
        const imageData = imageBuffer.toString('base64')
        
        images.push({
          pageNumber: pageNum,
          imageData: imageData,
          mimeType: 'image/png'
        })
        
        console.log(`✅ Converted page ${pageNum}/${numPages} to image (${imageData.length} bytes)`)
      } catch (pageError) {
        console.error(`❌ Error converting page ${pageNum}:`, pageError)
        // Continue with other pages
      }
    }
    
    console.log(`✅ Successfully converted ${images.length} pages to images`)
    return images
  } catch (error) {
    console.error('❌ PDF to image conversion error:', error)
    throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

