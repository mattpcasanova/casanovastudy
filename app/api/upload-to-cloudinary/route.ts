import { NextRequest, NextResponse } from 'next/server';
import { CloudinaryService } from '@/lib/cloudinary-service';
import { validateFile } from '@/lib/file-processing';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'casanovastudy';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const uploadResult = await CloudinaryService.uploadFile(
      buffer,
      file.name,
      folder
    );

    console.log('File uploaded to Cloudinary:', {
      filename: file.name,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      size: uploadResult.bytes,
      format: uploadResult.format
    });

    return NextResponse.json({
      success: true,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      filename: file.name,
      size: uploadResult.bytes,
      format: uploadResult.format
    });

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
