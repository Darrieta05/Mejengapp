import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String })
  seasonLabel = 'Temporada';

  @property({ type: String })
  leaderLabel = 'Sin datos';

  @property({ type: Boolean })
  adminMode = false;

  @property({ type: String })
  userEmail = '';

  private onOpenChooser(): void {
    this.dispatchEvent(new CustomEvent('open-chooser', { bubbles: true, composed: true }));
  }

  private onAdminToggle(): void {
    this.dispatchEvent(new CustomEvent('toggle-admin', { bubbles: true, composed: true }));
  }

  private onLogout(): void {
    this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <header>
        <div class="title-block">
          <div class="brand-row">
            <h1>Mejengapp</h1>
            <button class="hub-btn" @click=${this.onOpenChooser} title="Ver todas mis ligas">
              🏠 Mis Ligas
            </button>
          </div>
          <p>${this.seasonLabel}</p>
        </div>
        <div class="status-block">
          <span class="leader">${this.leaderLabel}</span>
          <slot name="league-switcher"></slot>
          <slot name="season-switcher"></slot>
          ${this.userEmail ? html`<span class="user">${this.userEmail}</span>` : null}
          ${this.adminMode ? html`<button class="admin-btn" @click=${this.onAdminToggle}>Panel admin</button>` : null}
          <button class="logout" @click=${this.onLogout}>Salir</button>
        </div>
      </header>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.2rem;
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      background: linear-gradient(130deg, #14213d 0%, #0b132b 60%, #121826 100%);
      box-shadow: 0 16px 40px rgba(2, 7, 20, 0.35);
    }

    h1 {
      margin: 0;
      font-size: 1.4rem;
      letter-spacing: 0.02em;
    }

    p {
      margin: 0.2rem 0 0;
      color: #9cdafc;
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .status-block {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .leader {
      color: #9ae6b4;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .user {
      max-width: 180px;
      overflow: hidden;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .hub-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--surface-border);
      font-size: 0.76rem;
      padding: 0.3rem 0.65rem;
      color: #7dd3fc;
      border-radius: 8px;
    }

    .hub-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .admin-btn {
      background: rgba(250, 204, 21, 0.15);
      border-color: rgba(250, 204, 21, 0.4);
      color: #fde047;
    }

    button {
      border: 1px solid var(--surface-border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }

    button.logout {
      color: var(--text-muted);
    }

    @media (max-width: 760px) {
      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.8rem;
        padding: 0.9rem;
      }
      .title-block {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .status-block {
        width: 100%;
        justify-content: space-between;
        gap: 0.5rem;
      }
    }
  `;
}
