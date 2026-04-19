'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './TrainingProgress.module.css';

interface TrainingProgressProps {
  photoshootId: string;
  initialStatus: string;
}

export default function TrainingProgress({ photoshootId, initialStatus }: TrainingProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [targetProgress, setTargetProgress] = useState(5);
  const [displayProgress, setDisplayProgress] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Плавная анимация: каждые 500мс подтягиваем отображение к целевому значению
  useEffect(() => {
    const animInterval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= targetProgress) return prev;
        // Плавно приближаемся к цели (не быстрее 0.3% за тик)
        const step = Math.min(0.3, (targetProgress - prev) * 0.05);
        return Math.min(targetProgress, prev + step);
      });
    }, 500);
    return () => clearInterval(animInterval);
  }, [targetProgress]);

  // Псевдо-прогресс на основе времени (пока нет данных от сервера)
  useEffect(() => {
    if (status === 'completed' || status === 'error') return;
    
    const timeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60; // минуты
      if (status === 'training') {
        // ~10 мин = 500 шагов, маппим 0-10мин → 5-88%
        const calc = 5 + Math.min(83, (elapsed / 10) * 83);
        setTargetProgress(prev => Math.max(prev, Math.floor(calc)));
      } else if (status === 'generating') {
        // Генерация ~1-2 мин → 88-98%
        const calc = 88 + Math.min(10, (elapsed / 2) * 10);
        setTargetProgress(prev => Math.max(prev, Math.floor(calc)));
      }
    }, 3000);
    return () => clearInterval(timeInterval);
  }, [status]);

  // Polling статуса с сервера каждые 8 секунд
  useEffect(() => {
    if (status === 'completed' || status === 'error') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/ai/status/${photoshootId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status !== status) setStatus(data.status);
        if (data.progress > targetProgress) setTargetProgress(data.progress);

        if (data.status === 'completed') {
          setTargetProgress(100);
          setDisplayProgress(100);
          setTimeout(() => window.location.reload(), 1000);
        } else if (data.status === 'error') {
          window.location.reload();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    const interval = setInterval(checkStatus, 8000);
    checkStatus();
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

  const rounded = Math.round(displayProgress);

  return (
    <div className={styles.progressContainer}>
      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>{getStatusText()}</span>
        <span className={styles.percent}>{rounded}%</span>
      </div>
      <div className={styles.barBg}>
        <div
          className={styles.barFill}
          style={{ width: `${displayProgress}%`, transition: 'width 0.5s ease-out' }}
        />
      </div>
    </div>
  );
}
