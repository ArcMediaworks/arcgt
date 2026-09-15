import { NextResponse } from 'next/server';
import { arcgtSupabase } from '@/lib/arcgt-supabase';

export const dynamic = 'force-dynamic';

type ClosedDemoTrade = {
  id: string;
  signal_id: string | null;
  side: string | null;
  realized_pnl: number | string | null;
  closed_at: string | null;
};

type SignalRow = {
  id: string;
  strategy: string | null;
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

export async function GET() {
  try {
    /*
     * Authoritative source:
     *
     * open_positions
     *   -> mode = DEMO
     *   -> status = CLOSED
     *   -> realized_pnl
     *
     * Strategy attribution:
     *
     * open_positions.signal_id
     *   -> signals.id
     *   -> signals.strategy
     *
     * PAPER trades and legacy strategy snapshots
     * are intentionally excluded.
     */

    const { data: tradeData, error: tradeError } =
      await arcgtSupabase
        .from('open_positions')
        .select(
          'id, signal_id, side, realized_pnl, closed_at'
        )
        .eq('symbol', 'XAUUSD')
        .eq('mode', 'DEMO')
        .eq('status', 'CLOSED')
        .not('realized_pnl', 'is', null)
        .order('closed_at', {
          ascending: true,
        });

    if (tradeError) {
      throw tradeError;
    }

    const trades =
      (tradeData ?? []) as ClosedDemoTrade[];

    const signalIds = Array.from(
      new Set(
        trades
          .map((trade) => trade.signal_id)
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              id.length > 0
          )
      )
    );

    let signals: SignalRow[] = [];

    if (signalIds.length > 0) {
      const {
        data: signalData,
        error: signalError,
      } = await arcgtSupabase
        .from('signals')
        .select('id, strategy')
        .in('id', signalIds);

      if (signalError) {
        throw signalError;
      }

      signals =
        (signalData ?? []) as SignalRow[];
    }

    const strategyBySignalId =
      new Map<string, string>();

    for (const signal of signals) {
      strategyBySignalId.set(
        signal.id,
        signal.strategy?.trim() ||
          'unknown'
      );
    }

    const grouped = new Map<
      string,
      ClosedDemoTrade[]
    >();

    for (const trade of trades) {
      const strategy =
        trade.signal_id
          ? strategyBySignalId.get(
              trade.signal_id
            ) ?? 'unknown'
          : 'unknown';

      const existing =
        grouped.get(strategy) ?? [];

      existing.push(trade);

      grouped.set(strategy, existing);
    }

    const strategies = Array.from(
      grouped.entries()
    ).map(([strategy, strategyTrades]) => {
      const pnls = strategyTrades.map(
        (trade) =>
          Number(trade.realized_pnl ?? 0)
      );

      const wins = pnls.filter(
        (pnl) => pnl > 0
      );

      const losses = pnls.filter(
        (pnl) => pnl < 0
      );

      const breakeven = pnls.filter(
        (pnl) => pnl === 0
      ).length;

      const totalTrades = pnls.length;

      const grossProfit = wins.reduce(
        (sum, pnl) => sum + pnl,
        0
      );

      const grossLoss = Math.abs(
        losses.reduce(
          (sum, pnl) => sum + pnl,
          0
        )
      );

      const netPnl = pnls.reduce(
        (sum, pnl) => sum + pnl,
        0
      );

      const averageTrade =
        totalTrades > 0
          ? netPnl / totalTrades
          : 0;

      const averageWin =
        wins.length > 0
          ? grossProfit / wins.length
          : 0;

      const averageLoss =
        losses.length > 0
          ? -(
              grossLoss /
              losses.length
            )
          : 0;

      const winRate =
        totalTrades > 0
          ? (wins.length /
              totalTrades) *
            100
          : 0;

      const expectancy =
        totalTrades > 0
          ? netPnl / totalTrades
          : 0;

      const profitFactor =
        grossLoss > 0
          ? grossProfit / grossLoss
          : grossProfit > 0
            ? null
            : 0;

      const bestTrade =
        pnls.length > 0
          ? Math.max(...pnls)
          : 0;

      const worstTrade =
        pnls.length > 0
          ? Math.min(...pnls)
          : 0;

      const latestClosedAt =
        strategyTrades
          .map(
            (trade) =>
              trade.closed_at
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
          .sort()
          .at(-1) ?? null;

      return {
        id: `demo-${strategy}`,

        symbol: 'XAUUSD',
        mode: 'DEMO',

        strategy,

        total_trades: totalTrades,

        wins: wins.length,
        losses: losses.length,
        breakeven,

        win_rate:
          round2(winRate),

        gross_profit:
          round2(grossProfit),

        gross_loss:
          round2(grossLoss),

        net_pnl:
          round2(netPnl),

        average_trade:
          round2(averageTrade),

        average_win:
          round2(averageWin),

        average_loss:
          round2(averageLoss),

        expectancy:
          round2(expectancy),

        profit_factor:
          profitFactor == null
            ? null
            : round2(
                profitFactor
              ),

        best_trade:
          round2(bestTrade),

        worst_trade:
          round2(worstTrade),

        created_at:
          latestClosedAt ??
          new Date().toISOString(),

        paper_trades: 0,
        demo_trades: totalTrades,
      };
    });

    strategies.sort(
      (a, b) =>
        b.net_pnl - a.net_pnl
    );

    const totalNetPnl =
      strategies.reduce(
        (sum, strategy) =>
          sum +
          Number(
            strategy.net_pnl ?? 0
          ),
        0
      );

    return NextResponse.json({
      success: true,

      symbol: 'XAUUSD',

      mode: 'DEMO',

      source:
        'CLOSED_DEMO_BROKER_TRADES',

      strategies,

      summary: {
        strategy_count:
          strategies.length,

        total_trades:
          trades.length,

        total_net_pnl:
          round2(totalNetPnl),

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
      'ARCGT DEMO strategy performance error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        symbol: 'XAUUSD',

        mode: 'DEMO',

        source:
          'CLOSED_DEMO_BROKER_TRADES',

        strategies: [],

        summary: null,

        error:
          error?.message ??
          'Failed to load DEMO strategy performance',
      },
      {
        status: 500,
      }
    );
  }
}
