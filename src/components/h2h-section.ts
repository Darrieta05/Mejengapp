import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Match, Player } from '../types/models';
import { calculateH2H } from '../utils/calculations';

@customElement('h2h-section')
export class H2HSection extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];

  @state() private p1 = '';
  @state() private p2 = '';

  updated(changed: Map<string, unknown>): void {
    if (changed.has('players') && this.players.length > 1 && (!this.p1 || !this.p2)) {
      this.p1 = this.players[0]?.id ?? '';
      this.p2 = this.players[1]?.id ?? this.players[0]?.id ?? '';
    }
  }

  private onSelectP1(event: Event): void {
    this.p1 = (event.target as HTMLSelectElement).value;
  }

  private onSelectP2(event: Event): void {
    this.p2 = (event.target as HTMLSelectElement).value;
  }

  private get player1Name(): string {
    return this.players.find((p) => p.id === this.p1)?.nombre ?? 'Jugador 1';
  }

  private get player2Name(): string {
    return this.players.find((p) => p.id === this.p2)?.nombre ?? 'Jugador 2';
  }

  render() {
    if (this.players.length < 2) {
      return html`<section><p class="empty">Necesitas al menos 2 jugadores.</p></section>`;
    }

    const stats = this.p1 && this.p2 && this.p1 !== this.p2
      ? calculateH2H(this.p1, this.p2, this.matchList)
      : null;

    return html`
      <section>
        <h2>Cara a cara</h2>
        <div class="selectors">
          <label>Jugador 1 ${this.selectTemplate(this.p1, this.onSelectP1)}</label>
          <label>Jugador 2 ${this.selectTemplate(this.p2, this.onSelectP2)}</label>
        </div>
        ${stats
          ? html`
              <div class="grid">
                <article>
                  <h3>Companeros</h3>
                  <p>${stats.together.pj} partidos juntos</p>
                  <small>G ${stats.together.g} / E ${stats.together.e} / P ${stats.together.p}</small>
                </article>
                <article>
                  <h3>Rivales directos</h3>
                  <p>${stats.versus.pj} enfrentamientos</p>
                  <small>${this.player1Name} ${stats.versus.p1Wins} - ${stats.versus.p2Wins} ${this.player2Name}</small>
                </article>
              </div>
            `
          : html`<p class="empty">Selecciona dos jugadores distintos.</p>`}
      </section>
    `;
  }

  private selectTemplate(current: string, onChange: (event: Event) => void) {
    return html`
      <select .value=${current} @change=${onChange}>
        ${this.players.map((player) => html`<option value=${player.id}>${player.nombre}</option>`)}
      </select>
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

    .selectors {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.8rem;
    }

    label {
      display: grid;
      gap: 0.4rem;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    select {
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      background: #0f172a;
      color: var(--text);
      padding: 0.5rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: 1rem;
      gap: 0.8rem;
    }

    article {
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      background: rgba(15, 23, 42, 0.6);
      padding: 0.8rem;
    }

    h3 {
      margin: 0;
      font-size: 0.84rem;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    p {
      margin: 0.4rem 0;
      font-weight: 700;
    }

    small {
      color: var(--text-muted);
    }

    .empty {
      margin-top: 0.8rem;
      color: var(--text-muted);
    }
  `;
}
