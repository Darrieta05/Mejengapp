import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MatchResult, Player } from '../types/models';

@customElement('admin-panel')
export class AdminPanel extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ type: Boolean }) wrappedEnabled = false;
  @property({ type: Boolean }) mutating = false;

  @state() private newPlayerName = '';
  @state() private matchName = 'Mejenga';
  @state() private matchDate = new Date().toISOString().slice(0, 10);
  @state() private result: MatchResult = 'draw';
  @state() private team1 = new Set<string>();
  @state() private team2 = new Set<string>();
  @state() private mvpPlayerId: string | null = null;

  private onCreatePlayer(): void {
    this.dispatchEvent(
      new CustomEvent('create-player', {
        detail: { nombre: this.newPlayerName },
        bubbles: true,
        composed: true
      })
    );
    this.newPlayerName = '';
  }

  private onCreateMatch(): void {
    this.dispatchEvent(
      new CustomEvent('create-match', {
        detail: {
          nombre: this.matchName,
          fechaISO: this.matchDate,
          team1PlayerIds: [...this.team1],
          team2PlayerIds: [...this.team2],
          resultado: this.result,
          mvpPlayerId: this.mvpPlayerId
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private onToggleWrapped(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.dispatchEvent(
      new CustomEvent('toggle-wrapped', {
        detail: { enabled: checked },
        bubbles: true,
        composed: true
      })
    );
  }

  private onLogout(): void {
    this.dispatchEvent(new CustomEvent('logout-admin', { bubbles: true, composed: true }));
  }

  private toggleTeam(playerId: string, team: 1 | 2, checked: boolean): void {
    if (team === 1) {
      if (checked) {
        this.team1.add(playerId);
        this.team2.delete(playerId);
      } else {
        this.team1.delete(playerId);
      }
    } else {
      if (checked) {
        this.team2.add(playerId);
        this.team1.delete(playerId);
      } else {
        this.team2.delete(playerId);
      }
    }
    this.requestUpdate();
  }

  render() {
    return html`
      <section>
        <header>
          <h2>Panel admin</h2>
          <button ?disabled=${this.mutating} @click=${this.onLogout}>Cerrar sesion</button>
        </header>

        <div class="grid two">
          <article>
            <h3>Jugadores</h3>
            <div class="row">
              <input
                .value=${this.newPlayerName}
                @input=${(e: Event) => (this.newPlayerName = (e.target as HTMLInputElement).value)}
                placeholder="Nombre jugador"
              />
              <button ?disabled=${this.mutating} @click=${this.onCreatePlayer}>Agregar</button>
            </div>
            <ul>
              ${this.players.map(
                (player) => html`
                  <li>
                    <span>${player.nombre}</span>
                    <button
                      class="danger"
                      ?disabled=${this.mutating}
                      @click=${() =>
                        this.dispatchEvent(
                          new CustomEvent('delete-player', {
                            detail: { playerId: player.id },
                            bubbles: true,
                            composed: true
                          })
                        )}
                    >
                      Eliminar
                    </button>
                  </li>
                `
              )}
            </ul>
          </article>

          <article>
            <h3>Configuracion</h3>
            <label class="toggle">
              <input type="checkbox" .checked=${this.wrappedEnabled} @change=${this.onToggleWrapped} />
              Resumen publico habilitado
            </label>
          </article>
        </div>

        <article>
          <h3>Nuevo partido</h3>
          <div class="grid two">
            <input
              .value=${this.matchName}
              @input=${(e: Event) => (this.matchName = (e.target as HTMLInputElement).value)}
              placeholder="Nombre del partido"
            />
            <input
              type="date"
              .value=${this.matchDate}
              @input=${(e: Event) => (this.matchDate = (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="grid two">
            <div>
              <h4>Equipo 1</h4>
              ${this.players.map(
                (player) => html`
                  <label>
                    <input
                      type="checkbox"
                      .checked=${this.team1.has(player.id)}
                      @change=${(e: Event) =>
                        this.toggleTeam(player.id, 1, (e.target as HTMLInputElement).checked)}
                    />
                    ${player.nombre}
                  </label>
                `
              )}
            </div>
            <div>
              <h4>Equipo 2</h4>
              ${this.players.map(
                (player) => html`
                  <label>
                    <input
                      type="checkbox"
                      .checked=${this.team2.has(player.id)}
                      @change=${(e: Event) =>
                        this.toggleTeam(player.id, 2, (e.target as HTMLInputElement).checked)}
                    />
                    ${player.nombre}
                  </label>
                `
              )}
            </div>
          </div>

          <div class="grid three">
            <select .value=${this.result} @change=${(e: Event) => (this.result = (e.target as HTMLSelectElement).value as MatchResult)}>
              <option value="team1">Gana equipo 1</option>
              <option value="draw">Empate</option>
              <option value="team2">Gana equipo 2</option>
            </select>

            <select
              .value=${this.mvpPlayerId ?? ''}
              @change=${(e: Event) => {
                const value = (e.target as HTMLSelectElement).value;
                this.mvpPlayerId = value ? value : null;
              }}
            >
              <option value="">Sin MVP</option>
              ${this.players.map((player) => html`<option value=${player.id}>${player.nombre}</option>`) }
            </select>

            <button ?disabled=${this.mutating} @click=${this.onCreateMatch}>Guardar partido</button>
          </div>
        </article>
      </section>
    `;
  }

  static styles = css`
    section {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
    }

    h2,
    h3,
    h4 {
      margin: 0;
    }

    h3 {
      margin-bottom: 0.6rem;
      font-size: 0.9rem;
    }

    h4 {
      margin-bottom: 0.4rem;
      font-size: 0.82rem;
      color: #7dd3fc;
    }

    article {
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 0.8rem;
      background: rgba(15, 23, 42, 0.45);
    }

    .grid {
      display: grid;
      gap: 0.8rem;
    }

    .two {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .three {
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    }

    .row {
      display: flex;
      gap: 0.5rem;
    }

    input,
    select,
    button {
      border: 1px solid var(--surface-border);
      background: #0f172a;
      color: var(--text);
      border-radius: 8px;
      padding: 0.5rem;
      font-size: 0.86rem;
    }

    button {
      cursor: pointer;
      font-weight: 700;
    }

    button.danger {
      color: #fecaca;
      border-color: rgba(248, 113, 113, 0.6);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0.8rem 0 0;
      display: grid;
      gap: 0.4rem;
    }

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.86rem;
    }

    label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.84rem;
      margin-bottom: 0.25rem;
    }

    .toggle {
      margin-top: 0.6rem;
    }
  `;
}
