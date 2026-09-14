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
        .order('created_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      // Latest system health
      arcgtSupabase
        .from('system_health_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('checked_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      // ARCGT calculated account state
      arcgtSupabase
        .from('account_state')
        .select('*')
        .eq('account_id', 'main')
        .limit(1)
        .maybeSingle(),

      // Current DEMO broker position
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'DEMO')
        .eq('status', 'OPEN')
        .order('opened_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      // Latest performance snapshot
      arcgtSupabase
        .from('performance_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('calculated_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle(),

      // Recent AI signals
      arcgtSupabase
        .from('signals')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', {
          ascending: false,
        })
        .limit(10),

      // Recent risk decisions
      arcgtSupabase
        .from('risk_decisions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', {
          ascending: false,
        })
        .limit(10),

      // Closed ARCGT trades
      //
      // Keep both PAPER + DEMO here for now because
      // account_state currently contains the historical
      // accumulated ARCGT performance from both phases.
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .in('mode', ['PAPER', 'DEMO'])
        .eq('status', 'CLOSED')
        .order('closed_at', {
          ascending: true,
        }),

      // Latest readiness snapshot.
      //
      // Do not hard-code PAPER here anymore.
      // Return the newest readiness calculation regardless
      // of mode until the readiness workflow is converted
      // fully to DEMO.
      arcgtSupabase
        .from('readiness_snapshots')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .order('created_at', {
          ascending: false,
        })
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
      .map(
        (error) =>
          error?.message ??
          'Unknown Supabase error'
      );

    const closedTrades =
      closedTradesResult.data ?? [];

    /*
     * --------------------------------------------------
     * BROKER ACCOUNT
     * --------------------------------------------------
     *
     * IMPORTANT:
     *
     * account_state is currently ARCGT's internally
     * calculated account state.
     *
     * It must NOT be presented as the real Fusion /
     * cTrader broker account.
     *
     * Once the broker bridge can retrieve the actual
     * cTrader account balance/equity/margin, we will
     * synchronize those values into Supabase and switch
     * this object to available: true.
     */

    const brokerAccount = {
      available: false,

      source: null,

      currency:
        accountResult.data?.currency ??
        'USD',

      balance: null,
      equity: null,
      margin: null,
      free_margin: null,

      updated_at: null,
    };

    /*
     * --------------------------------------------------
     * EQUITY / P&L CURVE
     * --------------------------------------------------
     */

    let cumulativePnl = 0;

    const equityCurve =
      closedTrades.map((trade) => {
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

      /*
       * Existing internally calculated ARCGT account.
       */
      account:
        accountResult.data ??
        null,

      /*
       * Real broker-account interface.
       *
       * The frontend already knows how to prefer this
       * object automatically once available === true.
       */
      broker_account:
        brokerAccount,

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

        broker_account: {
          available: false,
          source: null,
          currency: 'USD',
          balance: null,
          equity: null,
          margin: null,
          free_margin: null,
          updated_at: null,
        },

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