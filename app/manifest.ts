import type { MetadataRoute } from 'next'

// Web app manifest: lets students add Casanova Study to their home screen and
// open it full-screen like an app (and is required for iOS push later).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Casanova Study',
    short_name: 'Casanova',
    description: 'Study guides, quizzes and spaced-repetition review built from your class materials.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e40af',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'My Guides', url: '/my-guides', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'New Guide', url: '/', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
