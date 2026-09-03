import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStore } from '../store/app-store';
import { buildStandings } from '../utils/calculations';
import {
  normalizePlayerName,
  validateLeagueCode,
  validateLeagueName,
  validateMatchInput,
  validatePlayerName
} from '../utils/validators';
import { normalizeLeagueCode } from '../utils/league-code';
import type { CreateMatchInput, UpdateMatchInput } from '../types/actions';
import type { AppSnapshot, Season, UserLeague } from '../types/models';
import type { AppTab } from '../components/tab-nav';
import '../components/app-header';
import '../components/admin-panel';
import '../components/tab-nav';
import '../components/standings-section';
import '../components/h2h-section';
import '../components/evolution-section';
import '../components/curios-section';
import '../components/matches-section';
import '../components/auth-gate';
import '../components/league-chooser';
import '../components/league-switcher';
import '../components/season-switcher';
import '../components/season-history';

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
  @state() private memberships: UserLeague[] = [];
  @state() private currentLeagueId: string | null = null;
  @state() private seasons: Season[] = [];
  @state() private showLeagueChooser = false;

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
    this.isAdmin = state.isLeagueAdmin;
    this.memberships = state.memberships;
    this.currentLeagueId = state.currentLeagueId;
    this.seasons = state.seasons;
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

  private async onSignIn(): Promise<void> {
    await appStore.login();
  }

  private async onLogout(): Promise<void> {
    this.showLeagueChooser = false;
    await appStore.logout();
  }

  private async onCreateLeague(event: CustomEvent<{ name: string }>): Promise<void> {
    const name = event.detail.name.trim().replace(/\s+/g, ' ');
    const validationError = validateLeagueName(name);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.createLeague(name);
    if (appStore.getState().currentLeagueId) this.showLeagueChooser = false;
  }

  private async onJoinLeague(event: CustomEvent<{ code: string }>): Promise<void> {
    const code = normalizeLeagueCode(event.detail.code);
    const validationError = validateLeagueCode(code);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.joinLeague(code);
    if (appStore.getState().currentLeagueId) this.showLeagueChooser = false;
  }

  private async onLeagueChange(event: CustomEvent<{ leagueId: string }>): Promise<void> {
    await appStore.switchLeague(event.detail.leagueId);
  }

  private async onSeasonChange(event: CustomEvent<{ seasonId: string }>): Promise<void> {
    await appStore.switchSeason(event.detail.seasonId);
  }

  private async onEndSeason(event: CustomEvent<{ name: string }>): Promise<void> {
    await appStore.endCurrentSeason(event.detail.name);
  }

  private openLeagueChooser(): void {
    this.showLeagueChooser = true;
  }

  private closeLeagueChooser(): void {
    this.showLeagueChooser = false;
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

  private async onUpdatePlayer(event: CustomEvent<{ playerId: string; nombre: string }>): Promise<void> {
    if (!this.isAdmin) return;
    const nombre = normalizePlayerName(event.detail.nombre);
    const validationError = validatePlayerName(nombre);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.renamePlayer(event.detail.playerId, nombre);
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

  private async onUpdateMatch(event: CustomEvent<UpdateMatchInput>): Promise<void> {
    if (!this.isAdmin) return;
    const validationError = validateMatchInput(event.detail);
    if (validationError) {
      this.error = validationError;
      return;
    }
    await appStore.editMatch(event.detail);
  }

  render() {
    if (this.loading) return html`<main><p>Cargando datos...</p></main>`;
    if (!this.sessionEmail) {
      return html`<auth-gate .busy=${this.loading} .error=${this.error ?? ''} @sign-in=${this.onSignIn}></auth-gate>`;
    }
    if (this.memberships.length === 0) {
      return html`
        <league-chooser
          .busy=${this.mutating}
          .error=${this.error ?? ''}
          @create-league=${this.onCreateLeague}
          @join-league=${this.onJoinLeague}
          @logout=${this.onLogout}
        ></league-chooser>
      `;
    }
    if (this.showLeagueChooser) {
      return html`
        <league-chooser
          .busy=${this.mutating}
          .canClose=${true}
          .error=${this.error ?? ''}
          @create-league=${this.onCreateLeague}
          @join-league=${this.onJoinLeague}
          @close-chooser=${this.closeLeagueChooser}
          @logout=${this.onLogout}
        ></league-chooser>
      `;
    }
    if (!this.snapshot) return html`<main><p>Sin datos</p></main>`;

    const standings = buildStandings(this.snapshot.players, this.snapshot.matches);
    const leader = standings[0];

    return html`
      <main>
        <app-header
          .seasonLabel=${this.snapshot.season.name}
          .leaderLabel=${leader ? `Lider: ${leader.nombre} (${leader.puntos} pts)` : 'Sin lider'}
          .adminMode=${this.isAdmin}
          .userEmail=${this.sessionEmail}
          @toggle-admin=${this.onAdminToggle}
          @logout=${this.onLogout}
        >
          <league-switcher
            slot="league-switcher"
            .leagues=${this.memberships}
            .currentLeagueId=${this.currentLeagueId ?? ''}
            .disabled=${this.loading || this.mutating}
            @league-change=${this.onLeagueChange}
            @open-chooser=${this.openLeagueChooser}
          ></league-switcher>
          <season-switcher
            slot="season-switcher"
            .seasons=${this.seasons}
            .currentSeasonId=${this.snapshot.season.id}
            .disabled=${this.loading || this.mutating}
            @season-change=${this.onSeasonChange}
          ></season-switcher>
        </app-header>

        ${this.renderAdminStatus()}
        ${this.error ? html`<p class="error">${this.error}</p>` : null}

        ${this.isAdmin && this.showAdminPanel && this.snapshot.season.status === 'active'
          ? html`
              <admin-panel
                .players=${this.snapshot.players}
                .matchList=${this.snapshot.matches}
                .season=${this.snapshot.season}
                .wrappedEnabled=${this.snapshot.config.wrappedEnabled}
                .mutating=${this.mutating}
                @logout-admin=${this.onLogoutAdmin}
                @create-player=${this.onCreatePlayer}
                @delete-player=${this.onDeletePlayer}
                @update-player=${this.onUpdatePlayer}
                @create-match=${this.onCreateMatch}
                @update-match=${this.onUpdateMatch}
                @delete-match=${this.onDeleteMatch}
                @toggle-wrapped=${this.onToggleWrapped}
                @end-season=${this.onEndSeason}
              ></admin-panel>
            `
          : null}

        ${this.snapshot.history
          ? html`<season-history .history=${this.snapshot.history}></season-history>`
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
