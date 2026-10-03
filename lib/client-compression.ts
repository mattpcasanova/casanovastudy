// Direct browser → Cloudinary upload (unsigned preset "casanovastudy", raw
// resource type), so files never pass through a Vercel function and its 4.5 MB
// body limit. Files are prepared/shrunk first (lib/uploads/prepare.ts); nothing
// here compresses or truncates. (The old PDF "compression" was a no-op that then
// cut files at 10 MB, which corrupted them.)

export interface CloudinaryUpload {
  url: string
  filename: string
  size: number
  format?: string
}

/** Cloudinary public ids: letters, digits, dashes and underscores, plus a random suffix so uploads never collide. */
function uniquePublicId(name: string): string {
  const base = name.replace(/\.[^/.]+$/, '').normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').slice(0, 60) || 'file'
  const ext = name.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? ''
  return `${base}-${crypto.randomUUID().slice(0, 8)}${ext}`
}

export class ClientCompression {
  static async uploadToCloudinary(file: Blob, folder = 'casanovastudy', filename = (file as File).name ?? 'upload'): Promise<CloudinaryUpload> {
    const formData = new FormData()
    formData.append('file', file, filename)
    formData.append('upload_preset', 'casanovastudy')
    formData.append('folder', folder)
    // Raw resources keep their extension in the public id.
    formData.append('public_id', uniquePublicId(filename))

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: formData })
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloudinary upload failed:', response.status, errorText)
      throw new Error(`Upload failed for ${filename}. Please try again.`)
    }
    const result = await response.json()
    return { url: result.secure_url, filename, size: result.bytes, format: result.format }
  }
}
