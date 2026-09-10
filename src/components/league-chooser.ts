import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { UserLeague } from '../types/models';

const PRESETS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

@customElement('league-chooser')
export class LeagueChooser extends LitElement {
  @property({ attribute: false }) memberships: UserLeague[] = [];
  @property({ type: Boolean }) busy = false;
  @property({ type: Boolean }) canClose = false;
  @property({ type: String }) error = '';

  @state() private leagueName = '';
  @state() private leagueCode = '';
  @state() private selectedColor = '#0ea5e9';
  @state() private activeTab: 'create' | 'join' = 'create';

  private selectLeague(leagueId: string): void {
    this.dispatchEvent(new CustomEvent('league-change', { detail: { leagueId }, bubbles: true, composed: true }));
  }

  private createLeague(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('create-league', {
        detail: { name: this.leagueName, themeColor: this.selectedColor },
        bubbles: true,
        composed: true
      })
    );
  }

  private joinLeague(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('join-league', { detail: { code: this.leagueCode }, bubbles: true, composed: true })
    );
  }

  render() {
    return html`
      <main class="chooser">
        <section>
          <header>
            <div>
              <p class="eyebrow">Tu espacio de juego</p>
              <h1>Panel de Ligas</h1>
              <p class="intro">Ingresa a tus ligas o crea una nueva para comenzar.</p>
            </div>
            ${this.canClose
              ? html`<button class="quiet" ?disabled=${this.busy} @click=${() => this.dispatchEvent(new CustomEvent('close-chooser', { bubbles: true, composed: true }))}>✕ Volver</button>`
              : null}
          </header>

          ${this.error ? html`<p class="error">${this.error}</p>` : null}

          ${this.memberships.length > 0 ? this.renderMyLeagues() : null}

          <div class="hub-tabs">
            <button
              type="button"
              class="hub-tab ${this.activeTab === 'create' ? 'active' : ''}"
              @click=${() => (this.activeTab = 'create')}
            >+ Crear nueva liga</button>
            <button
              type="button"
              class="hub-tab ${this.activeTab === 'join' ? 'active' : ''}"
              @click=${() => (this.activeTab = 'join')}
            >🔗 Unirse con código</button>
          </div>

          <div class="forms-container">
            ${this.activeTab === 'create' ? this.renderCreateForm() : this.renderJoinForm()}
          </div>

          <button class="logout" ?disabled=${this.busy} @click=${() => this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }))}>
            Cerrar sesión
          </button>
        </section>
      </main>
    `;
  }

  private renderMyLeagues() {
    return html`
      <div class="my-leagues">
        <h2>Mis Ligas</h2>
        <div class="leagues-grid">
          ${this.memberships.map((item) => {
            const color = item.league.themeColor || '#0ea5e9';
            const isAdmin = item.membership.role === 'admin';
            return html`
              <div class="league-card" style="border-left: 4px solid ${color};">
                <div class="card-head">
                  <div class="card-title">
                    <span class="dot" style="background: ${color};"></span>
                    <strong>${item.league.name}</strong>
                  </div>
                  <span class="role ${isAdmin ? 'admin' : 'player'}">${isAdmin ? 'Admin' : 'Jugador'}</span>
                </div>
                <p class="code">Código: <code>${item.league.code}</code></p>
                <button
                  class="enter-btn"
                  style="background: ${color};"
                  ?disabled=${this.busy}
                  @click=${() => this.selectLeague(item.league.id)}
                >Entrar a la liga</button>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderCreateForm() {
    return html`
      <form @submit=${this.createLeague}>
        <h2>Crear liga</h2>
        <label for="league-name">Nombre de la liga</label>
        <input
          id="league-name"
          required
          maxlength="60"
          .value=${this.leagueName}
          @input=${(e: Event) => (this.leagueName = (e.target as HTMLInputElement).value)}
          placeholder="Ej. Mejengas Martes 7pm"
        />

        <label>Color de la liga</label>
        <div class="color-row">
          ${PRESETS.map(
            (c) => html`
              <button
                type="button"
                class="color-dot ${this.selectedColor === c ? 'selected' : ''}"
                style="background: ${c};"
                aria-label="Seleccionar color ${c}"
                aria-pressed=${this.selectedColor === c ? 'true' : 'false'}
                title="Color ${c}"
                @click=${() => (this.selectedColor = c)}
              ></button>
            `
          )}
        </div>

        <button class="submit-btn" style="background: ${this.selectedColor};" ?disabled=${this.busy} type="submit">
          Crear liga
        </button>
      </form>
    `;
  }

  private renderJoinForm() {
    return html`
      <form @submit=${this.joinLeague}>
        <h2>Unirse a una liga</h2>
        <label for="league-code">Código de la liga (6 caracteres)</label>
        <input
          id="league-code"
          required
          minlength="6"
          maxlength="6"
          .value=${this.leagueCode}
          @input=${(e: Event) => (this.leagueCode = (e.target as HTMLInputElement).value.toUpperCase())}
          placeholder="ABC234"
        />
        <button class="submit-btn" ?disabled=${this.busy} type="submit">Unirse a la liga</button>
      </form>
    `;
  }

  static styles = css`
    :host { display: block; min-height: 100vh; box-sizing: border-box; }
    * { box-sizing: border-box; }
    .chooser { min-height: 100vh; display: grid; place-items: center; padding: 1rem; }
    section {
      width: min(100%, 720px); padding: 1.4rem; border: 1px solid var(--surface-border);
      border-radius: 16px; background: var(--surface); box-shadow: 0 20px 60px rgba(2, 7, 20, 0.4);
    }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .eyebrow { margin: 0; color: #7dd3fc; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0.4rem 0 0; font-size: clamp(1.4rem, 4vw, 1.8rem); }
    h2 { margin: 0 0 0.7rem; font-size: 0.95rem; }
    .intro { margin: 0.4rem 0 0; color: var(--text-muted); font-size: 0.88rem; }
    .error { margin: 1rem 0 0; color: #fecaca; background: rgba(239, 68, 68, 0.15); padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.86rem; }
    .my-leagues { margin-top: 1.3rem; }
    .leagues-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.7rem; }
    .league-card {
      background: rgba(15, 23, 42, 0.6); border: 1px solid var(--surface-border);
      border-radius: 12px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem;
    }
    .card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .card-title { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
    .card-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.92rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .role { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 999px; }
    .role.admin { background: rgba(250, 204, 21, 0.2); color: #fde047; }
    .role.player { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
    .code { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
    .code code { color: #7dd3fc; font-weight: 700; }
    .enter-btn {
      margin-top: 0.2rem; border: none; border-radius: 8px; padding: 0.5rem;
      color: #fff; font-weight: 700; font-size: 0.86rem; cursor: pointer;
    }
    .hub-tabs { display: flex; gap: 0.6rem; margin-top: 1.3rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 0.6rem; }
    .hub-tab {
      background: transparent; border: 1px solid var(--surface-border); color: var(--text-muted);
      border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.84rem; font-weight: 700; cursor: pointer;
    }
    .hub-tab.active { color: #fff; background: rgba(255, 255, 255, 0.08); border-color: #38bdf8; }
    .forms-container { margin-top: 0.9rem; }
    form { display: grid; gap: 0.55rem; padding: 1rem; border: 1px solid var(--surface-border); border-radius: 12px; background: var(--surface-muted); }
    label { color: var(--text-muted); font-size: 0.78rem; }
    input {
      border: 1px solid var(--surface-border); border-radius: 8px; padding: 0.6rem 0.75rem;
      font: inherit; background: #0f172a; color: var(--text); font-size: 0.88rem;
    }
    .color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.2rem; }
    .color-dot {
      width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent;
      padding: 0; cursor: pointer; transition: transform 0.15s ease;
    }
    .color-dot:hover { transform: scale(1.12); }
    .color-dot.selected { border-color: #ffffff; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4); transform: scale(1.12); }
    .submit-btn {
      margin-top: 0.4rem; border: none; border-radius: 8px; padding: 0.65rem;
      background: #0ea5e9; color: #fff; font-weight: 800; font-size: 0.9rem; cursor: pointer;
    }
    button:disabled { cursor: wait; opacity: 0.65; }
    .quiet {
      background: transparent; border: 1px solid var(--surface-border); color: var(--text-muted);
      border-radius: 8px; padding: 0.4rem 0.75rem; cursor: pointer; font-weight: 700;
    }
    .logout {
      margin-top: 1.2rem; border: none; background: transparent; padding: 0;
      color: var(--text-muted); cursor: pointer; font-size: 0.82rem; text-decoration: underline;
    }
    @media (max-width: 640px) {
      section { padding: 0.9rem; }
      .leagues-grid { grid-template-columns: 1fr; }
    }
  `;
}