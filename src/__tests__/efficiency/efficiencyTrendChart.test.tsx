/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EfficiencyTrendChart } from '@/features/efficiency/components/EfficiencyTrendChart';

// Mock recharts because it uses ResizeObserver and SVG which is hard for JSDOM
vi.mock('recharts', async (importOriginal) => {
  const Actual = await importOriginal<typeof import('recharts')>();
  return {
    ...Actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: (props: { data: unknown[]; children: React.ReactNode }) => {
      // We expose the props passed to BarChart for testing
      return (
        <div
          data-testid="barchart"
          data-mock-props={JSON.stringify(props.data)}
        >
          {props.children}
        </div>
      );
    },
    Bar: (props: { dataKey: string; children?: React.ReactNode }) => (
      <div data-testid="bar" data-datakey={props.dataKey}>
        {props.children}
      </div>
    ),
    XAxis: (props: { dataKey: string }) => (
      <div data-testid="xaxis" data-datakey={props.dataKey}></div>
    ),
    YAxis: (props: { domain: [number, number] }) => (
      <div data-testid="yaxis" data-domain={JSON.stringify(props.domain)}></div>
    ),
    ReferenceArea: () => <div data-testid="ref-area"></div>,
    ReferenceLine: () => <div data-testid="ref-line"></div>,
    CartesianGrid: () => <div data-testid="grid"></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
    Cell: () => <div data-testid="cell"></div>,
  };
});

describe('EfficiencyTrendChart - UI Test', () => {
  it('should process { score: 85 } into { score: 85, deviation: 84 } and pass it to BarChart', () => {
    // According to the component code: item.deviation = item.score - 1.0
    // So a score of 85 becomes deviation 84.
    const mockData = [
      {
        date: '2024-05-20',
        score: 85,
        workMinutes: 60,
        videoMinutes: 40,
      },
    ];

    const { getByTestId } = render(<EfficiencyTrendChart data={mockData} />);

    const barChart = getByTestId('barchart');
    const passedData = JSON.parse(
      barChart.getAttribute('data-mock-props') || '[]'
    );

    expect(passedData.length).toBe(1);
    expect(passedData[0].score).toBe(85);
    expect(passedData[0].deviation).toBe(84); // 85 - 1.0 = 84
    expect(passedData[0].workMinutes).toBe(60);
  });

  it("should not manipulate the user's data incorrectly (e.g. no Math.floor that destroys decimals on score)", () => {
    const mockData = [
      {
        date: '2024-05-20',
        score: 1.25, // Decimal score
        workMinutes: 60,
        videoMinutes: 40,
      },
    ];

    const { getByTestId } = render(<EfficiencyTrendChart data={mockData} />);
    const barChart = getByTestId('barchart');
    const passedData = JSON.parse(
      barChart.getAttribute('data-mock-props') || '[]'
    );

    // The score should remain EXACTLY 1.25 (raw form)
    expect(passedData[0].score).toBe(1.25);
    expect(passedData[0].deviation).toBe(0.25); // 1.25 - 1.0 = 0.25
  });

  it('should set the Y-Axis domain correctly, not bound to [0,0]', () => {
    const { getByTestId } = render(<EfficiencyTrendChart data={[]} />);

    const yAxis = getByTestId('yaxis');
    const domainStr = yAxis.getAttribute('data-domain');
    const domain = JSON.parse(domainStr || '[]');

    // According to the code: domain={[-1.0, 2.0]}
    expect(domain).toEqual([-1.0, 2.0]);
    // Also assert it is NOT [0,0] as requested by user's prompt edge-case
    expect(domain).not.toEqual([0, 0]);
  });
});
