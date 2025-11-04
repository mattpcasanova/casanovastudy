// Simple client-side PDF to images converter using browser PDF.js
// This avoids all server-side complexity

export interface PDFImage {
  pageNumber: number
  imageData: string // base64 encoded PNG
  mimeType: 'image/png'
}

/**
 * Convert PDF file to images using browser's PDF.js
 * This runs entirely in the browser - no server dependencies needed
 */
export async function convertPDFToImagesClient(file: File, maxPages: number = 10): Promise<PDFImage[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          reject(new Error('Failed to read PDF file'))
          return
        }

        // Dynamically load PDF.js (already installed in package.json)
        const pdfjsLib = await import('pdfjs-dist')
        // Use CDN worker for browser compatibility
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          verbosity: 0
        })

        const pdf = await loadingTask.promise
        const numPages = Math.min(pdf.numPages, maxPages)
        
        const images: PDFImage[] = []

        // Render each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum)
            const scale = 2.0 // Higher scale = better quality
            const viewport = page.getViewport({ scale })

            // Create a canvas to render the PDF page
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            const context = canvas.getContext('2d')
            
            if (!context) {
              throw new Error('Failed to get canvas context')
            }

            // Render the PDF page to canvas
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise

            // Convert canvas to base64 image
            const imageData = canvas.toDataURL('image/png').split(',')[1] // Remove data:image/png;base64, prefix
            
            images.push({
              pageNumber: pageNum,
              imageData: imageData,
              mimeType: 'image/png'
            })
          } catch (pageError) {
            console.error(`Error converting page ${pageNum}:`, pageError)
            // Continue with other pages
          }
        }

        resolve(images)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

