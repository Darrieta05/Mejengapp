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

  private onSelectPlayer(playerId: string): void {
    this.dispatchEvent(
      new CustomEvent('select-player', {
        detail: { playerId },
        bubbles: true,
        composed: true
      })
    );
  }

  private renderRow(row: StandingRow, position: number) {
    return html`
      <tr>
        <td>${position}</td>
        <td>
          <button
            class="player-link"
            title="Ver perfil y estadísticas de ${row.nombre}"
            @click=${() => this.onSelectPlayer(row.playerId)}
          >
            ${row.nombre}
            ${row.email ? html`<span class="email-indicator" title="Usuario registrado">●</span>` : null}
          </button>
        </td>
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

    .player-link {
      background: none;
      border: none;
      padding: 0;
      color: #38bdf8;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-color: rgba(56, 189, 248, 0.4);
      transition: all 0.15s ease;
    }

    .player-link:hover {
      color: #7dd3fc;
      text-decoration-color: #7dd3fc;
    }

    .email-indicator {
      font-size: 0.6rem;
      color: #34d399;
      line-height: 1;
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
