import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { League, Player } from '../types/models';

@customElement('admin-player-manager')
export class AdminPlayerManager extends LitElement {
  @property({ attribute: false }) league: League | null = null;
  @property({ attribute: false }) players: Player[] = [];
  @property({ type: Boolean }) mutating = false;

  @state() private newPlayerName = '';
  @state() private newPlayerEmail = '';
  @state() private editingPlayerId: string | null = null;
  @state() private editingPlayerName = '';
  @state() private editingPlayerEmail = '';

  private getInviteMailto(player: Player): string {
    const leagueName = this.league?.name ?? 'nuestra liga';
    const code = this.league?.code ?? '';
    const subject = encodeURIComponent(`Invitación a unirte a la liga ${leagueName} - Mejengapp`);
    const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    const body = encodeURIComponent(
      `¡Hola ${player.nombre}!\n\n` +
      `Te invito a unirte a nuestra liga "${leagueName}" en Mejengapp.\n\n` +
      `Código de la liga: ${code}\n` +
      `Ingresa directamente aquí: ${appUrl}\n\n` +
      `¡Nos vemos en la cancha!`
    );
    return `mailto:${encodeURIComponent(player.email ?? '')}?subject=${subject}&body=${body}`;
  }

  private onCreatePlayer(): void {
    this.dispatchEvent(
      new CustomEvent('create-player', {
        detail: {
          nombre: this.newPlayerName,
          email: this.newPlayerEmail.trim() || null,
          onSuccess: () => {
            this.newPlayerName = '';
            this.newPlayerEmail = '';
          }
        },
        bubbles: true,
        composed: true
      })
    );
  }

  private startEdit(player: Player): void {
    this.editingPlayerId = player.id;
    this.editingPlayerName = player.nombre;
    this.editingPlayerEmail = player.email ?? '';
  }

  private cancelEdit(): void {
    this.editingPlayerId = null;
    this.editingPlayerName = '';
    this.editingPlayerEmail = '';
  }

  private saveEdit(): void {
    if (!this.editingPlayerId) return;
    this.dispatchEvent(
      new CustomEvent('update-player', {
        detail: {
          playerId: this.editingPlayerId,
          nombre: this.editingPlayerName,
          email: this.editingPlayerEmail.trim() || null
        },
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
        <div class="add-player-box">
          <input
            .value=${this.newPlayerName}
            @input=${(e: Event) => (this.newPlayerName = (e.target as HTMLInputElement).value)}
            placeholder="Nombre jugador"
          />
          <input
            type="email"
            .value=${this.newPlayerEmail}
            @input=${(e: Event) => (this.newPlayerEmail = (e.target as HTMLInputElement).value)}
            placeholder="Correo (opcional)"
          />
          <button class="add-btn" ?disabled=${this.mutating || !this.newPlayerName.trim()} @click=${this.onCreatePlayer}>
            + Agregar jugador
          </button>
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
        <li class="editing-item">
          <div class="edit-inputs">
            <input
              .value=${this.editingPlayerName}
              @input=${(e: Event) => (this.editingPlayerName = (e.target as HTMLInputElement).value)}
              placeholder="Nombre"
            />
            <input
              type="email"
              .value=${this.editingPlayerEmail}
              @input=${(e: Event) => (this.editingPlayerEmail = (e.target as HTMLInputElement).value)}
              placeholder="Correo (opcional)"
            />
          </div>
          <div class="actions">
            <button ?disabled=${this.mutating} @click=${this.saveEdit}>Guardar</button>
            <button ?disabled=${this.mutating} @click=${this.cancelEdit}>Cancelar</button>
          </div>
        </li>
      `;
    }

    return html`
      <li>
        <div class="player-info">
          <span class="player-name">${player.nombre}</span>
          ${player.email
            ? html`
                <div class="player-email-row">
                  <span class="player-email" title="Vinculado a ${player.email}">✉ ${player.email}</span>
                  <a
                    class="invite-link"
                    href=${this.getInviteMailto(player)}
                    title="Enviar invitación por correo desde tu cliente de correo"
                  >
                    ✉ Invitar
                  </a>
                </div>
              `
            : null}
        </div>
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
    :host {
      display: block;
      min-width: 0;
      width: 100%;
    }

    * {
      box-sizing: border-box;
    }

    article {
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 0.8rem;
      background: rgba(15, 23, 42, 0.45);
      min-width: 0;
      position: relative;
    }

    h3 {
      margin: 0 0 0.6rem;
      font-size: 0.9rem;
    }

    .add-player-box {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
      width: 100%;
      min-width: 0;
    }

    @media (min-width: 640px) {
      .add-player-box {
        grid-template-columns: 1fr 1fr;
      }
      .add-player-box .add-btn {
        grid-column: 1 / -1;
      }
    }

    input,
    button,
    .invite-link {
      border: 1px solid var(--surface-border);
      background: #0f172a;
      color: var(--text);
      border-radius: 8px;
      padding: 0.5rem;
      font-size: 0.86rem;
      min-width: 0;
      box-sizing: border-box;
    }

    input {
      width: 100%;
    }

    button {
      font-weight: 700;
      cursor: pointer;
    }

    .add-btn {
      background: var(--brand-primary, #0ea5e9);
      color: #fff;
      border: none;
      padding: 0.55rem;
      width: 100%;
      min-height: 44px;
      position: relative;
      z-index: 10;
      transition: opacity 0.2s;
    }

    .add-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.danger {
      color: #fecaca;
      border-color: rgba(248, 113, 113, 0.6);
    }

    ul {
      list-style: none;
      margin: 0;
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
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      min-width: 0;
    }

    .editing-item {
      flex-direction: column;
      align-items: stretch;
      gap: 0.4rem;
    }

    .edit-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
    }

    @media (max-width: 500px) {
      .edit-inputs {
        grid-template-columns: 1fr;
      }
    }

    .player-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
      flex: 1;
    }

    .player-name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .player-email-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .player-email {
      font-size: 0.74rem;
      color: #7dd3fc;
      opacity: 0.85;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 140px;
    }

    .invite-link {
      font-size: 0.72rem;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.4);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      font-weight: 600;
      transition: background 0.2s;
    }

    .invite-link:hover {
      background: rgba(14, 165, 233, 0.3);
      color: #fff;
    }

    .actions {
      display: flex;
      gap: 0.4rem;
      flex-shrink: 0;
    }
  `;
}
