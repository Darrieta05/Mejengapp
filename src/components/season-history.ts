import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SeasonHistory } from '../types/models';

@customElement('season-history')
export class SeasonHistorySection extends LitElement {
  @property({ attribute: false }) history: SeasonHistory | null = null;

  render() {
    if (!this.history) return html``;
    return html`
      <section>
        <header>
          <div>
            <p class="eyebrow">Temporada cerrada</p>
            <h2>${this.history.name}</h2>
          </div>
          <span class="date">${formatDate(this.history.endedAt)}</span>
        </header>
        <div class="metrics">
          <span><strong>${this.history.matchCount}</strong> partidos</span>
          <span><strong>${this.history.playerCount}</strong> jugadores</span>
          <span><strong>${this.history.totalAttendance}</strong> asistencias</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Jugador</th><th>PJ</th><th>Pts</th><th>MVP</th></tr></thead>
            <tbody>
              ${this.history.finalStandings.map(
                (row, index) => html`<tr><td>${index + 1}</td><td>${row.nombre}</td><td>${row.pj}</td><td class="points">${row.puntos}</td><td>${row.mvp || '-'}</td></tr>`
              )}
            </tbody>
          </table>
        </div>
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

    header,
    .metrics {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1.05rem;
    }

    .eyebrow {
      margin-bottom: 0.2rem;
      color: #fbbf24;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .date,
    .metrics {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .metrics {
      justify-content: flex-start;
      margin: 1rem 0;
    }

    .metrics span {
      border-left: 2px solid #fbbf24;
      padding-left: 0.55rem;
    }

    strong,
    .points {
      color: #86efac;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }

    th,
    td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.13);
    }

    th {
      color: var(--text-muted);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
  `;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value));
}