import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { ReactNode, CSSProperties } from 'react';

type GlobalThisMock = {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
  SVGLinearGradientElement?: new () => unknown;
  SVGGradientElement?: new () => unknown;
  [key: string]: unknown;
};

(globalThis as GlobalThisMock).IS_REACT_ACT_ENVIRONMENT = true;

(globalThis as GlobalThisMock).SVGLinearGradientElement = class {};

(globalThis as GlobalThisMock).SVGGradientElement = class {};

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
  get length(): number {
    return Object.keys(this.store).length;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
});

vi.mock('recharts', async () => {
  const React = await import('react');

  interface ResponsiveContainerProps {
    children?: ReactNode;
    width?: number | string;
    height?: number | string;
  }

  const MockResponsiveContainer = ({
    children,
    width,
    height,
  }: ResponsiveContainerProps) => (
    <div
      data-testid="responsive-container"
      style={{
        width: (width as CSSProperties['width']) || 800,
        height: (height as CSSProperties['height']) || 600,
      }}
    >
      {children}
    </div>
  );

  interface CommonChartProps {
    children?: ReactNode;

    [key: string]: unknown;
  }

  const LinearGradient = ({ children, ...props }: CommonChartProps) => (
    <svg>
      <linearGradient {...props}>{children}</linearGradient>
    </svg>
  );
  const Stop = (props: Record<string, unknown>) => <stop {...props} />;
  const Defs = ({ children }: { children?: ReactNode }) => (
    <defs>{children}</defs>
  );

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LinearGradient,
    linearGradient: LinearGradient,
    Stop,
    stop: Stop,
    Defs,
    defs: Defs,
    LineChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="line-chart" {...props}>
        {children}
      </div>
    ),
    BarChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="bar-chart" {...props}>
        {children}
      </div>
    ),
    PieChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="pie-chart" {...props}>
        {children}
      </div>
    ),
    AreaChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="area-chart" {...props}>
        {children}
      </div>
    ),
    RadarChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="radar-chart" {...props}>
        {children}
      </div>
    ),
    RadialBarChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="radial-bar-chart" {...props}>
        {children}
      </div>
    ),
    Treemap: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="treemap" {...props}>
        {children}
      </div>
    ),
    ScatterChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="scatter-chart" {...props}>
        {children}
      </div>
    ),
    ComposedChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="composed-chart" {...props}>
        {children}
      </div>
    ),
    Line: () => null,
    Bar: () => null,
    Pie: () => null,
    Area: () => null,
    Radar: () => null,
    RadialBar: () => null,
    Scatter: () => null,
    XAxis: () => null,
    YAxis: () => null,
    ZAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Cell: () => null,
    ReferenceLine: () => null,
    ReferenceDot: () => null,
    Brush: () => null,
    ErrorBar: () => null,
    Funnel: () => null,
    FunnelChart: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="funnel-chart" {...props}>
        {children}
      </div>
    ),
    LabelList: () => null,
    PolarAngleAxis: () => null,
    PolarGrid: () => null,
    PolarRadiusAxis: () => null,
    Sankey: ({ children, ...props }: CommonChartProps) => (
      <div data-testid="sankey" {...props}>
        {children}
      </div>
    ),
    default: { ResponsiveContainer: MockResponsiveContainer },
  };
});

// Chainable Supabase Mock with Proxy
const createSupabaseMock = () => {
  // chainMethods removed as it was unused

  const baseMock: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) =>
      (resolve as (value: unknown) => void)({ data: [], error: null })
    ),
    catch: vi.fn((reject) => (reject as (reason?: unknown) => void)(null)),
  };

  return new Proxy(baseMock, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as string];
      }
      return vi.fn().mockReturnThis();
    },
  });
};

// Global Supabase Mock
vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: createSupabaseMock(),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerCapture for Radix UI
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn();

beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});
