'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import styles from './PhotoUpload.module.css';

interface PhotoUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onUploadComplete?: (keys: string[]) => void;
}

export default function PhotoUpload({ files, setFiles, onUploadComplete }: PhotoUploadProps) {
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${file.size}`;
    setUploadingStatus(prev => ({ ...prev, [fileId]: 'uploading' }));

    try {
      // 1. Получаем временную ссылку от нашего сервера
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, key } = await res.json();

      // 2. Загружаем файл напрямую в Beget S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      
      setUploadingStatus(prev => ({ ...prev, [fileId]: 'success' }));
      return key;
    } catch (err) {
      console.error('Upload error:', err);
      setUploadingStatus(prev => ({ ...prev, [fileId]: 'error' }));
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles].slice(0, 25);
    setFiles(newFiles);
    
    const uploadPromises = acceptedFiles.map(file => uploadFile(file));
    const keys = await Promise.all(uploadPromises);
    
    const successfulKeys = keys.filter((k): k is string => k !== null);
    if (onUploadComplete && successfulKeys.length > 0) {
      onUploadComplete(successfulKeys);
    }
  }, [files, setFiles, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.container}>
      <div 
        {...getRootProps()} 
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        <div className={styles.dropContent}>
          <div className={styles.iconCircle}>
            <Upload size={32} />
          </div>
          <h3>Перетащите фото сюда</h3>
          <p>или нажмите для выбора (JPG, PNG)</p>
          <span className={styles.hint}>Нужно от 10 до 20 фотографий</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <h4>Загружено: {files.length} фото</h4>
            <button onClick={() => setFiles([])} className={styles.clearBtn}>Очистить всё</button>
          </div>
          <div className={styles.grid}>
            {files.map((file, idx) => {
              const fileId = `${file.name}-${file.size}`;
              const status = uploadingStatus[fileId];

              return (
                <div key={idx} className={styles.previewItem}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                  />
                  <div className={styles.itemOverlay}>
                    {status === 'uploading' && <Loader2 className={styles.spin} size={20} />}
                    {status === 'success' && <CheckCircle2 className={styles.successIcon} size={20} />}
                    {status === 'error' && <span className={styles.errorText}>!</span>}
                  </div>
                  <button onClick={() => removeFile(idx)} className={styles.removeBtn}>
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.securityInfo}>
          <ShieldCheck size={18} />
          <span>Ваши фото удаляются автоматически через 24 часа</span>
        </div>
      </div>
    </div>
  );
}
