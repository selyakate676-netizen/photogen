'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitPayButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      className="btn btn-primary btn-lg" 
      style={{ minWidth: '250px', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}
      disabled={pending}
    >
      {pending ? 'Запуск генерации...' : 'Оплатить (Эмуляция)'}
    </button>
  );
}
