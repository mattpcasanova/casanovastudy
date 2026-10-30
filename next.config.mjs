/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // The OAuth client id isn't secret; the browser needs it for "Pick from
  // Google Drive" (lib/google/drive-auth.ts). Same client as Classroom.
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  // Increase body size limit for file uploads
  serverExternalPackages: []
}

export default nextConfig
