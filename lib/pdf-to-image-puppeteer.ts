// Convert PDF to images using Puppeteer + PDF.js
// This is more reliable than pdfjs-dist alone in Next.js/Node.js environments
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface PDFImage {
  pageNumber: number
  imageData: string // base64 encoded PNG
  mimeType: 'image/png'
}

/**
 * Convert PDF Buffer to images using Puppeteer with PDF.js rendering
 * More reliable than pdfjs-dist in server environments
 */
export async function convertPDFToImagesWithPuppeteer(
  pdfBuffer: Buffer,
  maxPages: number = 10
): Promise<PDFImage[]> {
  let browser
  let tempPdfPath: string | null = null
  
  try {
    console.log('📄 Starting Puppeteer PDF-to-image conversion...')
    
    // Create temporary PDF file
    const tempDir = os.tmpdir()
    tempPdfPath = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`)
    fs.writeFileSync(tempPdfPath, pdfBuffer)
    console.log('✅ Temporary PDF file created:', tempPdfPath)
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions'
      ]
    })
    console.log('✅ Puppeteer browser launched')
    
    const page = await browser.newPage()
    
    // Create an HTML page that uses PDF.js to render the PDF
    const pdfBase64 = pdfBuffer.toString('base64')
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    canvas { display: block; margin: 20px auto; }
  </style>
</head>
<body>
  <div id="pdf-container"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdfData = atob('${pdfBase64}');
    const loadingTask = pdfjsLib.getDocument({data: pdfData});
    
    loadingTask.promise.then(function(pdf) {
      window.pdfDocument = pdf;
      window.pdfLoaded = true;
    });
  </script>
</body>
</html>
    `
    
    await page.setContent(htmlContent)
    console.log('✅ HTML with PDF.js loaded')
    
    // Wait for PDF to load
    await page.waitForFunction(() => window.pdfLoaded === true, { timeout: 30000 })
    console.log('✅ PDF loaded in browser')
    
    // Get number of pages
    const numPages = await page.evaluate(() => window.pdfDocument.numPages)
    const pagesToConvert = Math.min(numPages, maxPages)
    console.log(`📄 PDF has ${numPages} pages, converting first ${pagesToConvert}`)
    
    const images: PDFImage[] = []
    
    // Render and screenshot each page
    for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
      try {
        // Render the page
        await page.evaluate(async (pNum) => {
          const page = await window.pdfDocument.getPage(pNum)
          const viewport = page.getViewport({ scale: 2.0 })
          
          const canvas = document.createElement('canvas')
          canvas.id = `page-${pNum}`
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          const container = document.getElementById('pdf-container')
          container.innerHTML = '' // Clear previous page
          container.appendChild(canvas)
          
          const context = canvas.getContext('2d')
          await page.render({ canvasContext: context, viewport: viewport }).promise
        }, pageNum)
        
        console.log(`✅ Rendered page ${pageNum} in browser`)
        
        // Take screenshot of the canvas
        const canvas = await page.$(`#page-${pageNum}`)
        if (canvas) {
          const screenshot = await canvas.screenshot({ type: 'png' })
          const imageData = screenshot.toString('base64')
          
          images.push({
            pageNumber: pageNum,
            imageData: imageData,
            mimeType: 'image/png'
          })
          
          console.log(`✅ Captured page ${pageNum}/${pagesToConvert}`)
        }
      } catch (pageError) {
        console.error(`❌ Error converting page ${pageNum}:`, pageError)
        // Continue with other pages
      }
    }
    
    console.log(`✅ Successfully converted ${images.length} pages`)
    return images
    
  } catch (error) {
    console.error('❌ Puppeteer PDF conversion error:', error)
    throw new Error(`Failed to convert PDF using Puppeteer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Cleanup
    if (browser) {
      try {
        await browser.close()
        console.log('✅ Puppeteer browser closed')
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
    
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath)
        console.log('✅ Temporary PDF file deleted')
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError)
      }
    }
  }
}

// Add type definitions for window
declare global {
  interface Window {
    pdfDocument: any
    pdfLoaded: boolean
  }
}

