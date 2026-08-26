import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Match, Player } from '../types/models';
import './admin-player-manager';
import './admin-match-manager';

@customElement('admin-panel')
export class AdminPanel extends LitElement {
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];
  @property({ type: Boolean }) wrappedEnabled = false;
  @property({ type: Boolean }) mutating = false;

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

  render() {
    return html`
      <section>
        <header>
          <h2>Panel admin</h2>
          <button ?disabled=${this.mutating} @click=${this.onLogout}>Cerrar sesion</button>
        </header>

        <div class="grid two">
          <admin-player-manager
            .players=${this.players}
            .mutating=${this.mutating}
          ></admin-player-manager>

          <article>
            <h3>Configuracion</h3>
            <label class="toggle">
              <input type="checkbox" .checked=${this.wrappedEnabled} @change=${this.onToggleWrapped} />
              Resumen publico habilitado
            </label>
          </article>
        </div>

        <admin-match-manager
          .players=${this.players}
          .matchList=${this.matchList}
          .mutating=${this.mutating}
        ></admin-match-manager>
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
      cursor: pointer;
      font-weight: 700;
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
