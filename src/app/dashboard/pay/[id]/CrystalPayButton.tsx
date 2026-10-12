'use client';

import { useFormStatus } from 'react-dom';

export default function CrystalPayButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
      {pending ? 'Запускаем фотосессию…' : 'Оплатить кристаллами'}
    </button>
  );
}
