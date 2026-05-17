import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'SYNKRO — AI-Powered Code Security Scanner',
  description:
    'Scan GitHub repositories for security vulnerabilities, code quality issues, dependency risks, and performance bottlenecks. Powered by Gemini AI with one-click automated fixes.',
  keywords: ['security scanner', 'GitHub', 'AI', 'code analysis', 'vulnerability', 'Gemini'],
  authors: [{ name: 'Synkro Security' }],
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'SYNKRO — AI-Powered Code Security Scanner',
    description: 'Scan GitHub repos for security issues and auto-fix them with Gemini AI.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
