import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/app/providers'
import { Nav } from '@/components/Nav'
import { Toaster } from '@/components/ui/sonner'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AstroDigest',
  description: 'Your weekly AI-curated astronomy digest',
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${inter.variable} ${plexMono.variable}`}>
        <body className="bg-background font-sans text-foreground antialiased">
          <Providers>
            <Nav />
            {children}
          </Providers>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
