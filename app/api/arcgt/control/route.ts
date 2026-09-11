import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      tradingStatusResult,
      riskSettingsResult,
    ] = await Promise.all([
      arcgtSupabase
        .from('trading_status')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .limit(1)
        .maybeSingle(),

      arcgtSupabase
        .from('risk_settings')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .limit(1)
        .maybeSingle(),
    ]);

    const errors = [
      tradingStatusResult.error,
      riskSettingsResult.error,
    ]
      .filter(Boolean)
      .map(error => error?.message);

    return NextResponse.json({
      success: errors.length === 0,

      trading_status:
        tradingStatusResult.data ?? null,

      risk_settings:
        riskSettingsResult.data ?? null,

      mode: 'DEMO',

      errors,

      server_time:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      'ARCGT control GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load ARCGT controls',
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error:
        'Remote trading controls are disabled until dashboard authentication is enabled.',
    },
    {
      status: 403,
    }
  );
}