import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Match, Player, StandingRow } from '../types/models';
import { buildStandings } from '../utils/calculations';

@customElement('standings-section')
export class StandingsSection extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];

  @state() private query = '';

  private onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value.toLowerCase().trim();
  }

  private get rows(): StandingRow[] {
    const rows = buildStandings(this.players, this.matchList);
    if (!this.query) return rows;
    return rows.filter((row) => row.nombre.toLowerCase().includes(this.query));
  }

  render() {
    return html`
      <section>
        <div class="title-row">
          <h2>Tabla general</h2>
          <input type="search" placeholder="Buscar jugador" @input=${this.onSearch} />
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>Efec</th>
              <th>Pts</th>
              <th>MVP</th>
            </tr>
          </thead>
          <tbody>
            ${this.rows.map((row, idx) => this.renderRow(row, idx + 1))}
          </tbody>
        </table>
      </section>
    `;
  }

  private renderRow(row: StandingRow, position: number) {
    return html`
      <tr>
        <td>${position}</td>
        <td>${row.nombre}</td>
        <td>${row.pj}</td>
        <td>${row.g}</td>
        <td>${row.e}</td>
        <td>${row.p}</td>
        <td>${row.efectividad}%</td>
        <td class="points">${row.puntos}</td>
        <td>${row.mvp > 0 ? row.mvp : '-'}</td>
      </tr>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    section {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      overflow: hidden;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    h2 {
      margin: 0;
      font-size: 1rem;
    }

    input {
      border: 1px solid var(--surface-border);
      background: #0f172a;
      color: var(--text);
      border-radius: 8px;
      padding: 0.5rem;
      min-width: 170px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.86rem;
    }

    th,
    td {
      padding: 0.55rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.13);
    }

    th {
      color: var(--text-muted);
      background: rgba(15, 23, 42, 0.8);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .points {
      font-weight: 800;
      color: #86efac;
    }

    @media (max-width: 740px) {
      table {
        display: block;
        overflow-x: auto;
      }
      input {
        min-width: 120px;
      }
    }
  `;
}
