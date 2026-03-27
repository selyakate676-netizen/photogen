'use client';
import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import styles from './ImageSlider.module.css';

interface ImageSliderProps {
  beforeImages: string[];
  afterImages: string[];
  beforeLabel?: string;
  afterLabel?: string;
}

export default function ImageSlider({
  beforeImages,
  afterImages,
  beforeLabel = 'До',
  afterLabel = 'После',
}: ImageSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!sliderRef.current || !isDragging) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const onMouseMove = (e: globalThis.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: globalThis.TouchEvent) => handleMove(e.touches[0].clientX);
  const stopDragging = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', stopDragging);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDragging);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging]);

  return (
    <div 
      className={styles.container} 
      ref={sliderRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Background (Before Images - Unprocessed) */}
      <div className={styles.gridContainer} draggable={false}>
        {beforeImages.map((src, i) => (
          <img key={`before-${i}`} src={src} alt="До" className={styles.imageGridItem} draggable={false} />
        ))}
      </div>
      {beforeLabel && <div className={`${styles.label} ${styles.labelRight}`}>{beforeLabel}</div>}

      {/* Foreground (After Images - Processed, revealed by dragging right) */}
      <div 
        className={styles.foregroundWrapper} 
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <div className={styles.gridContainer} draggable={false}>
          {afterImages.map((src, i) => (
            <img key={`after-${i}`} src={src} alt="После" className={styles.imageGridItem} draggable={false} />
          ))}
        </div>
        {afterLabel && <div className={`${styles.label} ${styles.labelLeft}`}>{afterLabel}</div>}
      </div>

      {/* Slider Handle */}
      <div className={styles.handle} style={{ left: `${sliderPosition}%` }}>
        <div className={styles.handleLine}></div>
        <div className={styles.handleButton}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-2px)' }}>
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(2px)' }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </div>
  );
}
