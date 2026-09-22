import { NextResponse } from 'next/server';
import { CURRENT_CONSENT_VERSIONS, type ConsentType } from '@/lib/legal/consents';
import { authenticatedDb } from '@/lib/personas/api';

const CONSENT_TYPES = new Set<ConsentType>(['privacy', 'personal_data', 'generation']);

export async function GET() {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { data, error } = await db
    .from('user_consents')
    .select('consent_type,document_version,accepted_at')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Could not load consents' }, { status: 500 });

  const accepted: Partial<Record<ConsentType, { version: string; acceptedAt: string; current: true }>> = {};
  for (const row of (data ?? []) as Array<{ consent_type: ConsentType; document_version: string; accepted_at: string }>) {
    if (row.document_version === CURRENT_CONSENT_VERSIONS[row.consent_type]) {
      accepted[row.consent_type] = {
        version: row.document_version,
        acceptedAt: row.accepted_at,
        current: true,
      };
    }
  }

  return NextResponse.json({ accepted, currentVersions: CURRENT_CONSENT_VERSIONS });
}

export async function POST(request: Request) {
  const { db, user } = await authenticatedDb();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const body = await request.json().catch(() => null) as { consentType?: unknown } | null;
  if (!body || typeof body.consentType !== 'string' || !CONSENT_TYPES.has(body.consentType as ConsentType)) {
    return NextResponse.json({ error: 'Invalid consent type' }, { status: 400 });
  }

  const consentType = body.consentType as ConsentType;
  const documentVersion = CURRENT_CONSENT_VERSIONS[consentType];
  const { error } = await db.from('user_consents').upsert({
    user_id: user.id,
    consent_type: consentType,
    document_version: documentVersion,
  }, { onConflict: 'user_id,consent_type,document_version', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: 'Could not record consent' }, { status: 500 });
  return NextResponse.json({ consentType, documentVersion }, { status: 201 });
}
