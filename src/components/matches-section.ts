import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Match, Player } from '../types/models';
import { byDateDesc } from '../utils/calculations';

@customElement('matches-section')
export class MatchesSection extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];
  @property({ type: Boolean }) adminMode = false;

  render() {
    if (this.matchList.length === 0) {
      return html`<section><p>No hay partidos registrados.</p></section>`;
    }

    const playersById = new Map(this.players.map((p) => [p.id, p.nombre]));
    const list = byDateDesc(this.matchList);

    return html`
      <section>
        <h2>Historial de partidos</h2>
        <div class="list">
          ${list.map((match) => this.renderMatch(match, playersById))}
        </div>
      </section>
    `;
  }

  private renderMatch(match: Match, playersById: Map<string, string>) {
    const team1 = match.team1PlayerIds.map((id) => playersById.get(id) ?? id).join(', ');
    const team2 = match.team2PlayerIds.map((id) => playersById.get(id) ?? id).join(', ');
    const mvp = match.mvpPlayerId ? playersById.get(match.mvpPlayerId) ?? match.mvpPlayerId : '-';

    return html`
      <article>
        <header>
          <div class="head-main">
            <strong>${match.nombre}</strong>
            <time>${match.fechaISO}</time>
          </div>
          ${this.adminMode
            ? html`
                <button
                  class="danger"
                  @click=${() =>
                    this.dispatchEvent(
                      new CustomEvent('delete-match', {
                        detail: { matchId: match.id },
                        bubbles: true,
                        composed: true
                      })
                    )}
                >
                  Eliminar
                </button>
              `
            : null}
        </header>
        <p>Equipo 1: ${team1 || '-'}</p>
        <p>Equipo 2: ${team2 || '-'}</p>
        <p>Resultado: ${formatResult(match.resultado)}</p>
        <p>MVP: ${mvp}</p>
      </article>
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

    .list {
      display: grid;
      gap: 0.7rem;
    }

    article {
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      background: rgba(15, 23, 42, 0.6);
      padding: 0.8rem;
      font-size: 0.88rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .head-main {
      display: grid;
      gap: 0.15rem;
    }

    p {
      margin: 0.2rem 0;
      color: var(--text-muted);
    }

    strong {
      color: var(--text);
    }

    time {
      color: #93c5fd;
      font-size: 0.78rem;
      font-weight: 700;
    }

    button {
      border: 1px solid var(--surface-border);
      background: #0f172a;
      color: var(--text);
      border-radius: 8px;
      padding: 0.35rem 0.55rem;
      font-size: 0.8rem;
      cursor: pointer;
    }

    button.danger {
      color: #fecaca;
      border-color: rgba(248, 113, 113, 0.6);
    }
  `;
}

function formatResult(result: Match['resultado']): string {
  if (result === 'team1') return 'Gano equipo 1';
  if (result === 'team2') return 'Gano equipo 2';
  return 'Empate';
}
