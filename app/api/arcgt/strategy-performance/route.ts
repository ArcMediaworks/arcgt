import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } =
      await arcgtSupabase
        .from('strategy_performance_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'PAPER')
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    const latestByStrategy = new Map<
      string,
      any
    >();

    for (const row of rows) {
      const strategy =
        row.strategy || 'unknown';

      if (!latestByStrategy.has(strategy)) {
        latestByStrategy.set(
          strategy,
          row
        );
      }
    }

    const strategies = Array.from(
      latestByStrategy.values()
    ).sort(
      (a, b) =>
        Number(b.net_pnl ?? 0) -
        Number(a.net_pnl ?? 0)
    );

    const totalNetPnl =
      strategies.reduce(
        (sum, row) =>
          sum +
          Number(row.net_pnl ?? 0),
        0
      );

    return NextResponse.json({
      success: true,

      symbol: 'XAUUSD',
      mode: 'PAPER',

      strategies,

      summary: {
        strategy_count:
          strategies.length,

        total_net_pnl:
          Number(
            totalNetPnl.toFixed(2)
          ),

        best_strategy:
          strategies[0]?.strategy ??
          null,

        best_strategy_pnl:
          strategies[0]?.net_pnl ??
          0,
      },

      generated_at:
        new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      'ARCGT strategy performance error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        symbol: 'XAUUSD',
        mode: 'PAPER',
        strategies: [],
        summary: null,
        error:
          error?.message ??
          'Failed to load strategy performance',
      },
      {
        status: 500,
      }
    );
  }
}