import { v2 as cloudinary } from 'cloudinary';
import { PDFDocument } from 'pdf-lib';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  format: string;
}

export class CloudinaryService {
  /**
   * Compress PDF if it's too large
   */
  private static async compressPDF(buffer: Buffer): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      
      // Get the PDF as bytes with compression
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
      });
      
      const compressedBuffer = Buffer.from(pdfBytes);
      const compressionRatio = ((buffer.length - compressedBuffer.length) / buffer.length * 100).toFixed(1);
      console.log(`PDF compressed: ${(buffer.length / 1024 / 1024).toFixed(1)}MB -> ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% reduction)`);
      
      return compressedBuffer;
    } catch (error) {
      console.log('PDF compression failed, using original:', error);
      return buffer;
    }
  }

  /**
   * Upload a file buffer directly to Cloudinary
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    folder: string = 'casanovastudy'
  ): Promise<CloudinaryUploadResult> {
    try {
      let uploadBuffer = buffer;
      
      // Compress PDFs if they're over 10MB
      if (filename.toLowerCase().endsWith('.pdf') && buffer.length > 10 * 1024 * 1024) {
        console.log('PDF is over 10MB, attempting compression...');
        uploadBuffer = await this.compressPDF(buffer);
        
        // If still too large, truncate as last resort
        if (uploadBuffer.length > 10 * 1024 * 1024) {
          console.log('PDF still too large after compression, truncating...');
          uploadBuffer = uploadBuffer.slice(0, 10 * 1024 * 1024);
        }
      }
      
      const result = await cloudinary.uploader.upload(
        `data:application/octet-stream;base64,${uploadBuffer.toString('base64')}`,
        {
          public_id: `${folder}/${filename.replace(/\.[^/.]+$/, '')}`,
          resource_type: 'raw', // Use 'raw' for all file types
          folder: folder,
          use_filename: true,
          unique_filename: true,
          access_mode: 'public',
          type: 'upload',
          overwrite: false,
          invalidate: true,
        }
      );

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload file to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  static async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete file from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file info from Cloudinary
   */
  static async getFileInfo(publicId: string) {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      console.error('Cloudinary get info error:', error);
      throw new Error(`Failed to get file info from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
