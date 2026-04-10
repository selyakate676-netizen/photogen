'use client';

import { useState, useEffect } from 'react';
import styles from './TrainingProgress.module.css';

interface TrainingProgressProps {
  photoshootId: string;
  initialStatus: string;
}

export default function TrainingProgress({ photoshootId, initialStatus }: TrainingProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Если статус уже завершен или ошибка, не опрашиваем
    if (status === 'completed' || status === 'error') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/ai/status/${photoshootId}`);
        if (!res.ok) return;
        
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress);
        
        if (data.status === 'completed' || data.status === 'error') {
            clearInterval(interval);
            window.location.reload(); // Перезагружаем для обновления кнопок
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Опрашиваем каждые 15 секунд
    const interval = setInterval(checkStatus, 15000);
    checkStatus(); // Первый запуск сразу

    return () => clearInterval(interval);
  }, [photoshootId, status]);

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Подготовка...';
      case 'training': return 'Обучение нейросети...';
      case 'generating': return 'Генерация образов...';
      case 'completed': return 'Готово!';
      case 'error': return 'Ошибка обучения';
      default: return 'В процессе';
    }
  };

  return (
    <div className={styles.progressContainer}>
        <div className={styles.statusRow}>
            <span className={styles.statusLabel}>{getStatusText()}</span>
            <span className={styles.percent}>{progress}%</span>
        </div>
        <div className={styles.barBg}>
            <div 
                className={styles.barFill} 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
  );
}
