'use client';
import { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import styles from './ImageSlider.module.css';

interface ImageSliderProps {
  beforeImages: string[];
  afterImages: string[];
  beforeLabel?: string;
  afterLabel?: string;
  autoPlay?: boolean;
  autoDurationMs?: number;
  autoResumeDelayMs?: number;
  variant?: 'default' | 'hero';
}

const AUTO_MIN_POSITION = 18;
const AUTO_MAX_POSITION = 82;

export default function ImageSlider({
  beforeImages,
  afterImages,
  beforeLabel = 'До',
  afterLabel = 'После',
  autoPlay = false,
  autoDurationMs = 7000,
  autoResumeDelayMs = 2200,
  variant = 'default',
}: ImageSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);

  const clearAutoTimers = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const setPositionFromClientX = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    setPositionFromClientX(clientX);
  };

  const pauseAutoPlay = () => {
    if (!autoPlay) return;
    setIsAutoPaused(true);
    animationStartRef.current = null;
    clearAutoTimers();
  };

  const resumeAutoPlay = () => {
    if (!autoPlay) return;
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      animationStartRef.current = null;
      setIsAutoPaused(false);
      resumeTimeoutRef.current = null;
    }, autoResumeDelayMs);
  };

  const startDragging = (clientX: number) => {
    pauseAutoPlay();
    setIsDragging(true);
    setPositionFromClientX(clientX);
  };

  const onMouseMove = (e: globalThis.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: globalThis.TouchEvent) => handleMove(e.touches[0].clientX);
  const stopDragging = () => {
    setIsDragging(false);
    resumeAutoPlay();
  };

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

  useEffect(() => {
    if (!autoPlay || isDragging || isAutoPaused) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (animationStartRef.current === null) {
        animationStartRef.current = timestamp;
      }

      const elapsed = (timestamp - animationStartRef.current) % autoDurationMs;
      const progress = elapsed / autoDurationMs;
      const easedPingPong = (1 - Math.cos(progress * Math.PI * 2)) / 2;
      const position = AUTO_MIN_POSITION + (AUTO_MAX_POSITION - AUTO_MIN_POSITION) * easedPingPong;

      setSliderPosition(position);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [autoDurationMs, autoPlay, isAutoPaused, isDragging]);

  useEffect(() => {
    return () => clearAutoTimers();
  }, []);

  return (
    <div 
      className={`${styles.container} ${variant === 'hero' ? styles.heroContainer : ''}`}
      ref={sliderRef}
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => startDragging(e.clientX)}
      onTouchStart={(e: TouchEvent<HTMLDivElement>) => startDragging(e.touches[0].clientX)}
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