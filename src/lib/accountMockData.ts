export type PersonaStatus = 'ready' | 'draft' | 'needs-photos' | 'processing' | 'error';

export type AccountPersona = {
  id: string;
  name: string;
  cover: string;
  photos: string[];
  status: PersonaStatus;
  updatedAt: string;
  profile: {
    gender: 'woman' | 'man';
    heightCm: string;
    weightKg: string;
    bodyType: 'slim' | 'average' | 'athletic';
    eyeColor: 'brown' | 'blue' | 'green' | 'gray';
  };
};

export const crystalBalance = 40;
export const accountTokenBalance = crystalBalance;

export const accountPersonas: AccountPersona[] = [
  {
    id: 'ekaterina',
    name: 'Екатерина',
    cover: '/selfie-2.png',
    photos: ['/selfie-2.png', '/selfie-3.png', '/before-main.png'],
    status: 'ready',
    updatedAt: '18 июля 2026',
    profile: { gender: 'woman', heightCm: '171', weightKg: '68', bodyType: 'average', eyeColor: 'brown' },
  },
  {
    id: 'mama',
    name: 'Мама',
    cover: '/before-2.png',
    photos: ['/before-2.png'],
    status: 'draft',
    updatedAt: '15 июля 2026',
    profile: { gender: 'woman', heightCm: '164', weightKg: '61', bodyType: 'average', eyeColor: 'green' },
  },
];
