import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStore } from '../store/app-store';
import { buildStandings } from '../utils/calculations';
import { normalizePlayerName, validateMatchInput, validatePlayerName } from '../utils/validators';
import type { CreateMatchInput } from '../types/actions';
import type { AppSnapshot } from '../types/models';
import type { AppTab } from '../components/tab-nav';
import '../components/app-header';
import '../components/admin-panel';
import '../components/tab-nav';
import '../components/standings-section';
import '../components/h2h-section';
import '../components/evolution-section';
import '../components/curios-section';
import '../components/matches-section';

@customElement('mejenga-app')
export class MejengaApp extends LitElement {
  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private snapshot: AppSnapshot | null = null;
  @state() private currentTab: AppTab = 'tabla';
  @state() private showAdminPanel = false;
  @state() private sessionEmail: string | null = null;
  @state() private isAdmin = false;
  @state() private mutating = false;

  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = appStore.subscribe(() => this.syncState());
    appStore.load();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private syncState(): void {
    const state = appStore.getState();
    this.loading = state.loading;
    this.error = state.error;
    this.snapshot = state.snapshot;
    this.sessionEmail = state.session?.email ?? null;
    this.isAdmin = Boolean(state.session?.isAdmin);
    this.mutating = state.mutating;

    if (!this.isAdmin) {
      this.showAdminPanel = false;
    }
  }

  private onTabChange(event: CustomEvent<{ tab: AppTab }>): void {
    this.currentTab = event.detail.tab;
  }

  private async onAdminToggle(): Promise<void> {
    if (!this.sessionEmail) {
      await appStore.login();
      return;
    }

    if (!this.isAdmin) {
      this.error = 'Tu cuenta no tiene permisos de administrador.';
      return;
    }

    this.showAdminPanel = !this.showAdminPanel;
  }

  private async onLogoutAdmin(): Promise<void> {
    await appStore.logout();
  }

  private async onCreatePlayer(event: CustomEvent<{ nombre: string }>): Promise<void> {
    if (!this.isAdmin) return;
    const nombre = normalizePlayerName(event.detail.nombre);
    const validationError = validatePlayerName(nombre);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.addPlayer(nombre);
  }

  private async onDeletePlayer(event: CustomEvent<{ playerId: string }>): Promise<void> {
    if (!this.isAdmin) return;
    await appStore.removePlayer(event.detail.playerId);
  }

  private async onCreateMatch(event: CustomEvent<CreateMatchInput>): Promise<void> {
    if (!this.isAdmin) return;
    const validationError = validateMatchInput(event.detail);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.addMatch(event.detail);
  }

  private async onToggleWrapped(event: CustomEvent<{ enabled: boolean }>): Promise<void> {
    if (!this.isAdmin) return;
    await appStore.updateWrapped(event.detail.enabled);
  }

  private async onDeleteMatch(event: CustomEvent<{ matchId: string }>): Promise<void> {
    if (!this.isAdmin) return;
    await appStore.removeMatch(event.detail.matchId);
  }

  render() {
    if (this.loading) return html`<main><p>Cargando datos...</p></main>`;
    if (this.error) return html`<main><p class="error">${this.error}</p></main>`;
    if (!this.snapshot) return html`<main><p>Sin datos</p></main>`;

    const standings = buildStandings(this.snapshot.players, this.snapshot.matches);
    const leader = standings[0];

    return html`
      <main>
        <app-header
          .seasonLabel=${this.snapshot.config.seasonLabel}
          .leaderLabel=${leader ? `Lider: ${leader.nombre} (${leader.puntos} pts)` : 'Sin lider'}
          .adminMode=${this.isAdmin}
          @toggle-admin=${this.onAdminToggle}
        ></app-header>

        ${this.renderAdminStatus()}

        ${this.isAdmin && this.showAdminPanel
          ? html`
              <admin-panel
                .players=${this.snapshot.players}
                .wrappedEnabled=${this.snapshot.config.wrappedEnabled}
                .mutating=${this.mutating}
                @logout-admin=${this.onLogoutAdmin}
                @create-player=${this.onCreatePlayer}
                @delete-player=${this.onDeletePlayer}
                @create-match=${this.onCreateMatch}
                @toggle-wrapped=${this.onToggleWrapped}
              ></admin-panel>
            `
          : null}

        <tab-nav .current=${this.currentTab} @tab-change=${this.onTabChange}></tab-nav>

        ${this.renderActiveSection()}
      </main>
    `;
  }

  private renderActiveSection() {
    const snapshot = this.snapshot;
    if (!snapshot) return html``;

    if (this.currentTab === 'tabla') {
      return html`<standings-section .players=${snapshot.players} .matchList=${snapshot.matches}></standings-section>`;
    }
    if (this.currentTab === 'h2h') {
      return html`<h2h-section .players=${snapshot.players} .matchList=${snapshot.matches}></h2h-section>`;
    }
    if (this.currentTab === 'evolucion') {
      return html`<evolution-section .players=${snapshot.players} .matchList=${snapshot.matches}></evolution-section>`;
    }
    if (this.currentTab === 'curiosos') {
      return html`<curios-section .players=${snapshot.players} .matchList=${snapshot.matches}></curios-section>`;
    }
    return html`
      <matches-section
        .players=${snapshot.players}
        .matchList=${snapshot.matches}
        .adminMode=${this.isAdmin}
        @delete-match=${this.onDeleteMatch}
      ></matches-section>
    `;
  }

  private renderAdminStatus() {
    if (!this.sessionEmail) {
      return html`<p class="status">Admin: no autenticado. Presiona "Admin" para iniciar sesion.</p>`;
    }
    if (!this.isAdmin) {
      return html`<p class="status warning">Autenticado como ${this.sessionEmail}, pero sin rol admin.</p>`;
    }
    return html`<p class="status ok">Admin autenticado: ${this.sessionEmail}</p>`;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      color: var(--text);
    }

    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
    }

    .status {
      font-size: 0.82rem;
      color: var(--text-muted);
      padding: 0.55rem 0.75rem;
      border: 1px dashed var(--surface-border);
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.35);
    }

    .status.ok {
      color: #86efac;
      border-color: rgba(134, 239, 172, 0.45);
    }

    .status.warning {
      color: #facc15;
      border-color: rgba(250, 204, 21, 0.45);
    }

    .error {
      color: #fecaca;
      background: rgba(127, 29, 29, 0.35);
      border: 1px solid rgba(248, 113, 113, 0.5);
      border-radius: 10px;
      padding: 0.8rem;
    }
  `;
}
