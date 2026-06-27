import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Image Hosting',
  description: 'Upload, browse, and manage hosted images',
  icons: {
    icon: '/assets/ico/fav.png'
  }
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
