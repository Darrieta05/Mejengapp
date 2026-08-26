import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Match, Player } from '../types/models';
import { buildEvolutionSeries, buildStandings, byDateAsc } from '../utils/calculations';

type ChartType = import('chart.js').Chart;
type LineChartConfig = import('chart.js').ChartConfiguration<'line'>;

let chartLoader: Promise<typeof import('chart.js')> | null = null;

function loadChartJs() {
  if (!chartLoader) {
    chartLoader = import('chart.js').then((mod) => {
      mod.Chart.register(...mod.registerables);
      return mod;
    });
  }
  return chartLoader;
}

@customElement('evolution-section')
export class EvolutionSection extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];

  private chart: ChartType | null = null;

  firstUpdated(): void {
    this.renderChart();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('players') || changed.has('matchList')) {
      this.renderChart();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.chart?.destroy();
  }

  private async renderChart(): Promise<void> {
    const canvas = this.renderRoot.querySelector('canvas');
    if (!canvas) return;

    const chartJs = await loadChartJs();

    const standings = buildStandings(this.players, this.matchList).slice(0, 5);
    const topIds = standings.map((row) => row.playerId);
    const labels = byDateAsc(this.matchList).map((_, index) => `J${index + 1}`);
    const series = buildEvolutionSeries(topIds, this.matchList);

    this.chart?.destroy();
    const config: LineChartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: standings.map((row, index) => ({
          label: row.nombre,
          data: series[row.playerId] ?? [],
          borderColor: palette[index % palette.length],
          backgroundColor: palette[index % palette.length],
          tension: 0.28
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, beginAtZero: true }
        }
      }
    };

    this.chart = new chartJs.Chart(canvas, config);
  }

  render() {
    return html`
      <section>
        <h2>Evolucion de puntos</h2>
        <div class="chart-wrap"><canvas></canvas></div>
      </section>
    `;
  }

  static styles = css`
    section {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 1rem;
    }

    h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
    }

    .chart-wrap {
      position: relative;
      min-height: 280px;
    }
  `;
}

const palette = ['#10b981', '#38bdf8', '#f59e0b', '#fb7185', '#a78bfa'];
