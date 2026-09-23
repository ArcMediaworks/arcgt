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

      // CLOSED DEMO broker trades ONLY.
      // PAPER history remains in Supabase but must not
      // contaminate DEMO dashboard performance.
      arcgtSupabase
        .from('open_positions')
        .select('*')
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'DEMO')
        .eq('status', 'CLOSED')
        .order('closed_at', {
          ascending: true,
        }),
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
     * ==================================================
     * DEMO READINESS
     * ==================================================
     *
     * Authoritative source:
     * open_positions
     *   symbol = XAUUSD
     *   mode = DEMO
     *   status = CLOSED
     *
     * PAPER trades and legacy readiness snapshots are
     * intentionally excluded.
     */

    const demoPnls = closedTrades.map(
      (trade: any) =>
        Number(trade.realized_pnl ?? 0)
    );

    const readinessTotalTrades =
      demoPnls.length;

    const readinessWins =
      demoPnls.filter(
        (pnl: number) => pnl > 0
      ).length;

    const readinessLosses =
      demoPnls.filter(
        (pnl: number) => pnl < 0
      ).length;

    const readinessWinRate =
      readinessTotalTrades > 0
        ? (readinessWins /
            readinessTotalTrades) *
          100
        : 0;

    const readinessNetPnl =
      demoPnls.reduce(
        (sum: number, pnl: number) =>
          sum + pnl,
        0
      );

    const readinessGrossProfit =
      demoPnls
        .filter(
          (pnl: number) => pnl > 0
        )
        .reduce(
          (
            sum: number,
            pnl: number
          ) => sum + pnl,
          0
        );

    const readinessGrossLoss =
      Math.abs(
        demoPnls
          .filter(
            (pnl: number) => pnl < 0
          )
          .reduce(
            (
              sum: number,
              pnl: number
            ) => sum + pnl,
            0
          )
      );

    const readinessProfitFactor =
      readinessGrossLoss > 0
        ? readinessGrossProfit /
          readinessGrossLoss
        : readinessGrossProfit > 0
          ? null
          : 0;

    const readinessExpectancy =
      readinessTotalTrades > 0
        ? readinessNetPnl /
          readinessTotalTrades
        : 0;

    let readinessPeak = 0;
    let readinessCumulative = 0;
    let readinessMaxDrawdown = 0;

    for (const pnl of demoPnls) {
      readinessCumulative += pnl;

      if (
        readinessCumulative >
        readinessPeak
      ) {
        readinessPeak =
          readinessCumulative;
      }

      const drawdown =
        readinessPeak -
        readinessCumulative;

      if (
        drawdown >
        readinessMaxDrawdown
      ) {
        readinessMaxDrawdown =
          drawdown;
      }
    }

    let currentLossStreak = 0;

    for (
      let i = demoPnls.length - 1;
      i >= 0;
      i--
    ) {
      if (demoPnls[i] < 0) {
        currentLossStreak++;
      } else {
        break;
      }
    }

    /*
     * ==================================================
     * READINESS SCORE
     * ==================================================
     *
     * Trade Count:    30 points
     * Profitability:  30 points
     * Drawdown:       20 points
     * Consistency:    20 points
     *
     * 50 DEMO trades = full trade-count score.
     * Minimum 30 DEMO trades required for live review.
     */

    const tradeCountScore =
      Math.min(
        30,
        Math.floor(
          (readinessTotalTrades / 50) *
            30
        )
      );

    let profitabilityScore = 0;

    if (readinessTotalTrades > 0) {
      if (
        readinessNetPnl > 0 &&
        readinessWinRate >= 50
      ) {
        profitabilityScore = 30;
      } else if (
        readinessNetPnl > 0
      ) {
        profitabilityScore = 20;
      } else if (
        readinessNetPnl === 0
      ) {
        profitabilityScore = 10;
      }
    }

    let drawdownScore = 20;

    if (readinessMaxDrawdown > 0) {
      const drawdownVsProfit =
        readinessGrossProfit > 0
          ? readinessMaxDrawdown /
            readinessGrossProfit
          : 1;

      if (
        drawdownVsProfit <= 0.25
      ) {
        drawdownScore = 20;
      } else if (
        drawdownVsProfit <= 0.5
      ) {
        drawdownScore = 15;
      } else if (
        drawdownVsProfit <= 1
      ) {
        drawdownScore = 10;
      } else {
        drawdownScore = 0;
      }
    }

    let consistencyScore = 0;

    if (readinessTotalTrades > 0) {
      if (
        readinessWinRate >= 60 &&
        currentLossStreak <= 2
      ) {
        consistencyScore = 20;
      } else if (
        readinessWinRate >= 50 &&
        currentLossStreak <= 3
      ) {
        consistencyScore = 15;
      } else if (
        currentLossStreak <= 3
      ) {
        consistencyScore = 10;
      } else {
        consistencyScore = 0;
      }
    }

    const readinessScore =
      tradeCountScore +
      profitabilityScore +
      drawdownScore +
      consistencyScore;

    const readinessReasons: string[] =
      [];

    if (readinessTotalTrades < 30) {
      readinessReasons.push(
        `Need at least 30 closed DEMO trades before live review. Current: ${readinessTotalTrades}.`
      );
    }

    if (readinessNetPnl <= 0) {
      readinessReasons.push(
        'DEMO net P&L must be positive.'
      );
    }

    if (readinessWinRate < 50) {
      readinessReasons.push(
        'DEMO win rate is below 50%.'
      );
    }

    if (currentLossStreak > 3) {
      readinessReasons.push(
        'Current DEMO losing streak exceeds 3 trades.'
      );
    }

    if (readinessScore < 70) {
      readinessReasons.push(
        `Readiness score must reach at least 70/100. Current: ${readinessScore}/100.`
      );
    }

    const readinessStatus =
      readinessTotalTrades >= 30 &&
      readinessNetPnl > 0 &&
      readinessWinRate >= 50 &&
      currentLossStreak <= 3 &&
      readinessScore >= 70
        ? 'READY_FOR_LIVE_REVIEW'
        : 'NOT_READY';

    const demoReadiness = {
      symbol: 'XAUUSD',
      mode: 'DEMO',
      source:
        'CLOSED_DEMO_BROKER_TRADES',

      total_trades:
        readinessTotalTrades,

      wins:
        readinessWins,

      losses:
        readinessLosses,

      win_rate:
        Number(
          readinessWinRate.toFixed(2)
        ),

      profit_factor:
        readinessProfitFactor == null
          ? null
          : Number(
              readinessProfitFactor.toFixed(
                2
              )
            ),

      expectancy:
        Number(
          readinessExpectancy.toFixed(2)
        ),

      net_pnl:
        Number(
          readinessNetPnl.toFixed(2)
        ),

      max_drawdown:
        Number(
          readinessMaxDrawdown.toFixed(2)
        ),

      current_loss_streak:
        currentLossStreak,

      trade_count_score:
        tradeCountScore,

      profitability_score:
        profitabilityScore,

      drawdown_score:
        drawdownScore,

      consistency_score:
        consistencyScore,

      readiness_score:
        readinessScore,

      readiness_status:
        readinessStatus,

      reasons:
        readinessReasons,
    };

    /*
     * ==================================================
     * ACTUAL BROKER ACCOUNT
     * ==================================================
     */

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
      Number.isFinite(
        brokerUpdatedMs
      )
        ? Date.now() -
          brokerUpdatedMs
        : null;

    const brokerFresh =
      brokerAgeMs !== null &&
      brokerAgeMs >= 0 &&
      brokerAgeMs <=
        BROKER_ACCOUNT_MAX_AGE_MS;

    const brokerConnected =
      brokerRow?.connected === true;

    const brokerAuthorized =
      brokerRow?.app_authorized ===
        true &&
      brokerRow?.account_authorized ===
        true;

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

    const brokerUnrealizedPnl =
      brokerAvailable
        ? numberOrNull(
            brokerRow?.unrealized_pnl
          )
        : null;

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
        brokerUnrealizedPnl,

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

    /*
     * ==================================================
     * CURRENT DEMO POSITION + TRADE DURATION MANAGER
     * ==================================================
     *
     * n8n remains authoritative for ACTUAL position
     * management and broker closing.
     *
     * This API derives the current management stage for
     * dashboard visibility and exposes the persisted
     * management_exit_* fields written by n8n.
     */

    const rawOpenPosition =
      positionResult.data ?? null;

    const openPosition =
      rawOpenPosition
        ? (() => {
            const openedAt =
              rawOpenPosition.opened_at
                ? new Date(
                    rawOpenPosition.opened_at
                  ).getTime()
                : Number.NaN;

            const now =
              Date.now();

            const durationMinutes =
              Number.isFinite(openedAt)
                ? Math.max(
                    0,
                    Math.floor(
                      (now -
                        openedAt) /
                        60_000
                    )
                  )
                : null;

            let managementStage =
              'UNKNOWN';

            let managementAction =
              'UNKNOWN';

            let nextManagementEvent:
              string | null = null;

            let minutesUntilNextStage:
              number | null = null;

            if (
              durationMinutes !== null
            ) {
              if (
                durationMinutes < 30
              ) {
                managementStage =
                  'NORMAL';

                managementAction =
                  'MONITOR';

                nextManagementEvent =
                  'AI_REASSESSMENT_WINDOW';

                minutesUntilNextStage =
                  30 -
                  durationMinutes;
              } else if (
                durationMinutes < 60
              ) {
                managementStage =
                  'REASSESSMENT_WINDOW';

                managementAction =
                  'AI_MANAGED';

                nextManagementEvent =
                  'MAX_TIME_EXIT';

                minutesUntilNextStage =
                  60 -
                  durationMinutes;
              } else {
                managementStage =
                  'TIME_LIMIT';

                managementAction =
                  rawOpenPosition
                    .management_exit_pending ===
                  true
                    ? 'EXIT_PENDING'
                    : 'EXIT_EXPECTED';

                nextManagementEvent =
                  null;

                minutesUntilNextStage =
                  0;
              }
            }

            if (
              rawOpenPosition
                .management_exit_pending ===
              true
            ) {
              managementAction =
                'EXIT_PENDING';
            }

            return {
              ...rawOpenPosition,

              // Actual broker floating P&L
              unrealized_pnl:
                brokerUnrealizedPnl,

              // Dashboard representation of the
              // existing n8n Trade Duration Manager.
              trade_management: {
                enabled: true,

                policy:
                  '30_60_MINUTE_MANAGER',

                duration_minutes:
                  durationMinutes,

                stage:
                  managementStage,

                action:
                  managementAction,

                reassessment_window:
                  durationMinutes !==
                    null &&
                  durationMinutes >= 30 &&
                  durationMinutes < 60,

                hard_time_limit_reached:
                  durationMinutes !==
                    null &&
                  durationMinutes >= 60,

                next_event:
                  nextManagementEvent,

                minutes_until_next_stage:
                  minutesUntilNextStage,

                exit_pending:
                  rawOpenPosition
                    .management_exit_pending ===
                  true,

                exit_source:
                  rawOpenPosition
                    .management_exit_source ??
                  null,

                exit_reason:
                  rawOpenPosition
                    .management_exit_reason ??
                  null,

                exit_at:
                  rawOpenPosition
                    .management_exit_at ??
                  null,

                exit_data:
                  rawOpenPosition
                    .management_exit_data ??
                  null,
              },
            };
          })()
        : null;

    /*
     * ==================================================
     * DEMO EQUITY / REALIZED P&L CURVE
     * ==================================================
     */

    let cumulativePnl = 0;

    const equityCurve =
      closedTrades.map(
        (trade: any) => {
          const realizedPnl =
            Number(
              trade.realized_pnl ??
                0
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
                cumulativePnl.toFixed(
                  2
                )
              ),
          };
        }
      );

    /*
     * ==================================================
     * DEMO CLOSED-TRADE SUMMARY
     * ==================================================
     */

    const demoNetPnl =
      Number(
        cumulativePnl.toFixed(2)
      );

    const demoTotalTrades =
      closedTrades.length;

    const demoWinningTrades =
      closedTrades.filter(
        (trade: any) =>
          Number(
            trade.realized_pnl ??
              0
          ) > 0
      ).length;

    const demoLosingTrades =
      closedTrades.filter(
        (trade: any) =>
          Number(
            trade.realized_pnl ??
              0
          ) < 0
      ).length;

    const demoWinRate =
      demoTotalTrades > 0
        ? Number(
            (
              (demoWinningTrades /
                demoTotalTrades) *
              100
            ).toFixed(2)
          )
        : 0;

    const demoAverageTrade =
      demoTotalTrades > 0
        ? Number(
            (
              demoNetPnl /
              demoTotalTrades
            ).toFixed(2)
          )
        : 0;

    const demoPerformance = {
      mode: 'DEMO',
      source: 'open_positions',

      total_trades:
        demoTotalTrades,

      winning_trades:
        demoWinningTrades,

      losing_trades:
        demoLosingTrades,

      win_rate:
        demoWinRate,

      net_pnl:
        demoNetPnl,

      average_trade:
        demoAverageTrade,
    };

    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

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

      // Current DEMO position with broker P&L
      // and Trade Duration Manager state.
      open_position:
        openPosition,

      // Legacy snapshot retained for compatibility.
      // Do not treat as authoritative DEMO performance.
      performance:
        performanceResult.data ??
        null,

      // Authoritative closed DEMO statistics.
      demo_performance:
        demoPerformance,

      // Authoritative DEMO-only readiness.
      readiness:
        demoReadiness,

      recent_signals:
        signalsResult.data ??
        [],

      recent_risk_decisions:
        riskResult.data ??
        [],

      // DEMO ONLY
      closed_trades:
        closedTrades,

      // DEMO ONLY
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

        demo_performance: {
          mode: 'DEMO',
          source: 'open_positions',

          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,

          win_rate: 0,
          net_pnl: 0,
          average_trade: 0,
        },

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