import { NextResponse } from 'next/server';

import { CURRENT_CONSENT_VERSIONS, type ConsentType } from '@/lib/legal/consents';
import { authenticatedDb } from '@/lib/personas/api';

const GROUPS: Record<string, ConsentType[]> = {
  registration: ['offer', 'privacy', 'personal_data'],
  generation: ['generation'],
};

export async function GET() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  const { data, error } = await db.from('user_legal_consents')
    .select('consent_type,document_version').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not load consents' }, { status: 500 });

  const rows = (data ?? []) as Array<{ consent_type: ConsentType; document_version: string }>;
  const current = new Set(rows
    .filter((row) => row.document_version === CURRENT_CONSENT_VERSIONS[row.consent_type])
    .map((row) => row.consent_type));
  return NextResponse.json({
    registrationAccepted: GROUPS.registration.every((type) => current.has(type)),
    generationAccepted: current.has('generation'),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  const body = await request.json().catch(() => null) as { consentGroup?: unknown } | null;
  if (!body || typeof body.consentGroup !== 'string' || !GROUPS[body.consentGroup]) {
    return NextResponse.json({ error: 'Invalid consent group' }, { status: 400 });
  }

  for (const consentType of GROUPS[body.consentGroup]) {
    const { data, error } = await db.rpc('record_user_legal_consent', {
      p_consent_type: consentType,
      p_action_context: body.consentGroup === 'registration' ? 'registration' : 'order',
    });
    if (error || data !== true) {
      return NextResponse.json({ error: 'Could not record consent' }, { status: 500 });
    }
  }
  return NextResponse.json({ recorded: true });
}
