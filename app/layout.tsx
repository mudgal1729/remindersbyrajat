import type { Metadata } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const APP_URL = 'https://remindersbyrajat.xyz'
const DESCRIPTION =
  'Never miss what matters. Get email reminders for birthdays, anniversaries, and life events.'

export const metadata: Metadata = {
  title: 'Reminders by Rajat',
  description: DESCRIPTION,
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'Reminders by Rajat',
    description: DESCRIPTION,
    url: APP_URL,
    siteName: 'Reminders by Rajat',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reminders by Rajat',
    description: DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
