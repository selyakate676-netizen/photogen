'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import styles from './StylesGrid.module.css';

const styleCategories = [
  {
    id: 'career',
    name: 'Бизнес-портрет',
    desc: 'Для резюме, LinkedIn и рабочих профилей.',
    preview: '/career-woman-blazer.png',
  },
  {
    id: 'dating',
    name: 'Знакомства',
    desc: 'Притягательные фото для Tinder и соцсетей.',
    preview: '/dating-woman-1.png',
  },
  {
    id: 'social',
    name: 'Лайфстайл',
    desc: 'Стильные городские образы на каждый день.',
    preview: '/social-woman-1.png',
  },
  {
    id: 'studio',
    name: 'Студийный свет',
    desc: 'Профессиональное освещение и минимализм.',
    preview: '/studio-white-suit.png',
  },
  {
    id: 'neon',
    name: 'Неон и Арт',
    desc: 'Креативные образы с ярким освещением.',
    preview: '/studio-red-light-v2.png',
  },
  {
    id: 'bw',
    name: 'Черно-белое',
    desc: 'Классическая эстетика и глубина.',
    preview: '/studio-bw-man.png',
  }
];

interface StylesGridProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function StylesGrid({ selected, onSelect }: StylesGridProps) {
  return (
    <div className={styles.container}>
      <div className={styles.gridHeader}>
        <span className={styles.stepNumber}>Шаг 2 из 2</span>
        <h2>Выберите направление</h2>
        <p>В каком стиле вы хотите получить фотографии?</p>
      </div>

      <div className={styles.grid}>
        {styleCategories.map((cat) => (
          <div 
            key={cat.id} 
            className={`${styles.card} ${selected === cat.id ? styles.selected : ''}`}
            onClick={() => onSelect(cat.id)}
          >
            <div className={styles.imageWrapper}>
              <Image 
                src={cat.preview} 
                alt={cat.name} 
                fill 
                className={styles.img} 
                sizes="(max-width: 768px) 100vw, 300px"
              />
              {selected === cat.id && (
                <div className={styles.overlay}>
                  <div className={styles.checkIcon}>
                    <Check size={32} />
                  </div>
                </div>
              )}
            </div>
            <div className={styles.info}>
              <h3>{cat.name}</h3>
              <p>{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
