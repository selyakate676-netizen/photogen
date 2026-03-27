import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PhotoGen — Нейрофотосессия без дорогой студии',
  description:
    'Создайте реалистичные профессиональные фото с помощью AI. Это вы, только фотогеничнее. Без фотографа, камеры и студии — от 500 ₽.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
