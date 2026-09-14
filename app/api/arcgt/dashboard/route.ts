import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

const BROKER_ACCOUNT_MAX_AGE_MS = 30_000;

function numberOrNull(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export async function GET() {
  try {
    const [
      dashboardResult,
      healthResult,
      accountResult,
      brokerAccountResult,
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

      // ARCGT internally calculated account state
      arcgtSupabase
        .from('account_state')
        .select('*')
        .eq('account_id', 'main')
        .limit(1)
        .maybeSingle(),

      // Actual Fusion Markets cTrader DEMO account
      arcgtSupabase
        .from('broker_account_state')
        .select('*')
        .eq('broker', 'Fusion Markets')
        .eq('environment', 'DEMO')
        .order('updated_at', {
          ascending: false,
        })
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

      // Historical PAPER + DEMO trades
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .in('mode', ['PAPER', 'DEMO'])
        .eq('status', 'CLOSED')
        .order('closed_at', {
          ascending: true,
        }),

      // Latest readiness snapshot
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
      brokerAccountResult.error,
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

    // ==================================================
    // ACTUAL BROKER ACCOUNT
    // ==================================================

    const brokerRow =
      brokerAccountResult.data;

    const brokerUpdatedAt =
      brokerRow?.updated_at ??
      brokerRow?.broker_updated_at ??
      null;

    const brokerUpdatedMs =
      brokerUpdatedAt
        ? new Date(
            brokerUpdatedAt
          ).getTime()
        : Number.NaN;

    const brokerAgeMs =
      Number.isFinite(brokerUpdatedMs)
        ? Date.now() - brokerUpdatedMs
        : null;

    const brokerFresh =
      brokerAgeMs !== null &&
      brokerAgeMs >= 0 &&
      brokerAgeMs <=
        BROKER_ACCOUNT_MAX_AGE_MS;

    const brokerConnected =
      brokerRow?.connected === true;

    const brokerAuthorized =
      brokerRow?.app_authorized === true &&
      brokerRow?.account_authorized === true;

    const brokerSourceAvailable =
      brokerRow?.available === true;

    const brokerDataComplete =
      numberOrNull(
        brokerRow?.balance
      ) !== null &&
      numberOrNull(
        brokerRow?.equity
      ) !== null &&
      numberOrNull(
        brokerRow?.margin
      ) !== null &&
      numberOrNull(
        brokerRow?.free_margin
      ) !== null;

    const brokerAvailable =
      Boolean(brokerRow) &&
      brokerFresh &&
      brokerConnected &&
      brokerAuthorized &&
      brokerSourceAvailable &&
      brokerDataComplete;

    const brokerAccount = {
      available:
        brokerAvailable,

      fresh:
        brokerFresh,

      source:
        brokerRow?.source ??
        null,

      broker:
        brokerRow?.broker ??
        null,

      environment:
        brokerRow?.environment ??
        null,

      account_id:
        brokerRow?.account_id ??
        null,

      trader_login:
        brokerRow?.trader_login ??
        null,

      currency:
        brokerRow?.currency ??
        accountResult.data?.currency ??
        'USD',

      balance:
        brokerAvailable
          ? numberOrNull(
              brokerRow?.balance
            )
          : null,

      equity:
        brokerAvailable
          ? numberOrNull(
              brokerRow?.equity
            )
          : null,

      margin:
        brokerAvailable
          ? numberOrNull(
              brokerRow?.margin
            )
          : null,

      free_margin:
        brokerAvailable
          ? numberOrNull(
              brokerRow?.free_margin
            )
          : null,

      unrealized_pnl:
        brokerAvailable
          ? numberOrNull(
              brokerRow?.unrealized_pnl
            )
          : null,

      connected:
        brokerConnected,

      app_authorized:
        brokerRow?.app_authorized ===
        true,

      account_authorized:
        brokerRow?.account_authorized ===
        true,

      broker_available:
        brokerSourceAvailable,

      stale:
        Boolean(brokerRow) &&
        !brokerFresh,

      age_ms:
        brokerAgeMs,

      broker_updated_at:
        brokerRow?.broker_updated_at ??
        null,

      updated_at:
        brokerUpdatedAt,
    };

    // ==================================================
    // EQUITY / P&L CURVE
    // ==================================================

    let cumulativePnl = 0;

    const equityCurve =
      closedTrades.map((trade) => {
        const realizedPnl =
          Number(
            trade.realized_pnl ?? 0
          );

        cumulativePnl +=
          realizedPnl;

        return {
          timestamp:
            trade.closed_at ??
            trade.settled_at ??
            null,

          realized_pnl:
            realizedPnl,

          cumulative_pnl:
            Number(
              cumulativePnl.toFixed(2)
            ),
        };
      });

    return NextResponse.json({
      success:
        errors.length === 0,

      dashboard:
        dashboardResult.data
          ?.payload ??
        null,

      health:
        healthResult.data ??
        null,

      // ARCGT internal calculated account
      account:
        accountResult.data ??
        null,

      // Actual Fusion Markets cTrader DEMO account
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
          fresh: false,

          source: null,
          broker: null,
          environment: null,

          account_id: null,
          trader_login: null,

          currency: 'USD',

          balance: null,
          equity: null,
          margin: null,
          free_margin: null,
          unrealized_pnl: null,

          connected: false,
          app_authorized: false,
          account_authorized: false,
          broker_available: false,

          stale: true,
          age_ms: null,

          broker_updated_at: null,
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
