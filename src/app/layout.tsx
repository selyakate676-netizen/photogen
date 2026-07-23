import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PhotoGen — Нейрофотосессия без дорогой студии',
  description:
    'Создайте реалистичные профессиональные фото с помощью AI. Это вы, только фотогеничнее. Без фотографа, камеры и студии — от 500 ₽.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=photogen-approved-1', sizes: 'any' },
      { url: '/favicon-16x16.png?v=photogen-approved-1', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=photogen-approved-1', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png?v=photogen-approved-1', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192x192.png?v=photogen-approved-1', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png?v=photogen-approved-1', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=photogen-approved-1', sizes: '180x180', type: 'image/png' }],
  },
};

import { Suspense } from 'react';
import YandexMetrica from '@/components/YandexMetrica';
import Navbar from '@/components/Navbar';

const themeInitScript = `
(function () {
  try {
    var storageKey = 'photogen-theme';
    var savedTheme = localStorage.getItem(storageKey);
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (prefersLight ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />

        <Suspense fallback={null}>
          <YandexMetrica />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
