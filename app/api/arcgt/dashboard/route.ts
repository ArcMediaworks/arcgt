import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      dashboardResult,
      healthResult,
      accountResult,
      positionResult,
      performanceResult,
      signalsResult,
      riskResult,
      closedTradesResult,
      readinessResult,
    ] = await Promise.all([
      // Latest dashboard snapshot
      arcgtSupabase
        .from('dashboard_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Latest system health
      arcgtSupabase
        .from('system_health_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Account
      arcgtSupabase
        .from('account_state')
        .select('*')
        .eq('account_id', 'main')
        .limit(1)
        .maybeSingle(),

      // Current open paper position
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'PAPER')
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Latest performance snapshot
      arcgtSupabase
        .from('performance_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Recent AI signals
      arcgtSupabase
        .from('signals')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent risk decisions
      arcgtSupabase
        .from('risk_decisions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', { ascending: false })
        .limit(10),

      // Closed paper trades
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'PAPER')
        .eq('status', 'CLOSED')
        .order('closed_at', { ascending: true }),

      // Workflow 14 readiness
      arcgtSupabase
        .from('readiness_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'PAPER')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const errors = [
      dashboardResult.error,
      healthResult.error,
      accountResult.error,
      positionResult.error,
      performanceResult.error,
      signalsResult.error,
      riskResult.error,
      closedTradesResult.error,
      readinessResult.error,
    ]
      .filter(Boolean)
      .map((error) => error?.message);

    const closedTrades =
      closedTradesResult.data ?? [];

    // Build cumulative equity/P&L curve
    let cumulativePnl = 0;

    const equityCurve = closedTrades.map((trade) => {
      const realizedPnl = Number(
        trade.realized_pnl ?? 0
      );

      cumulativePnl += realizedPnl;

      return {
        timestamp:
          trade.closed_at ??
          trade.settled_at ??
          null,

        realized_pnl: realizedPnl,

        cumulative_pnl: Number(
          cumulativePnl.toFixed(2)
        ),
      };
    });

    return NextResponse.json({
      success: errors.length === 0,

      dashboard:
        dashboardResult.data?.payload ??
        null,

      health:
        healthResult.data ??
        null,

      account:
        accountResult.data ??
        null,

      open_position:
        positionResult.data ??
        null,

      performance:
        performanceResult.data ??
        null,

      readiness:
        readinessResult.data ??
        null,

      recent_signals:
        signalsResult.data ??
        [],

      recent_risk_decisions:
        riskResult.data ??
        [],

      closed_trades:
        closedTrades,

      equity_curve:
        equityCurve,

      errors,

      server_time:
        new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      'ARCGT dashboard GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        dashboard: null,
        health: null,
        account: null,
        open_position: null,
        performance: null,
        readiness: null,

        recent_signals: [],
        recent_risk_decisions: [],
        closed_trades: [],
        equity_curve: [],

        errors: [
          error?.message ??
            'Unknown dashboard error',
        ],

        server_time:
          new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}