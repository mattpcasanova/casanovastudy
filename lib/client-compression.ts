import { PDFDocument } from 'pdf-lib';

export class ClientCompression {
  /**
   * Upload file directly to Cloudinary (bypassing Vercel)
   */
  static async uploadToCloudinary(file: File, folder: string = 'casanovastudy'): Promise<any> {
    try {
      // Compress if needed
      const compressedFile = await this.compressIfNeeded(file);
      
      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', 'casanovastudy'); // You'll need to create this
      formData.append('folder', folder);
      
      // Upload directly to Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Direct Cloudinary upload successful:', result);
      
      return {
        url: result.secure_url,
        filename: file.name,
        size: result.bytes,
        format: result.format
      };
    } catch (error) {
      console.error('Direct Cloudinary upload error:', error);
      throw error;
    }
  }
  /**
   * Compress a PDF file on the client side
   */
  static async compressPDF(file: File): Promise<File> {
    try {
      console.log(`Compressing PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Save with compression settings
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
      });
      
      const compressedBuffer = Buffer.from(pdfBytes);
      const compressionRatio = ((file.size - compressedBuffer.length) / file.size * 100).toFixed(1);
      
      console.log(`PDF compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB -> ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% reduction)`);
      
      // Create a new File object with the compressed data
      const compressedFile = new File([compressedBuffer], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      });
      
      return compressedFile;
    } catch (error) {
      console.error('PDF compression failed:', error);
      // Return original file if compression fails
      return file;
    }
  }

  /**
   * Check if a file needs compression
   */
  static shouldCompress(file: File): boolean {
    return file.type === 'application/pdf' && file.size > 4.5 * 1024 * 1024; // 4.5MB
  }

  /**
   * Compress file if needed
   */
  static async compressIfNeeded(file: File): Promise<File> {
    if (this.shouldCompress(file)) {
      console.log(`File ${file.name} is over 4.5MB, compressing...`);
      return await this.compressPDF(file);
    }
    return file;
  }
}
