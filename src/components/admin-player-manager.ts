import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Player } from '../types/models';

@customElement('admin-player-manager')
export class AdminPlayerManager extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ type: Boolean }) mutating = false;

  @state() private newPlayerName = '';
  @state() private editingPlayerId: string | null = null;
  @state() private editingPlayerName = '';

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

  private startEdit(player: Player): void {
    this.editingPlayerId = player.id;
    this.editingPlayerName = player.nombre;
  }

  private cancelEdit(): void {
    this.editingPlayerId = null;
    this.editingPlayerName = '';
  }

  private saveEdit(): void {
    if (!this.editingPlayerId) return;
    this.dispatchEvent(
      new CustomEvent('update-player', {
        detail: { playerId: this.editingPlayerId, nombre: this.editingPlayerName },
        bubbles: true,
        composed: true
      })
    );
    this.cancelEdit();
  }

  private deletePlayer(playerId: string): void {
    this.dispatchEvent(
      new CustomEvent('delete-player', {
        detail: { playerId },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
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
          ${this.players.map((player) => this.renderPlayerRow(player))}
        </ul>
      </article>
    `;
  }

  private renderPlayerRow(player: Player) {
    if (this.editingPlayerId === player.id) {
      return html`
        <li>
          <input
            .value=${this.editingPlayerName}
            @input=${(e: Event) => (this.editingPlayerName = (e.target as HTMLInputElement).value)}
          />
          <div class="actions">
            <button ?disabled=${this.mutating} @click=${this.saveEdit}>Guardar</button>
            <button ?disabled=${this.mutating} @click=${this.cancelEdit}>Cancelar</button>
          </div>
        </li>
      `;
    }

    return html`
      <li>
        <span>${player.nombre}</span>
        <div class="actions">
          <button ?disabled=${this.mutating} @click=${() => this.startEdit(player)}>Editar</button>
          <button class="danger" ?disabled=${this.mutating} @click=${() => this.deletePlayer(player.id)}>
            Eliminar
          </button>
        </div>
      </li>
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

    .row {
      display: flex;
      gap: 0.5rem;
    }

    input,
    button {
      border: 1px solid var(--surface-border);
      background: #0f172a;
      color: var(--text);
      border-radius: 8px;
      padding: 0.5rem;
      font-size: 0.86rem;
    }

    button {
      font-weight: 700;
      cursor: pointer;
    }

    button.danger {
      color: #fecaca;
      border-color: rgba(248, 113, 113, 0.6);
    }

    ul {
      list-style: none;
      margin: 0.8rem 0 0;
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
  `;
}
