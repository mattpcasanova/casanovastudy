import { v2 as cloudinary } from 'cloudinary';

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
   * Upload a file buffer directly to Cloudinary
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    folder: string = 'casanovastudy'
  ): Promise<CloudinaryUploadResult> {
    try {
      const result = await cloudinary.uploader.upload(
        `data:application/octet-stream;base64,${buffer.toString('base64')}`,
        {
          public_id: `${folder}/${filename.replace(/\.[^/.]+$/, '')}`,
          resource_type: 'auto', // Automatically detect file type
          folder: folder,
          use_filename: true,
          unique_filename: true,
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
