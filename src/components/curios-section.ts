import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Match, Player } from '../types/models';
import { buildStandings } from '../utils/calculations';

@customElement('curios-section')
export class CuriosSection extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];

  render() {
    if (this.players.length === 0 || this.matchList.length === 0) {
      return html`<section><p>Registra datos para habilitar esta seccion.</p></section>`;
    }

    const standings = buildStandings(this.players, this.matchList);
    const mostWins = standings[0];
    const mvpKing = [...standings].sort((a, b) => b.mvp - a.mvp)[0];
    const quorumMatch = [...this.matchList].sort((a, b) => b.asistencia - a.asistencia)[0];

    return html`
      <section>
        <h2>Datos curiosos</h2>
        <div class="grid">
          <article>
            <h3>Lider actual</h3>
            <p>${mostWins.nombre}</p>
            <small>${mostWins.puntos} puntos</small>
          </article>
          <article>
            <h3>Rey del MVP</h3>
            <p>${mvpKing.nombre}</p>
            <small>${mvpKing.mvp} MVPs</small>
          </article>
          <article>
            <h3>Mayor quorum</h3>
            <p>${quorumMatch.nombre}</p>
            <small>${quorumMatch.asistencia} jugadores</small>
          </article>
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

    h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
    }

    .grid {
      display: grid;
      gap: 0.8rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    article {
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      background: rgba(15, 23, 42, 0.6);
      padding: 0.8rem;
    }

    h3 {
      margin: 0;
      color: #facc15;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    p {
      margin: 0.5rem 0 0.25rem;
      font-size: 1rem;
      font-weight: 800;
    }

    small {
      color: var(--text-muted);
    }
  `;
}
