import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { CreateMatchInput, UpdateMatchInput } from '../types/actions';
import type { Match, MatchResult, Player } from '../types/models';

@customElement('admin-match-manager')
export class AdminMatchManager extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];
  @property({ type: Boolean }) mutating = false;

  @state() private matchName = 'Mejenga';
  @state() private matchDate = new Date().toISOString().slice(0, 10);
  @state() private result: MatchResult = 'draw';
  @state() private team1 = new Set<string>();
  @state() private team2 = new Set<string>();
  @state() private mvpPlayerId: string | null = null;
  @state() private editingMatchId: string | null = null;

  private saveMatch(): void {
    const payload: CreateMatchInput = {
      nombre: this.matchName,
      fechaISO: this.matchDate,
      team1PlayerIds: [...this.team1],
      team2PlayerIds: [...this.team2],
      resultado: this.result,
      mvpPlayerId: this.mvpPlayerId
    };

    if (this.editingMatchId) {
      const detail: UpdateMatchInput = { id: this.editingMatchId, ...payload };
      this.dispatchEvent(new CustomEvent('update-match', { detail, bubbles: true, composed: true }));
      this.resetForm();
      return;
    }

    this.dispatchEvent(new CustomEvent('create-match', { detail: payload, bubbles: true, composed: true }));
    this.resetForm();
  }

  private resetForm(): void {
    this.editingMatchId = null;
    this.matchName = 'Mejenga';
    this.matchDate = new Date().toISOString().slice(0, 10);
    this.result = 'draw';
    this.team1 = new Set();
    this.team2 = new Set();
    this.mvpPlayerId = null;
  }

  private startEdit(matchId: string): void {
    const match = this.matchList.find((m) => m.id === matchId);
    if (!match) return;
    this.editingMatchId = match.id;
    this.matchName = match.nombre;
    this.matchDate = match.fechaISO;
    this.result = match.resultado;
    this.team1 = new Set(match.team1PlayerIds);
    this.team2 = new Set(match.team2PlayerIds);
    this.mvpPlayerId = match.mvpPlayerId;
  }

  private deleteMatch(matchId: string): void {
    this.dispatchEvent(
      new CustomEvent('delete-match', { detail: { matchId }, bubbles: true, composed: true })
    );
  }

  private toggleTeam(playerId: string, team: 1 | 2, checked: boolean): void {
    if (team === 1) {
      checked ? this.team1.add(playerId) : this.team1.delete(playerId);
      this.team2.delete(playerId);
    } else {
      checked ? this.team2.add(playerId) : this.team2.delete(playerId);
      this.team1.delete(playerId);
    }
    this.requestUpdate();
  }

  render() {
    return html`
      <article>
        <h3>${this.editingMatchId ? 'Editar partido' : 'Nuevo partido'}</h3>

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

        <div class="grid two teams">
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
          <select
            .value=${this.result}
            @change=${(e: Event) => (this.result = (e.target as HTMLSelectElement).value as MatchResult)}
          >
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
            ${this.players.map((player) => html`<option value=${player.id}>${player.nombre}</option>`)}
          </select>

          <button ?disabled=${this.mutating} @click=${this.saveMatch}>
            ${this.editingMatchId ? 'Guardar cambios' : 'Guardar partido'}
          </button>
        </div>

        ${this.editingMatchId
          ? html`<button class="ghost" ?disabled=${this.mutating} @click=${this.resetForm}>Cancelar edicion</button>`
          : null}

        <h4 class="mt">Partidos guardados</h4>
        <ul>
          ${this.matchList.map(
            (match) => html`
              <li>
                <span>${match.nombre} (${match.fechaISO})</span>
                <div class="actions">
                  <button ?disabled=${this.mutating} @click=${() => this.startEdit(match.id)}>Editar</button>
                  <button class="danger" ?disabled=${this.mutating} @click=${() => this.deleteMatch(match.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            `
          )}
        </ul>
      </article>
    `;
  }

  static styles = css`
    article {
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 0.8rem;
      background: rgba(15, 23, 42, 0.45);
    }

    h3 {
      margin: 0 0 0.6rem;
      font-size: 0.9rem;
    }

    h4 {
      margin: 0.6rem 0 0.4rem;
      font-size: 0.82rem;
      color: #7dd3fc;
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

    .teams {
      margin-top: 0.8rem;
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

    button.ghost {
      margin-top: 0.7rem;
      background: transparent;
    }

    label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.84rem;
      margin-bottom: 0.25rem;
    }

    ul {
      list-style: none;
      margin: 0.6rem 0 0;
      padding: 0;
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

    .actions {
      display: flex;
      gap: 0.4rem;
    }

    .mt {
      margin-top: 1rem;
    }
  `;
}
