'use client';

import { useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import PhotoPackDetails from '@/components/PhotoPackDetails';
import { getRelatedPhotoPacks, type PhotoPack } from '@/lib/photoPacks';
import styles from './PhotoPackModal.module.css';

type PhotoPackModalProps = {
  pack: PhotoPack;
  onClose: () => void;
  onSelectPack: (slug: string) => void;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function PhotoPackModal({ pack, onClose, onSelectPack }: PhotoPackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `photopack-modal-title-${pack.slug}`;
  const relatedPacks = useMemo(() => getRelatedPhotoPacks(pack.slug, 8), [pack.slug]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button[data-modal-close="true"]')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pack.slug]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        <PhotoPackDetails
          key={pack.slug}
          pack={pack}
          relatedPacks={relatedPacks}
          mode="modal"
          titleId={titleId}
          onClose={onClose}
          onSelectPack={onSelectPack}
        />
      </div>
    </div>
  );
}