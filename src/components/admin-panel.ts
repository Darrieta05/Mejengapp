import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { League, Match, Player, Season } from '../types/models';
import './admin-player-manager';
import './admin-match-manager';
import './season-manager';

@customElement('admin-panel')
export class AdminPanel extends LitElement {
  @property({ attribute: false }) league: League | null = null;
  @property({ attribute: false }) players: Player[] = [];
  @property({ attribute: false }) matchList: Match[] = [];
  @property({ attribute: false }) season: Season | null = null;
  @property({ type: Boolean }) wrappedEnabled = false;
  @property({ type: Boolean }) mutating = false;
  @property({ type: String }) leagueColor = '#0ea5e9';

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

  private onSelectColor(color: string): void {
    this.dispatchEvent(
      new CustomEvent('change-league-color', {
        detail: { color },
        bubbles: true,
        composed: true
      })
    );
  }

  private onLogout(): void {
    this.dispatchEvent(new CustomEvent('logout-admin', { bubbles: true, composed: true }));
  }

  render() {
    const presetColors = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

    return html`
      <section>
        <header>
          <h2>Panel admin</h2>
          <button ?disabled=${this.mutating} @click=${this.onLogout}>Cerrar sesion</button>
        </header>

        <div class="grid two">
          <admin-player-manager
            .league=${this.league}
            .players=${this.players}
            .mutating=${this.mutating}
          ></admin-player-manager>

          <article>
            <h3>Configuración de liga</h3>
            <label class="toggle">
              <input type="checkbox" .checked=${this.wrappedEnabled} @change=${this.onToggleWrapped} />
              Resumen publico habilitado
            </label>
            <div class="color-section">
              <span class="color-label">Color de la liga:</span>
              <div class="color-presets">
                ${presetColors.map(
                  (c) => html`
                    <button
                      type="button"
                      class="color-btn ${this.leagueColor === c ? 'selected' : ''}"
                      style="background: ${c};"
                      title="Seleccionar color ${c}"
                      aria-label="Seleccionar color ${c}"
                      aria-pressed=${this.leagueColor === c ? 'true' : 'false'}
                      ?disabled=${this.mutating}
                      @click=${() => this.onSelectColor(c)}
                    ></button>
                  `
                )}
              </div>
            </div>
          </article>

          <season-manager .season=${this.season} .mutating=${this.mutating}></season-manager>
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
      min-width: 0;
    }

    .grid {
      display: grid;
      gap: 0.8rem;
    }

    .two {
      grid-template-columns: 1fr;
    }

    @media (min-width: 860px) {
      .two {
        grid-template-columns: 1.2fr 1fr 1fr;
      }
    }

    admin-player-manager {
      min-width: 0;
      width: 100%;
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

    .color-section {
      margin-top: 0.8rem;
      padding-top: 0.6rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .color-label {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .color-presets {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .color-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      padding: 0;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .color-btn:hover {
      transform: scale(1.15);
    }

    .color-btn.selected {
      border-color: #ffffff;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
      transform: scale(1.12);
    }
  `;
}
