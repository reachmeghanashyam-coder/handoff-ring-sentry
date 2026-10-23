import './globals.css'

export const metadata = {
  title: 'Handoff · Delivery Sentry for Ring',
  description: 'Commercial delivery exception management and chain-of-custody tracking for Amazon Ring',
  icons: {
    icon: '/favicon.svg?v=2',
    shortcut: '/favicon.svg?v=2',
    apple: '/favicon.svg?v=2',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=2" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-obsidian-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
