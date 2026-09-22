import { redirect } from 'next/navigation';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  redirect('/account/generated');
}