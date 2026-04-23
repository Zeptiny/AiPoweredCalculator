import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Computation Engine',
  description: 'An advanced AI-powered computation engine for complex calculations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
