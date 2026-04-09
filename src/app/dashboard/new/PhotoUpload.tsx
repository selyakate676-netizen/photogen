'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './PhotoUpload.module.css';

interface PhotoUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export default function PhotoUpload({ files, setFiles }: PhotoUploadProps) {
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const supabase = createClient();

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${file.size}`;
    setUploadingStatus(prev => ({ ...prev, [fileId]: 'uploading' }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      const { error } = await supabase.storage
        .from('photoshoots')
        .upload(fileName, file);

      if (error) throw error;
      
      setUploadingStatus(prev => ({ ...prev, [fileId]: 'success' }));
    } catch (err) {
      console.error('Upload error:', err);
      setUploadingStatus(prev => ({ ...prev, [fileId]: 'error' }));
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles].slice(0, 25);
    setFiles(newFiles);
    
    // Сразу начинаем загрузку новых файлов
    acceptedFiles.forEach(file => uploadFile(file));
  }, [files, setFiles]);

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
