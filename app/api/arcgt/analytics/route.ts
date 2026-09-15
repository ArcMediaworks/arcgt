import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

type Trade = {
  id: string;
  symbol: string;
  side: string;
  realized_pnl: number | null;
  opened_at: string | null;
  closed_at: string | null;
  mode: string | null;
  status: string | null;
};

function startOfTodayUTC() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function startOfWeekUTC() {
  const now = startOfTodayUTC();

  const day = now.getUTCDay();

  const diff =
    day === 0
      ? 6
      : day - 1;

  now.setUTCDate(
    now.getUTCDate() - diff
  );

  return now;
}

function startOfMonthUTC() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
}

function sumPnL(
  trades: Trade[]
) {
  return trades.reduce(
    (sum, trade) =>
      sum +
      Number(
        trade.realized_pnl ?? 0
      ),
    0
  );
}

function filterAfter(
  trades: Trade[],
  date: Date
) {
  return trades.filter(
    trade =>
      trade.closed_at &&
      new Date(
        trade.closed_at
      ).getTime() >=
        date.getTime()
  );
}

function calculateDrawdown(
  trades: Trade[]
) {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  const curve: {
    timestamp: string | null;
    equity: number;
    drawdown: number;
  }[] = [];

  for (const trade of trades) {
    equity += Number(
      trade.realized_pnl ?? 0
    );

    if (equity > peak) {
      peak = equity;
    }

    const drawdown =
      peak - equity;

    if (
      drawdown >
      maxDrawdown
    ) {
      maxDrawdown =
        drawdown;
    }

    curve.push({
      timestamp:
        trade.closed_at,
      equity:
        Number(
          equity.toFixed(2)
        ),
      drawdown:
        Number(
          drawdown.toFixed(2)
        ),
    });
  }

  return {
    max_drawdown:
      maxDrawdown,
    curve,
  };
}

function calculateStreaks(
  trades: Trade[]
) {
  let currentType:
    | 'WIN'
    | 'LOSS'
    | 'BREAKEVEN'
    | null = null;

  let currentStreak = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;

  for (const trade of trades) {
    const pnl = Number(
      trade.realized_pnl ?? 0
    );

    const type =
      pnl > 0
        ? 'WIN'
        : pnl < 0
        ? 'LOSS'
        : 'BREAKEVEN';

    if (
      type === currentType
    ) {
      currentStreak += 1;
    } else {
      currentType = type;
      currentStreak = 1;
    }

    if (
      type === 'WIN'
    ) {
      bestWinStreak =
        Math.max(
          bestWinStreak,
          currentStreak
        );
    }

    if (
      type === 'LOSS'
    ) {
      worstLossStreak =
        Math.max(
          worstLossStreak,
          currentStreak
        );
    }
  }

  return {
    current_streak_type:
      currentType,
    current_streak:
      currentStreak,
    best_win_streak:
      bestWinStreak,
    worst_loss_streak:
      worstLossStreak,
  };
}

function calculateSideStats(
  trades: Trade[],
  side: string
) {
  const filtered =
    trades.filter(
      trade =>
        trade.side === side
    );

  const wins =
    filtered.filter(
      trade =>
        Number(
          trade.realized_pnl ?? 0
        ) > 0
    );

  const losses =
    filtered.filter(
      trade =>
        Number(
          trade.realized_pnl ?? 0
        ) < 0
    );

  const pnl =
    sumPnL(filtered);

  return {
    trades:
      filtered.length,

    wins:
      wins.length,

    losses:
      losses.length,

    win_rate:
      filtered.length
        ? Number(
            (
              (wins.length /
                filtered.length) *
              100
            ).toFixed(2)
          )
        : 0,

    net_pnl:
      Number(
        pnl.toFixed(2)
      ),
  };
}

export async function GET() {
  try {
    const {
      data: trades,
      error,
    } = await arcgtSupabase
      .from(
        'open_positions'
      )
      .select(
        `
        id,
        symbol,
        side,
        realized_pnl,
        opened_at,
        closed_at,
        mode,
        status
        `
      )
      .eq(
        'symbol',
        'XAUUSD'
      )
      // DEMO BROKER TRADES ONLY.
      // PAPER trades remain stored historically,
      // but are excluded from broker analytics.
      .eq(
        'mode',
        'DEMO'
      )
      .eq(
        'status',
        'CLOSED'
      )
      .order(
        'closed_at',
        {
          ascending: true,
        }
      );

    if (error) {
      throw error;
    }

    const closedTrades =
      (trades ??
        []) as Trade[];

    const wins =
      closedTrades.filter(
        trade =>
          Number(
            trade.realized_pnl ??
              0
          ) > 0
      );

    const losses =
      closedTrades.filter(
        trade =>
          Number(
            trade.realized_pnl ??
              0
          ) < 0
      );

    const breakeven =
      closedTrades.filter(
        trade =>
          Number(
            trade.realized_pnl ??
              0
          ) === 0
      );

    const totalPnL =
      sumPnL(
        closedTrades
      );

    const grossProfit =
      wins.reduce(
        (sum, trade) =>
          sum +
          Number(
            trade.realized_pnl ??
              0
          ),
        0
      );

    const grossLoss =
      Math.abs(
        losses.reduce(
          (sum, trade) =>
            sum +
            Number(
              trade.realized_pnl ??
                0
            ),
          0
        )
      );

    const averageTrade =
      closedTrades.length
        ? totalPnL /
          closedTrades.length
        : 0;

    const averageWin =
      wins.length
        ? grossProfit /
          wins.length
        : 0;

    const averageLoss =
      losses.length
        ? grossLoss /
          losses.length
        : 0;

    const profitFactor =
      grossLoss > 0
        ? grossProfit /
          grossLoss
        : grossProfit > 0
        ? null
        : 0;

    const winRate =
      closedTrades.length
        ? (wins.length /
            closedTrades.length) *
          100
        : 0;

    const lossRate =
      closedTrades.length
        ? (losses.length /
            closedTrades.length) *
          100
        : 0;

    const expectancy =
      closedTrades.length
        ? (winRate /
            100) *
            averageWin -
          (lossRate /
            100) *
            averageLoss
        : 0;

    const todayTrades =
      filterAfter(
        closedTrades,
        startOfTodayUTC()
      );

    const weekTrades =
      filterAfter(
        closedTrades,
        startOfWeekUTC()
      );

    const monthTrades =
      filterAfter(
        closedTrades,
        startOfMonthUTC()
      );

    const drawdown =
      calculateDrawdown(
        closedTrades
      );

    const streaks =
      calculateStreaks(
        closedTrades
      );

    const buyStats =
      calculateSideStats(
        closedTrades,
        'BUY'
      );

    const sellStats =
      calculateSideStats(
        closedTrades,
        'SELL'
      );

    const bestTrade =
      closedTrades.length
        ? Math.max(
            ...closedTrades.map(
              trade =>
                Number(
                  trade.realized_pnl ??
                    0
                )
            )
          )
        : 0;

    const worstTrade =
      closedTrades.length
        ? Math.min(
            ...closedTrades.map(
              trade =>
                Number(
                  trade.realized_pnl ??
                    0
                )
            )
          )
        : 0;

    return NextResponse.json({
      success: true,

      symbol:
        'XAUUSD',

      mode:
        'DEMO',

      source:
        'FUSION_MARKETS_CTRADER_DEMO',

      overview: {
        total_trades:
          closedTrades.length,

        wins:
          wins.length,

        losses:
          losses.length,

        breakeven:
          breakeven.length,

        win_rate:
          Number(
            winRate.toFixed(
              2
            )
          ),

        net_pnl:
          Number(
            totalPnL.toFixed(
              2
            )
          ),

        gross_profit:
          Number(
            grossProfit.toFixed(
              2
            )
          ),

        gross_loss:
          Number(
            grossLoss.toFixed(
              2
            )
          ),

        profit_factor:
          profitFactor ===
          null
            ? null
            : Number(
                profitFactor.toFixed(
                  2
                )
              ),

        average_trade:
          Number(
            averageTrade.toFixed(
              2
            )
          ),

        average_win:
          Number(
            averageWin.toFixed(
              2
            )
          ),

        average_loss:
          Number(
            averageLoss.toFixed(
              2
            )
          ),

        expectancy:
          Number(
            expectancy.toFixed(
              2
            )
          ),

        best_trade:
          Number(
            bestTrade.toFixed(
              2
            )
          ),

        worst_trade:
          Number(
            worstTrade.toFixed(
              2
            )
          ),

        max_drawdown:
          Number(
            drawdown.max_drawdown.toFixed(
              2
            )
          ),
      },

      periods: {
        today: {
          trades:
            todayTrades.length,

          pnl:
            Number(
              sumPnL(
                todayTrades
              ).toFixed(2)
            ),
        },

        week: {
          trades:
            weekTrades.length,

          pnl:
            Number(
              sumPnL(
                weekTrades
              ).toFixed(2)
            ),
        },

        month: {
          trades:
            monthTrades.length,

          pnl:
            Number(
              sumPnL(
                monthTrades
              ).toFixed(2)
            ),
        },
      },

      streaks,

      side_performance: {
        buy:
          buyStats,

        sell:
          sellStats,
      },

      drawdown_curve:
        drawdown.curve,

      generated_at:
        new Date().toISOString(),
    });
  } catch (
    error: any
  ) {
    console.error(
      'ARCGT analytics error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        mode:
          'DEMO',

        error:
          error?.message ??
          'Failed to calculate DEMO analytics',
      },
      {
        status: 500,
      }
    );
  }
}
