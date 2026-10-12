import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  const photoshootId = new URL(request.url).searchParams.get('photoshootId');
  if (!photoshootId) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });

  const { data: photoshoot } = await supabase
    .from('photoshoots')
    .select('id,status,payment_id,payment_source')
    .eq('id', photoshootId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!photoshoot) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (!photoshoot.payment_id || photoshoot.payment_source !== 'rub') {
    return NextResponse.json({ photoshootStatus: photoshoot.status, paymentStatus: 'none' });
  }

  const { data: payment } = await supabase
    .from('cloudpayments_payments')
    .select('status')
    .eq('id', photoshoot.payment_id)
    .eq('photoshoot_id', photoshoot.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({ photoshootStatus: photoshoot.status, paymentStatus: payment.status });
}
