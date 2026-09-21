'use client';

import { useFormStatus } from 'react-dom';

type SubmitPayButtonProps = {
  disabled: boolean;
  priceCrystals: number;
};

export default function SubmitPayButton({ disabled, priceCrystals }: SubmitPayButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn btn-primary btn-lg"
      disabled={disabled || pending}
    >
      {pending ? 'Проверяем баланс...' : `Оплатить ${priceCrystals} кристаллами`}
    </button>
  );
}