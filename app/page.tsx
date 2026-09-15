'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

type DashboardData = {
  success: boolean;

  dashboard: any;
  health: any;

  account: any;

  broker_account?: {
    available: boolean;
    source?: string;
    currency?: string;

    balance?: number | null;
    equity?: number | null;
    margin?: number | null;
    free_margin?: number | null;

    updated_at?: string | null;
  } | null;

  open_position: any;

  performance: any;

  demo_performance?: {
    mode: string;
    source: string;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    net_pnl: number;
    average_trade: number;
  };

  readiness: any;

  recent_signals: any[];
  recent_risk_decisions: any[];
  closed_trades: any[];

  equity_curve: {
    timestamp: string | null;
    realized_pnl: number;
    cumulative_pnl: number;
  }[];
};

type ControlData = {
  success: boolean;
  trading_status: any;
  risk_settings: any;
  mode: string;
};

type AnalyticsData = {
  success: boolean;
  symbol: string;
  mode: string;

  overview: {
    total_trades: number;
    wins: number;
    losses: number;
    breakeven: number;
    win_rate: number;
    net_pnl: number;
    gross_profit: number;
    gross_loss: number;
    profit_factor: number | null;
    average_trade: number;
    average_win: number;
    average_loss: number;
    expectancy: number;
    best_trade: number;
    worst_trade: number;
    max_drawdown: number;
  };

  periods: {
    today: {
      trades: number;
      pnl: number;
    };

    week: {
      trades: number;
      pnl: number;
    };

    month: {
      trades: number;
      pnl: number;
    };
  };

  streaks: {
    current_streak_type: string | null;
    current_streak: number;
    best_win_streak: number;
    worst_loss_streak: number;
  };

  side_performance: {
    buy: {
      trades: number;
      wins: number;
      losses: number;
      win_rate: number;
      net_pnl: number;
    };

    sell: {
      trades: number;
      wins: number;
      losses: number;
      win_rate: number;
      net_pnl: number;
    };
  };

  drawdown_curve?: {
    timestamp: string | null;
    equity: number;
    drawdown: number;
  }[];

  generated_at?: string;
};

type StrategyPerformanceData = {
  success: boolean;
  symbol: string;
  mode: string;

  strategies: {
    id: string;
    symbol: string;
    mode: string;
    strategy: string;

    total_trades: number;
    wins: number;
    losses: number;
    breakeven: number;

    win_rate: number;

    gross_profit: number;
    gross_loss: number;
    net_pnl: number;

    average_trade: number;
    average_win: number;
    average_loss: number;

    expectancy: number;
    profit_factor: number | null;

    best_trade: number;
    worst_trade: number;

    created_at: string;
  }[];

  summary: {
    strategy_count: number;
    total_net_pnl: number;
    best_strategy: string | null;
    best_strategy_pnl: number;
  } | null;

  generated_at?: string;
};

export default function Home() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [control, setControl] =
    useState<ControlData | null>(null);

  const [analytics, setAnalytics] =
    useState<AnalyticsData | null>(null);

  const [
    strategyPerformance,
    setStrategyPerformance,
  ] =
    useState<StrategyPerformanceData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [controlBusy, setControlBusy] =
    useState(false);

  const [
    controlMessage,
    setControlMessage,
  ] = useState('');

  const loadDashboard = async () => {
    try {
      const res = await fetch(
        '/api/arcgt/dashboard',
        {
          cache: 'no-store',
        }
      );

      const json = await res.json();

      setData(json);
    } catch (error) {
      console.error(
        'Failed to load dashboard',
        error
      );
    }
  };

  const loadControl = async () => {
    try {
      const res = await fetch(
        '/api/arcgt/control',
        {
          cache: 'no-store',
        }
      );

      const json = await res.json();

      setControl(json);
    } catch (error) {
      console.error(
        'Failed to load ARCGT controls',
        error
      );
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(
        '/api/arcgt/analytics',
        {
          cache: 'no-store',
        }
      );

      const json = await res.json();

      if (json.success) {
        setAnalytics(json);
      }
    } catch (error) {
      console.error(
        'Failed to load ARCGT analytics',
        error
      );
    }
  };

  const loadStrategyPerformance =
    async () => {
      try {
        const res = await fetch(
          '/api/arcgt/strategy-performance',
          {
            cache: 'no-store',
          }
        );

        const json = await res.json();

        if (json.success) {
          setStrategyPerformance(json);
        }
      } catch (error) {
        console.error(
          'Failed to load ARCGT strategy performance',
          error
        );
      }
    };

  useEffect(() => {
    const initialLoad = async () => {
      try {
        await Promise.all([
          loadDashboard(),
          loadControl(),
          loadAnalytics(),
          loadStrategyPerformance(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    initialLoad();

    const interval = setInterval(() => {
      loadDashboard();
      loadControl();
      loadAnalytics();
      loadStrategyPerformance();
    }, 15000);

    return () =>
      clearInterval(interval);
  }, []);

  const updateControl = async (
    updates: Record<string, any>
  ) => {
    try {
      setControlBusy(true);
      setControlMessage('');

      const res = await fetch(
        '/api/arcgt/control',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(updates),
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error ||
            'Control update failed'
        );
      }

      setControlMessage(
        'Control updated successfully.'
      );

      await Promise.all([
        loadControl(),
        loadDashboard(),
        loadAnalytics(),
        loadStrategyPerformance(),
      ]);
    } catch (error: any) {
      setControlMessage(
        error?.message ||
          'Control update failed.'
      );
    } finally {
      setControlBusy(false);
    }
  };

  const pauseTrading = async () => {
    const confirmed = window.confirm(
      'Pause ARCGT trading? New trades will be blocked until you resume.'
    );

    if (!confirmed) {
      return;
    }

    await updateControl({
      trading_enabled: false,
      lock_reason: 'MANUAL_PAUSE',
    });
  };

  const resumeTrading = async () => {
    const confirmed = window.confirm(
      'Resume ARCGT trading in DEMO mode?'
    );

    if (!confirmed) {
      return;
    }

    await updateControl({
      trading_enabled: true,
      lock_reason: null,
      lock_until: null,
    });
  };

  const toggleNewsLock = async () => {
    const current =
      control?.trading_status?.news_lock ===
      true;

    const confirmed = window.confirm(
      current
        ? 'Disable the manual news lock?'
        : 'Enable the manual news lock? New trades should be blocked while the lock is active.'
    );

    if (!confirmed) {
      return;
    }

    await updateControl({
      news_lock: !current,

      lock_reason: !current
        ? 'MANUAL_NEWS_LOCK'
        : null,

      lock_until: null,
    });
  };

  const updateRiskSetting = async (
    field: string,
    value: number
  ) => {
    const confirmed = window.confirm(
      `Update ${field.replaceAll(
        '_',
        ' '
      )} to ${value}?`
    );

    if (!confirmed) {
      return;
    }

    await updateControl({
      [field]: value,
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading ARCGT...
      </main>
    );
  }

  const dashboard = data?.dashboard;
  const health = data?.health;
  const account = data?.account;
  const brokerAccount =
    data?.broker_account ?? null;

  // Authoritative DEMO broker performance.
  // Do not use legacy PAPER performance snapshots here.
  const performance =
    data?.demo_performance;

  const readiness = data?.readiness;

  const signal = dashboard?.signal;
  const market = dashboard?.market;
  const news = dashboard?.news;

  const closedTrades =
    data?.closed_trades ?? [];

  const equityCurve =
    data?.equity_curve ?? [];

  const tradingStatus =
    control?.trading_status;

  const riskSettings =
    control?.risk_settings;

  const tradingEnabled =
    tradingStatus?.trading_enabled === true;

  const newsLock =
    tradingStatus?.news_lock === true;

  const brokerAccountAvailable =
    brokerAccount?.available === true;

  const displayedBalance =
    brokerAccountAvailable &&
    brokerAccount?.balance != null
      ? Number(brokerAccount.balance)
      : Number(account?.balance ?? 0);

  const displayedEquity =
    brokerAccountAvailable &&
    brokerAccount?.equity != null
      ? Number(brokerAccount.equity)
      : Number(account?.equity ?? 0);

  const displayedMargin =
    brokerAccountAvailable &&
    brokerAccount?.margin != null
      ? Number(brokerAccount.margin)
      : null;

  const displayedFreeMargin =
    brokerAccountAvailable &&
    brokerAccount?.free_margin != null
      ? Number(brokerAccount.free_margin)
      : null;

  const accountCurrency =
    brokerAccount?.currency ??
    account?.currency ??
    'USD';

  return (
    <main className="min-h-screen bg-[#070707] text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}

        <header className="flex items-center justify-between border-b border-[#262626] pb-5">

          <div>

            <h1 className="text-3xl font-bold tracking-tight">
              ARCGT
            </h1>

            <p className="text-sm text-neutral-500 mt-1">
              Automated Gold Trading
              Command Center
            </p>

          </div>

          <div className="flex items-center gap-3">

            <span
              className={`w-2.5 h-2.5 rounded-full ${
                dashboard?.system_status ===
                'ACTIVE'
                  ? 'bg-green-500'
                  : dashboard?.system_status ===
                    'NEWS_LOCK'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />

            <span className="text-sm font-medium">
              {dashboard?.system_status ??
                'UNKNOWN'}
            </span>

          </div>

        </header>

        {/* CONTROL CENTER */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                ARCGT Control Center
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Trading & Risk Controls
              </h2>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <span className="text-xs px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                MODE:{' '}
                {control?.mode ?? 'DEMO'}
              </span>

              <span
                className={`text-xs px-3 py-1.5 rounded border ${
                  tradingEnabled
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                TRADING{' '}
                {tradingEnabled
                  ? 'ON'
                  : 'PAUSED'}
              </span>

              <span
                className={`text-xs px-3 py-1.5 rounded border ${
                  newsLock
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-neutral-500/10 text-neutral-400 border-[#333]'
                }`}
              >
                NEWS LOCK{' '}
                {newsLock ? 'ON' : 'OFF'}
              </span>

            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* OPERATIONS */}

            <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Operations
              </p>

              <h3 className="text-lg font-semibold mt-2 mb-4">
                Trading State
              </h3>

              <div className="space-y-3">

                <ControlRow
                  label="Trading"
                  value={
                    tradingEnabled
                      ? 'ENABLED'
                      : 'PAUSED'
                  }
                  status={
                    tradingEnabled
                      ? 'good'
                      : 'danger'
                  }
                />

                <ControlRow
                  label="News Lock"
                  value={
                    newsLock
                      ? 'LOCKED'
                      : 'CLEAR'
                  }
                  status={
                    newsLock
                      ? 'warning'
                      : 'good'
                  }
                />

                <ControlRow
                  label="Mode"
                  value={
                    control?.mode ??
                    'DEMO'
                  }
                  status="warning"
                />

                <ControlRow
                  label="Lock Reason"
                  value={
                    tradingStatus?.lock_reason ??
                    'NONE'
                  }
                />

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">

                {tradingEnabled ? (
                  <button
                    onClick={pauseTrading}
                    disabled={controlBusy}
                    className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Emergency Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeTrading}
                    disabled={controlBusy}
                    className="rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 text-sm font-semibold hover:bg-green-500/20 disabled:opacity-50"
                  >
                    Resume Trading
                  </button>
                )}

                <button
                  onClick={toggleNewsLock}
                  disabled={controlBusy}
                  className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 text-sm font-semibold hover:bg-yellow-500/20 disabled:opacity-50"
                >
                  {newsLock
                    ? 'Disable News Lock'
                    : 'Enable News Lock'}
                </button>

              </div>

            </div>

            {/* RISK SETTINGS */}

            <div className="xl:col-span-2 bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <div className="flex items-center justify-between mb-4">

                <div>

                  <p className="text-xs uppercase tracking-widest text-neutral-500">
                    Risk Engine
                  </p>

                  <h3 className="text-lg font-semibold mt-2">
                    Active Risk Rules
                  </h3>

                </div>

                <span
                  className={`text-xs px-3 py-1 rounded ${
                    riskSettings?.enabled
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {riskSettings?.enabled
                    ? 'ENABLED'
                    : 'DISABLED'}
                </span>

              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

                <EditableRiskMetric
                  label="Risk / Trade"
                  value={
                    riskSettings?.risk_per_trade ??
                    0
                  }
                  suffix="%"
                  min={0.1}
                  max={10}
                  step={0.1}
                  disabled={controlBusy}
                  onSave={(value) =>
                    updateRiskSetting(
                      'risk_per_trade',
                      value
                    )
                  }
                />

                <EditableRiskMetric
                  label="Max Daily Loss"
                  value={
                    riskSettings?.max_daily_loss ??
                    0
                  }
                  suffix="%"
                  min={0.5}
                  max={20}
                  step={0.5}
                  disabled={controlBusy}
                  onSave={(value) =>
                    updateRiskSetting(
                      'max_daily_loss',
                      value
                    )
                  }
                />

                <EditableRiskMetric
                  label="Max Positions"
                  value={
                    riskSettings?.max_open_positions ??
                    0
                  }
                  min={1}
                  max={10}
                  step={1}
                  disabled={controlBusy}
                  onSave={(value) =>
                    updateRiskSetting(
                      'max_open_positions',
                      value
                    )
                  }
                />

                <EditableRiskMetric
                  label="Min Confidence"
                  value={
                    riskSettings?.min_confidence ??
                    0
                  }
                  suffix="%"
                  min={1}
                  max={100}
                  step={1}
                  disabled={controlBusy}
                  onSave={(value) =>
                    updateRiskSetting(
                      'min_confidence',
                      value
                    )
                  }
                />

                <EditableRiskMetric
                  label="Minimum R:R"
                  value={
                    riskSettings?.min_risk_reward ??
                    0
                  }
                  prefix="1:"
                  min={1}
                  max={10}
                  step={0.1}
                  disabled={controlBusy}
                  onSave={(value) =>
                    updateRiskSetting(
                      'min_risk_reward',
                      value
                    )
                  }
                />

                <div className="bg-[#111] border border-[#252525] rounded-lg p-4">

                  <p className="text-xs text-neutral-500">
                    Lot Range
                  </p>

                  <p className="text-sm font-semibold mt-2">
                    {riskSettings?.min_lot ??
                      0.01}
                    {' — '}
                    {riskSettings?.max_lot ??
                      10}
                  </p>

                  <p className="text-[11px] text-neutral-600 mt-1">
                    Step{' '}
                    {riskSettings?.lot_step ??
                      0.01}
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">

                <Metric
                  label="Contract Size"
                  value={
                    riskSettings?.contract_size ??
                    '—'
                  }
                />

                <Metric
                  label="Symbol"
                  value={
                    riskSettings?.symbol ??
                    'XAUUSD'
                  }
                />

                <Metric
                  label="Risk Engine Updated"
                  value={
                    riskSettings?.updated_at
                      ? new Date(
                          riskSettings.updated_at
                        ).toLocaleString()
                      : '—'
                  }
                />

              </div>

            </div>

          </div>

          {controlMessage && (
            <div className="mt-4 border border-[#2b2b2b] bg-[#0a0a0a] rounded-lg px-4 py-3 text-sm text-neutral-300">
              {controlMessage}
            </div>
          )}

        </section>

        {/* TOP CARDS */}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          <Card
            title="XAU/USD"
            value={
              market?.latest_price
                ? Number(
                    market.latest_price
                  ).toFixed(5)
                : 'DATA UNAVAILABLE'
            }
            sub="Latest Market Price"
          />

          <Card
            title="AI Decision"
            value={
              signal?.decision ?? '—'
            }
            sub={`${signal?.confidence ?? 0}% confidence`}
          />

          <Card
            title={
              brokerAccountAvailable
                ? 'Broker Equity'
                : 'ARCGT Equity'
            }
            value={`${accountCurrency} ${displayedEquity.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`}
            sub={
              brokerAccountAvailable
                ? `Broker Balance ${accountCurrency} ${displayedBalance.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`
                : `System Balance ${accountCurrency} ${displayedBalance.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`
            }
          />

          <Card
            title="Today's P&L"
            value={formatMoney(
              Number(
                account?.daily_pnl ?? 0
              ),
              true
            )}
            sub={`${account?.daily_pnl_percent ?? 0}%`}
          />

        </section>

        {/* BROKER ACCOUNT */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Account
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Broker Account
              </h2>

            </div>

            <span
              className={`text-xs px-3 py-1.5 rounded border w-fit ${
                brokerAccountAvailable
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              }`}
            >
              {brokerAccountAvailable
                ? 'BROKER DATA'
                : 'ARCGT CALCULATED DATA'}
            </span>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <Metric
              label={
                brokerAccountAvailable
                  ? 'Broker Balance'
                  : 'System Balance'
              }
              value={`${accountCurrency} ${displayedBalance.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`}
            />

            <Metric
              label={
                brokerAccountAvailable
                  ? 'Broker Equity'
                  : 'System Equity'
              }
              value={`${accountCurrency} ${displayedEquity.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`}
            />

            <Metric
              label="Margin"
              value={
                displayedMargin != null
                  ? `${accountCurrency} ${displayedMargin.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`
                  : 'Unavailable'
              }
            />

            <Metric
              label="Free Margin"
              value={
                displayedFreeMargin != null
                  ? `${accountCurrency} ${displayedFreeMargin.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`
                  : 'Unavailable'
              }
            />

          </div>

          {!brokerAccountAvailable && (
            <p className="text-xs text-neutral-500 mt-4">
              Broker balance data is not yet
              available. ARCGT is currently
              displaying its calculated account
              state until direct cTrader account
              data is connected.
            </p>
          )}

        </section>

        {/* CURRENT SIGNAL */}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <div className="xl:col-span-2 bg-[#101010] border border-[#252525] rounded-xl p-5">

            <div className="flex justify-between items-center mb-5">

              <div>

                <p className="text-xs uppercase text-neutral-500 tracking-widest">
                  Current AI Signal
                </p>

                <h2 className="text-3xl font-bold mt-2">
                  {signal?.decision ??
                    'NO SIGNAL'}
                </h2>

              </div>

              <div className="text-right">

                <p className="text-sm text-neutral-500">
                  Confidence
                </p>

                <p className="text-3xl font-semibold">
                  {signal?.confidence ?? 0}%
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <Metric
                label="Strategy"
                value={
                  signal?.strategy ?? '—'
                }
              />

              <Metric
                label="Market Condition"
                value={
                  signal?.market_condition ??
                  '—'
                }
              />

              <Metric
                label="Risk / Reward"
                value={
                  signal?.risk_reward
                    ? `1:${signal.risk_reward}`
                    : '—'
                }
              />

              <Metric
                label="Status"
                value={
                  dashboard?.risk?.approved
                    ? 'APPROVED'
                    : 'REJECTED'
                }
              />

            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">

              <Metric
                label="Entry Min"
                value={
                  signal?.entry_min ?? '—'
                }
              />

              <Metric
                label="Entry Max"
                value={
                  signal?.entry_max ?? '—'
                }
              />

              <Metric
                label="Stop Loss"
                value={
                  signal?.stop_loss ?? '—'
                }
              />

              <Metric
                label="Take Profit 1"
                value={
                  signal?.take_profit_1 ??
                  '—'
                }
              />

              <Metric
                label="Take Profit 2"
                value={
                  signal?.take_profit_2 ??
                  '—'
                }
              />

            </div>

            <div className="mt-5 border-t border-[#252525] pt-4">

              <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                AI Reasoning
              </p>

              <p className="text-sm text-neutral-300 leading-relaxed">
                {signal?.reasoning ??
                  'No reasoning available.'}
              </p>

            </div>

          </div>

          {/* MARKET STRUCTURE */}

          <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Market Structure
            </p>

            <h2 className="text-xl font-semibold mt-2 mb-5">
              Multi-Timeframe
            </h2>

            <div className="space-y-3">

              <Timeframe
                label="4H"
                value={market?.state_4h}
              />

              <Timeframe
                label="1H"
                value={market?.state_1h}
              />

              <Timeframe
                label="15M"
                value={market?.state_15m}
              />

              <Timeframe
                label="5M"
                value={market?.state_5m}
              />

            </div>

          </div>

        </section>

        {/* PERFORMANCE */}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          <Card
            title="Win Rate"
            value={`${performance?.win_rate ?? 0}%`}
            sub={`${performance?.winning_trades ?? 0} wins / ${
              performance?.losing_trades ?? 0
            } losses`}
          />

          <Card
            title="Total Trades"
            value={
              performance?.total_trades ?? 0
            }
            sub="DEMO performance"
          />

          <Card
            title="Net P&L"
            value={formatMoney(
              Number(
                performance?.net_pnl ?? 0
              ),
              false
            )}
            sub="Closed DEMO broker trades only" 
          />

          <Card
            title="System Health"
            value={
              health?.overall_status ??
              'UNKNOWN'
            }
            sub="Backend health status"
          />

        </section>

        {/* ADVANCED PERFORMANCE ANALYTICS */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Advanced Analytics
              </p>

              <h2 className="text-xl font-semibold mt-2">
                ARCGT Performance
                Intelligence
              </h2>

            </div>

            <span className="text-xs px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 w-fit">
              {analytics?.mode ??
                'DEMO'}{' '}
              DATA
            </span>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <AnalyticsCard
              label="Today"
              value={formatMoney(
                Number(
                  analytics?.periods?.today
                    ?.pnl ?? 0
                ),
                true
              )}
              sub={`${
                analytics?.periods?.today
                  ?.trades ?? 0
              } trades`}
            />

            <AnalyticsCard
              label="This Week"
              value={formatMoney(
                Number(
                  analytics?.periods?.week
                    ?.pnl ?? 0
                ),
                true
              )}
              sub={`${
                analytics?.periods?.week
                  ?.trades ?? 0
              } trades`}
            />

            <AnalyticsCard
              label="This Month"
              value={formatMoney(
                Number(
                  analytics?.periods?.month
                    ?.pnl ?? 0
                ),
                true
              )}
              sub={`${
                analytics?.periods?.month
                  ?.trades ?? 0
              } trades`}
            />

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-4">

            <Metric
              label="Average Trade"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.average_trade ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Average Win"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.average_win ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Average Loss"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.average_loss ?? 0
                ),
                false
              )}
            />

            <Metric
              label="Expectancy"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.expectancy ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Best Trade"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.best_trade ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Worst Trade"
              value={formatMoney(
                Number(
                  analytics?.overview
                    ?.worst_trade ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Max Drawdown"
              value={formatMoney(
                -Number(
                  analytics?.overview
                    ?.max_drawdown ?? 0
                ),
                false
              )}
            />

            <Metric
              label="Profit Factor"
              value={
                analytics?.overview
                  ?.profit_factor == null
                  ? '∞'
                  : Number(
                      analytics.overview
                        .profit_factor
                    ).toFixed(2)
              }
            />

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">

            <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Streak Analysis
              </p>

              <h3 className="text-lg font-semibold mt-2 mb-5">
                Trading Momentum
              </h3>

              <div className="space-y-4">

                <ControlRow
                  label="Current Streak"
                  value={`${
                    analytics?.streaks
                      ?.current_streak ?? 0
                  } ${
                    analytics?.streaks
                      ?.current_streak_type ??
                    'NONE'
                  }`}
                  status={
                    analytics?.streaks
                      ?.current_streak_type ===
                    'WIN'
                      ? 'good'
                      : analytics?.streaks
                          ?.current_streak_type ===
                        'LOSS'
                      ? 'danger'
                      : undefined
                  }
                />

                <ControlRow
                  label="Best Win Streak"
                  value={
                    analytics?.streaks
                      ?.best_win_streak ?? 0
                  }
                  status="good"
                />

                <ControlRow
                  label="Worst Loss Streak"
                  value={
                    analytics?.streaks
                      ?.worst_loss_streak ?? 0
                  }
                  status={
                    Number(
                      analytics?.streaks
                        ?.worst_loss_streak ??
                        0
                    ) > 0
                      ? 'danger'
                      : undefined
                  }
                />

              </div>

            </div>

            <SidePerformance
              side="BUY"
              data={
                analytics
                  ?.side_performance?.buy
              }
            />

            <SidePerformance
              side="SELL"
              data={
                analytics
                  ?.side_performance?.sell
              }
            />

          </div>

        </section>

        {/* DEMO TO LIVE READINESS */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Deployment Readiness
              </p>

              <h2 className="text-xl font-semibold mt-2">
                DEMO → Live Readiness
              </h2>

            </div>

            <ReadinessStatusBadge
              status={
                readiness?.readiness_status ??
                'UNKNOWN'
              }
            />

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Readiness Score
              </p>

              <div className="flex items-end gap-2 mt-4">

                <span className="text-5xl font-bold">
                  {readiness?.readiness_score ??
                    0}
                </span>

                <span className="text-xl text-neutral-500 mb-1">
                  /100
                </span>

              </div>

              <ProgressBar
                value={
                  Number(
                    readiness?.readiness_score ??
                      0
                  )
                }
                max={100}
              />

              <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
                Readiness measures sample size,
                profitability, drawdown and
                consistency before live trading
                is reviewed.
              </p>

            </div>

            <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Validation Progress
              </p>

              <div className="flex items-end gap-2 mt-4">

                <span className="text-4xl font-bold">
                  {readiness?.total_trades ??
                    0}
                </span>

                <span className="text-neutral-500 mb-1">
                  / 50 trades
                </span>

              </div>

              <ProgressBar
                value={
                  Number(
                    readiness?.total_trades ??
                      0
                  )
                }
                max={50}
              />

              <p className="text-xs text-neutral-500 mt-3">
                30 trades = minimum meaningful
                review. 50 trades = live-review
                sample target.
              </p>

              <div className="grid grid-cols-3 gap-3 mt-5">

                <MiniMetric
                  label="Wins"
                  value={
                    readiness?.wins ?? 0
                  }
                />

                <MiniMetric
                  label="Losses"
                  value={
                    readiness?.losses ?? 0
                  }
                />

                <MiniMetric
                  label="Win Rate"
                  value={`${
                    readiness?.win_rate ?? 0
                  }%`}
                />

              </div>

            </div>

            <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Deployment Gate
              </p>

              <h3 className="text-lg font-semibold mt-2">
                {readiness?.readiness_status ===
                'READY_FOR_LIVE_REVIEW'
                  ? 'Eligible for Live Review'
                  : 'Live Trading Blocked'}
              </h3>

              <p className="text-xs text-neutral-500 mt-2">
                Reaching readiness never
                automatically enables live
                trading.
              </p>

              <div className="space-y-3 mt-5">

                {readiness?.reasons?.length ? (
                  readiness.reasons.map(
                    (
                      reason: string,
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="flex gap-3 items-start border border-[#252525] rounded-lg p-3"
                      >

                        <span className="text-yellow-400 mt-0.5">
                          ●
                        </span>

                        <p className="text-sm text-neutral-300 leading-relaxed">
                          {reason}
                        </p>

                      </div>
                    )
                  )
                ) : (
                  <div className="border border-green-500/20 bg-green-500/5 rounded-lg p-3">

                    <p className="text-sm text-green-400">
                      All readiness requirements
                      passed.
                    </p>

                  </div>
                )}

              </div>

            </div>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

            <ReadinessMetric
              label="Trade Count"
              score={
                readiness?.trade_count_score ??
                0
              }
              max={30}
            />

            <ReadinessMetric
              label="Profitability"
              score={
                readiness?.profitability_score ??
                0
              }
              max={30}
            />

            <ReadinessMetric
              label="Drawdown"
              score={
                readiness?.drawdown_score ?? 0
              }
              max={20}
            />

            <ReadinessMetric
              label="Consistency"
              score={
                readiness?.consistency_score ??
                0
              }
              max={20}
            />

          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">

            <Metric
              label="Net P&L"
              value={formatMoney(
                Number(
                  readiness?.net_pnl ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Expectancy"
              value={formatMoney(
                Number(
                  readiness?.expectancy ?? 0
                ),
                true
              )}
            />

            <Metric
              label="Profit Factor"
              value={
                readiness?.profit_factor ==
                null
                  ? '∞'
                  : Number(
                      readiness.profit_factor
                    ).toFixed(2)
              }
            />

            <Metric
              label="Max Drawdown"
              value={`${Number(
                readiness?.max_drawdown ?? 0
              ).toFixed(2)}%`}
            />

            <Metric
              label="Loss Streak"
              value={
                readiness?.current_loss_streak ??
                0
              }
            />

            <Metric
              label="Mode"
              value={
                readiness?.mode ?? 'DEMO'
              }
            />

          </div>

          <div className="mt-5 pt-4 border-t border-[#252525] flex flex-col md:flex-row md:items-center md:justify-between gap-2">

            <p className="text-xs text-neutral-500">
              Latest readiness evaluation
            </p>

            <p className="text-xs text-neutral-400">
              {readiness?.created_at
                ? new Date(
                    readiness.created_at
                  ).toLocaleString()
                : 'No readiness snapshot yet'}
            </p>

          </div>

        </section>

        {/* STRATEGY PERFORMANCE */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Strategy Analytics
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Strategy Performance
              </h2>

            </div>

            <div className="flex flex-wrap gap-2">

              <span className="text-xs px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {strategyPerformance?.mode ??
                  'DEMO'}{' '}
                DATA
              </span>

              <span className="text-xs px-3 py-1.5 rounded bg-neutral-500/10 text-neutral-400 border border-[#333]">
                {
                  strategyPerformance
                    ?.summary
                    ?.strategy_count ?? 0
                }{' '}
                STRATEGIES
              </span>

            </div>

          </div>

          {strategyPerformance
            ?.strategies?.length ? (

            <>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

                <Metric
                  label="Strategies Tracked"
                  value={
                    strategyPerformance
                      ?.summary
                      ?.strategy_count ?? 0
                  }
                />

                <Metric
                  label="Best Strategy"
                  value={
                    formatStrategyName(
                      strategyPerformance
                        ?.summary
                        ?.best_strategy
                    )
                  }
                />

                <Metric
                  label="Strategy P&L"
                  value={formatMoney(
                    Number(
                      strategyPerformance
                        ?.summary
                        ?.total_net_pnl ??
                        0
                    ),
                    true
                  )}
                />

              </div>

              <div className="space-y-4">

                {strategyPerformance.strategies.map(
                  strategy => (

                    <div
                      key={strategy.id}
                      className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5"
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        <div>

                          <p className="text-xs uppercase tracking-widest text-neutral-500">
                            Strategy
                          </p>

                          <h3 className="text-xl font-semibold mt-2">
                            {formatStrategyName(
                              strategy.strategy
                            )}
                          </h3>

                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                          <span
                            className={`text-xl font-semibold ${
                              Number(
                                strategy.net_pnl
                              ) > 0
                                ? 'text-green-400'
                                : Number(
                                    strategy.net_pnl
                                  ) < 0
                                ? 'text-red-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {formatMoney(
                              Number(
                                strategy.net_pnl ??
                                  0
                              ),
                              true
                            )}
                          </span>

                          <span className="text-xs px-3 py-1.5 rounded bg-neutral-500/10 text-neutral-400">
                            {
                              strategy.total_trades
                            }{' '}
                            trades
                          </span>

                        </div>

                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-5">

                        <Metric
                          label="Win Rate"
                          value={`${
                            strategy.win_rate ??
                            0
                          }%`}
                        />

                        <Metric
                          label="Wins"
                          value={
                            strategy.wins ?? 0
                          }
                        />

                        <Metric
                          label="Losses"
                          value={
                            strategy.losses ?? 0
                          }
                        />

                        <Metric
                          label="Net P&L"
                          value={formatMoney(
                            Number(
                              strategy.net_pnl ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Expectancy"
                          value={formatMoney(
                            Number(
                              strategy.expectancy ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Average Trade"
                          value={formatMoney(
                            Number(
                              strategy.average_trade ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Profit Factor"
                          value={
                            strategy.profit_factor ==
                            null
                              ? '∞'
                              : Number(
                                  strategy.profit_factor
                                ).toFixed(2)
                          }
                        />

                        <Metric
                          label="Best Trade"
                          value={formatMoney(
                            Number(
                              strategy.best_trade ??
                                0
                            ),
                            true
                          )}
                        />

                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-3">

                        <Metric
                          label="Gross Profit"
                          value={formatMoney(
                            Number(
                              strategy.gross_profit ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Gross Loss"
                          value={formatMoney(
                            -Number(
                              strategy.gross_loss ??
                                0
                            ),
                            false
                          )}
                        />

                        <Metric
                          label="Average Win"
                          value={formatMoney(
                            Number(
                              strategy.average_win ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Average Loss"
                          value={formatMoney(
                            -Number(
                              strategy.average_loss ??
                                0
                            ),
                            false
                          )}
                        />

                        <Metric
                          label="Worst Trade"
                          value={formatMoney(
                            Number(
                              strategy.worst_trade ??
                                0
                            ),
                            true
                          )}
                        />

                        <Metric
                          label="Updated"
                          value={
                            strategy.created_at
                              ? new Date(
                                  strategy.created_at
                                ).toLocaleString()
                              : '—'
                          }
                        />

                      </div>

                    </div>

                  )
                )}

              </div>

            </>

          ) : (

            <EmptyState
              title="No strategy performance yet."
              description="Strategy analytics will appear after ARCGT closes DEMO trades."
            />

          )}

        </section>

        {/* EQUITY CURVE */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex items-start justify-between gap-4 mb-5">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Performance Tracking
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Equity Curve
              </h2>

            </div>

            <div className="text-right">

              <p className="text-xs text-neutral-500">
                Cumulative P&L
              </p>

              <p
                className={`text-xl font-semibold mt-1 ${
                  Number(
                    performance?.net_pnl ??
                      0
                  ) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {formatMoney(
                  Number(
                    performance?.net_pnl ??
                      0
                  ),
                  true
                )}
              </p>

            </div>

          </div>

          {equityCurve.length > 0 ? (
            <EquityCurveChart
              data={equityCurve}
            />
          ) : (
            <EmptyState
              title="No equity history yet."
              description="The curve will populate as ARCGT closes DEMO trades."
            />
          )}

        </section>

        {/* TRADE HISTORY */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex items-center justify-between mb-5">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Trade History
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Closed DEMO Trades
              </h2>

            </div>

            <span className="text-xs px-3 py-1 rounded bg-neutral-500/10 text-neutral-400">
              {closedTrades.length}{' '}
              trades
            </span>

          </div>

          {closedTrades.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-sm">

                <thead>

                  <tr className="border-b border-[#252525] text-neutral-500 text-left">

                    <th className="pb-3 font-medium">
                      Side
                    </th>

                    <th className="pb-3 font-medium">
                      Entry
                    </th>

                    <th className="pb-3 font-medium">
                      Exit
                    </th>

                    <th className="pb-3 font-medium">
                      Lot
                    </th>

                    <th className="pb-3 font-medium">
                      SL
                    </th>

                    <th className="pb-3 font-medium">
                      TP
                    </th>

                    <th className="pb-3 font-medium">
                      Result
                    </th>

                    <th className="pb-3 font-medium">
                      Close Reason
                    </th>

                    <th className="pb-3 font-medium">
                      Duration
                    </th>

                    <th className="pb-3 font-medium">
                      Closed
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {closedTrades.map(
                    (trade: any) => {
                      const pnl = Number(
                        trade.realized_pnl ??
                          0
                      );

                      return (
                        <tr
                          key={trade.id}
                          className="border-b border-[#1f1f1f]"
                        >

                          <td className="py-4">

                            <span
                              className={`font-semibold ${
                                trade.side ===
                                'BUY'
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {trade.side}
                            </span>

                          </td>

                          <td className="py-4">
                            {trade.entry_price ??
                              '—'}
                          </td>

                          <td className="py-4">
                            {trade.close_price ??
                              '—'}
                          </td>

                          <td className="py-4">
                            {trade.lot_size ??
                              '—'}
                          </td>

                          <td className="py-4">
                            {trade.stop_loss ??
                              '—'}
                          </td>

                          <td className="py-4">
                            {trade.take_profit ??
                              '—'}
                          </td>

                          <td
                            className={`py-4 font-semibold ${
                              pnl > 0
                                ? 'text-green-400'
                                : pnl < 0
                                ? 'text-red-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {formatMoney(
                              pnl,
                              true
                            )}
                          </td>

                          <td className="py-4">

                            <span className="text-xs px-2 py-1 rounded bg-neutral-500/10 text-neutral-300">
                              {formatReason(
                                trade.close_reason
                              )}
                            </span>

                          </td>

                          <td className="py-4 text-neutral-400">
                            {formatDuration(
                              trade.opened_at,
                              trade.closed_at
                            )}
                          </td>

                          <td className="py-4 text-neutral-500">
                            {trade.closed_at
                              ? new Date(
                                  trade.closed_at
                                ).toLocaleString()
                              : '—'}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <EmptyState
              title="No closed trades yet."
              description="Closed ARCGT DEMO trades will appear here automatically."
            />
          )}

        </section>

        {/* NEWS + HEALTH */}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Upcoming News
            </p>

            <h2 className="text-xl font-semibold mt-2 mb-4">
              High Impact USD Events
            </h2>

            <div className="space-y-3">

              {news?.upcoming?.length ? (
                news.upcoming.map(
                  (
                    event: any,
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="border border-[#262626] rounded-lg p-4"
                    >

                      <div className="flex justify-between gap-4">

                        <div>

                          <p className="font-medium">
                            {
                              event.event_name
                            }
                          </p>

                          <p className="text-xs text-neutral-500 mt-1">
                            {new Date(
                              event.event_time
                            ).toLocaleString()}
                          </p>

                        </div>

                        <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 h-fit">
                          {event.impact}
                        </span>

                      </div>

                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-neutral-500">
                  No upcoming
                  high-impact events.
                </p>
              )}

            </div>

          </div>

          <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

            <p className="text-xs uppercase tracking-widest text-neutral-500">
              System Health
            </p>

            <h2 className="text-xl font-semibold mt-2 mb-4">
              ARCGT Infrastructure
            </h2>

            <div className="space-y-3">

              {health?.components &&
                Object.entries(
                  health.components
                ).map(
                  (
                    [name, component]: any
                  ) => (
                    <div
                      key={name}
                      className="flex justify-between items-center border-b border-[#222] pb-3"
                    >

                      <span className="capitalize text-sm">
                        {name.replaceAll(
                          '_',
                          ' '
                        )}
                      </span>

                      <span
                        className={`text-xs font-semibold ${
                          component.status ===
                          'HEALTHY'
                            ? 'text-green-400'
                            : component.status ===
                              'ERROR'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {component.status}
                      </span>

                    </div>
                  )
                )}

            </div>

          </div>

        </section>

        {/* POSITION MONITOR */}

        <section className="bg-[#101010] border border-[#252525] rounded-xl p-5">

          <div className="flex items-center justify-between mb-5">

            <div>

              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Position Monitor
              </p>

              <h2 className="text-xl font-semibold mt-2">
                Current DEMO Position
              </h2>

            </div>

            <span
              className={
                data?.open_position
                  ? 'text-xs px-3 py-1 rounded bg-green-500/10 text-green-400'
                  : 'text-xs px-3 py-1 rounded bg-neutral-500/10 text-neutral-400'
              }
            >
              {data?.open_position
                ? 'OPEN'
                : 'NO POSITION'}
            </span>

          </div>

          {data?.open_position ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">

              <Metric
                label="Side"
                value={
                  data.open_position.side
                }
              />

              <Metric
                label="Lot Size"
                value={
                  data.open_position
                    .lot_size
                }
              />

              <Metric
                label="Entry"
                value={
                  data.open_position
                    .entry_price
                }
              />

              <Metric
                label="Stop Loss"
                value={
                  data.open_position
                    .stop_loss
                }
              />

              <Metric
                label="Take Profit"
                value={
                  data.open_position
                    .take_profit
                }
              />

              <Metric
                label="Unrealized P&L"
                value={formatMoney(
                  Number(
                    data.open_position
                      .unrealized_pnl ??
                      0
                  ),
                  true
                )}
              />

              <Metric
                label="Opened"
                value={
                  data.open_position
                    .opened_at
                    ? new Date(
                        data.open_position
                          .opened_at
                      ).toLocaleString()
                    : '—'
                }
              />

            </div>
          ) : (
            <EmptyState
              title="No active DEMO position."
              description="ARCGT is waiting for an approved BUY or SELL setup."
            />
          )}

        </section>

        {/* SIGNAL + RISK HISTORY */}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Recent Signals
            </p>

            <h2 className="text-xl font-semibold mt-2 mb-4">
              AI Decision History
            </h2>

            <div className="space-y-3">

              {data?.recent_signals?.length ? (
                data.recent_signals
                  .slice(0, 6)
                  .map(
                    (
                      recentSignal: any
                    ) => (
                      <div
                        key={
                          recentSignal.id
                        }
                        className="border border-[#262626] rounded-lg p-4"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <div className="flex items-center gap-3">

                              <span className="text-lg font-semibold">
                                {
                                  recentSignal.decision
                                }
                              </span>

                              <span className="text-xs text-neutral-500">
                                {recentSignal.confidence ??
                                  0}
                                % confidence
                              </span>

                            </div>

                            <p className="text-sm text-neutral-400 mt-1">
                              {recentSignal.strategy ??
                                'No strategy'}
                            </p>

                            <p className="text-xs text-neutral-500 mt-2">
                              {recentSignal.market_condition ??
                                'Unknown market'}
                            </p>

                          </div>

                          <span className="text-xs text-neutral-500 whitespace-nowrap">
                            {recentSignal.created_at
                              ? new Date(
                                  recentSignal.created_at
                                ).toLocaleString()
                              : '—'}
                          </span>

                        </div>

                      </div>
                    )
                  )
              ) : (
                <p className="text-sm text-neutral-500">
                  No recent signals.
                </p>
              )}

            </div>

          </div>

          <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Risk Decisions
            </p>

            <h2 className="text-xl font-semibold mt-2 mb-4">
              Risk Engine History
            </h2>

            <div className="space-y-3">

              {data?.recent_risk_decisions
                ?.length ? (
                data.recent_risk_decisions
                  .slice(0, 6)
                  .map((risk: any) => (
                    <div
                      key={risk.id}
                      className="border border-[#262626] rounded-lg p-4"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <div className="flex items-center gap-3">

                            <span className="font-semibold">
                              {risk.decision ??
                                '—'}
                            </span>

                            <span
                              className={
                                risk.approved
                                  ? 'text-xs px-2 py-1 rounded bg-green-500/10 text-green-400'
                                  : 'text-xs px-2 py-1 rounded bg-red-500/10 text-red-400'
                              }
                            >
                              {risk.approved
                                ? 'APPROVED'
                                : 'REJECTED'}
                            </span>

                          </div>

                          <p className="text-xs text-neutral-500 mt-2">
                            Confidence:{' '}
                            {risk.confidence ??
                              0}
                            %
                          </p>

                          {risk.risk_reward !=
                            null && (
                            <p className="text-xs text-neutral-500 mt-1">
                              R:R 1:
                              {
                                risk.risk_reward
                              }
                            </p>
                          )}

                          {risk.calculated_lot_size !=
                            null && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Lot Size:{' '}
                              {
                                risk.calculated_lot_size
                              }
                            </p>
                          )}

                          {risk.rejection_reason && (
                            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                              {
                                risk.rejection_reason
                              }
                            </p>
                          )}

                        </div>

                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          {risk.created_at
                            ? new Date(
                                risk.created_at
                              ).toLocaleString()
                            : '—'}
                        </span>

                      </div>

                    </div>
                  ))
              ) : (
                <p className="text-sm text-neutral-500">
                  No recent risk decisions.
                </p>
              )}

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: any;
  sub?: string;
}) {
  return (
    <div className="bg-[#101010] border border-[#252525] rounded-xl p-5">

      <p className="text-xs uppercase tracking-widest text-neutral-500">
        {title}
      </p>

      <p className="text-2xl font-semibold mt-3">
        {value}
      </p>

      {sub && (
        <p className="text-xs text-neutral-500 mt-1">
          {sub}
        </p>
      )}

    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#222]">

      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="text-sm font-medium mt-1 break-words">
        {value}
      </p>

    </div>
  );
}

function ControlRow({
  label,
  value,
  status,
}: {
  label: string;
  value: any;
  status?:
    | 'good'
    | 'warning'
    | 'danger';
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#222] pb-3">

      <span className="text-sm text-neutral-400">
        {label}
      </span>

      <span
        className={`text-xs font-semibold ${
          status === 'good'
            ? 'text-green-400'
            : status === 'warning'
            ? 'text-yellow-400'
            : status === 'danger'
            ? 'text-red-400'
            : 'text-neutral-300'
        }`}
      >
        {value}
      </span>

    </div>
  );
}

function EditableRiskMetric({
  label,
  value,
  suffix = '',
  prefix = '',
  min,
  max,
  step,
  disabled,
  onSave,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onSave: (value: number) => void;
}) {
  const [
    currentValue,
    setCurrentValue,
  ] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <div className="bg-[#111] border border-[#252525] rounded-lg p-4">

      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <div className="flex items-center gap-1 mt-2">

        {prefix && (
          <span className="text-sm text-neutral-400">
            {prefix}
          </span>
        )}

        <input
          type="number"
          value={currentValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) =>
            setCurrentValue(
              Number(
                event.target.value
              )
            )
          }
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />

        {suffix && (
          <span className="text-sm text-neutral-400">
            {suffix}
          </span>
        )}

      </div>

      <button
        disabled={
          disabled ||
          Number(currentValue) ===
            Number(value)
        }
        onClick={() =>
          onSave(
            Number(currentValue)
          )
        }
        className="text-[11px] text-yellow-400 disabled:text-neutral-700 mt-2"
      >
        Save
      </button>

    </div>
  );
}

function Timeframe({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  const normalized =
    String(value ?? '').toLowerCase();

  const statusClass =
    normalized === 'bullish'
      ? 'text-green-400'
      : normalized === 'bearish'
      ? 'text-red-400'
      : normalized === 'waiting'
      ? 'text-yellow-400'
      : 'text-neutral-400';

  return (
    <div className="flex justify-between items-center bg-[#0a0a0a] border border-[#222] rounded-lg p-4">

      <span className="font-semibold">
        {label}
      </span>

      <span
        className={`text-sm ${statusClass}`}
      >
        {value ?? 'UNAVAILABLE'}
      </span>

    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  const numeric =
    Number(
      value
        .replace('$', '')
        .replace('+', '')
        .replaceAll(',', '')
    ) || 0;

  return (
    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

      <p className="text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </p>

      <p
        className={`text-2xl font-semibold mt-3 ${
          numeric > 0
            ? 'text-green-400'
            : numeric < 0
            ? 'text-red-400'
            : 'text-white'
        }`}
      >
        {value}
      </p>

      <p className="text-xs text-neutral-500 mt-1">
        {sub}
      </p>

    </div>
  );
}

function SidePerformance({
  side,
  data,
}: {
  side: 'BUY' | 'SELL';

  data:
    | {
        trades: number;
        wins: number;
        losses: number;
        win_rate: number;
        net_pnl: number;
      }
    | undefined;
}) {
  const pnl =
    Number(data?.net_pnl ?? 0);

  return (
    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Direction Performance
          </p>

          <h3
            className={`text-lg font-semibold mt-2 ${
              side === 'BUY'
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {side}
          </h3>

        </div>

        <span className="text-xs px-3 py-1 rounded bg-neutral-500/10 text-neutral-400">
          {data?.trades ?? 0}{' '}
          trades
        </span>

      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">

        <Metric
          label="Win Rate"
          value={`${data?.win_rate ?? 0}%`}
        />

        <Metric
          label="Net P&L"
          value={formatMoney(
            pnl,
            true
          )}
        />

        <Metric
          label="Wins"
          value={data?.wins ?? 0}
        />

        <Metric
          label="Losses"
          value={data?.losses ?? 0}
        />

      </div>

    </div>
  );
}

function ReadinessStatusBadge({
  status,
}: {
  status: string;
}) {
  const display =
    status
      .replaceAll('_', ' ')
      .toUpperCase();

  let className =
    'bg-red-500/10 text-red-400 border-red-500/20';

  if (
    status ===
    'READY_FOR_LIVE_REVIEW'
  ) {
    className =
      'bg-green-500/10 text-green-400 border-green-500/20';
  } else if (
    status === 'PROMISING'
  ) {
    className =
      'bg-blue-500/10 text-blue-400 border-blue-500/20';
  } else if (
    status === 'TESTING'
  ) {
    className =
      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }

  return (
    <span
      className={`text-xs px-3 py-1.5 rounded border w-fit ${className}`}
    >
      {display}
    </span>
  );
}

function ReadinessMetric({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (Number(score) /
              Number(max)) *
              100
          )
        )
      : 0;

  return (
    <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">

      <div className="flex justify-between items-center gap-3">

        <p className="text-xs text-neutral-500">
          {label}
        </p>

        <span className="text-sm font-semibold">
          {score}/{max}
        </span>

      </div>

      <div className="w-full bg-[#222] h-1.5 rounded-full overflow-hidden mt-3">

        <div
          className="h-full bg-yellow-500 rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="border border-[#222] rounded-lg p-3">

      <p className="text-[11px] text-neutral-500">
        {label}
      </p>

      <p className="text-sm font-semibold mt-1">
        {value}
      </p>

    </div>
  );
}

function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (value / max) * 100
          )
        )
      : 0;

  const barClass =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 50
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="w-full bg-[#202020] rounded-full h-3 mt-5 overflow-hidden">

      <div
        className={`h-full rounded-full transition-all duration-500 ${barClass}`}
        style={{
          width: `${percentage}%`,
        }}
      />

    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border border-[#222] rounded-lg p-8 text-center">

      <p className="text-neutral-400">
        {title}
      </p>

      <p className="text-xs text-neutral-600 mt-2">
        {description}
      </p>

    </div>
  );
}

function EquityCurveChart({
  data,
}: {
  data: {
    timestamp: string | null;
    realized_pnl: number;
    cumulative_pnl: number;
  }[];
}) {
  const chart = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const width = 1000;
    const height = 260;
    const paddingX = 40;
    const paddingY = 35;

    const values = data.map(
      point =>
        Number(
          point.cumulative_pnl ??
            0
        )
    );

    let min = Math.min(
      0,
      ...values
    );

    let max = Math.max(
      0,
      ...values
    );

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const usableWidth =
      width - paddingX * 2;

    const usableHeight =
      height - paddingY * 2;

    const points = data.map(
      (point, index) => {
        const x =
          data.length === 1
            ? width / 2
            : paddingX +
              (index /
                (data.length - 1)) *
                usableWidth;

        const normalized =
          (Number(
            point.cumulative_pnl ??
              0
          ) -
            min) /
          (max - min);

        const y =
          height -
          paddingY -
          normalized *
            usableHeight;

        return {
          ...point,
          x,
          y,
        };
      }
    );

    const polyline =
      points.length > 1
        ? points
            .map(
              point =>
                `${point.x},${point.y}`
            )
            .join(' ')
        : '';

    const zeroNormalized =
      (0 - min) /
      (max - min);

    const zeroY =
      height -
      paddingY -
      zeroNormalized *
        usableHeight;

    return {
      width,
      height,
      paddingX,
      paddingY,
      points,
      polyline,
      zeroY,
    };
  }, [data]);

  if (!chart) {
    return null;
  }

  return (
    <div className="w-full">

      <div className="h-[300px] w-full border border-[#222] rounded-lg bg-[#0a0a0a] p-3">

        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >

          <line
            x1={chart.paddingX}
            y1={chart.zeroY}
            x2={
              chart.width -
              chart.paddingX
            }
            y2={chart.zeroY}
            stroke="currentColor"
            className="text-neutral-800"
            strokeWidth="1"
          />

          {chart.points.length > 1 && (
            <polyline
              fill="none"
              stroke="currentColor"
              className="text-yellow-400"
              strokeWidth="3"
              points={chart.polyline}
            />
          )}

          {chart.points.map(
            (point, index) => (
              <g key={index}>

                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="currentColor"
                  className={
                    point.realized_pnl >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                />

                <text
                  x={point.x}
                  y={point.y - 14}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-neutral-300"
                  fontSize="13"
                >
                  {formatMoney(
                    Number(
                      point.cumulative_pnl ??
                        0
                    ),
                    true
                  )}
                </text>

              </g>
            )
          )}

        </svg>

      </div>

      <div className="flex justify-between text-xs text-neutral-600 mt-3">

        <span>
          {data[0]?.timestamp
            ? new Date(
                data[0].timestamp
              ).toLocaleString()
            : 'Start'}
        </span>

        <span>
          {data[data.length - 1]
            ?.timestamp
            ? new Date(
                data[
                  data.length - 1
                ].timestamp as string
              ).toLocaleString()
            : 'Latest'}
        </span>

      </div>

    </div>
  );
}

function formatMoney(
  value: number,
  showPositiveSign = false
) {
  const sign =
    value > 0 &&
    showPositiveSign
      ? '+'
      : '';

  return `${sign}$${value.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatReason(
  value?: string | null
) {
  if (!value) {
    return 'UNKNOWN';
  }

  return value
    .replaceAll('_', ' ')
    .toUpperCase();
}

function formatDuration(
  openedAt?: string | null,
  closedAt?: string | null
) {
  if (!openedAt || !closedAt) {
    return '—';
  }

  const start =
    new Date(
      openedAt
    ).getTime();

  const end =
    new Date(
      closedAt
    ).getTime();

  const difference =
    Math.max(
      0,
      end - start
    );

  const totalMinutes =
    Math.floor(
      difference / 60000
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatStrategyName(
  value?: string | null
) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}