import { signInWithGoogle, signOutAdmin, subscribeAuthChanges } from '../services/auth';
import {
  createLeague as createLeagueRecord,
  createMatch,
  createPlayer,
  deleteMatch,
  deletePlayer,
  getUserLeagues,
  getSnapshot,
  joinLeagueByCode,
  updateMatch,
  updatePlayerName,
  setWrappedEnabled
} from '../services/repository';
import type { CreateMatchInput, UpdateMatchInput } from '../types/actions';
import type { AdminSession } from '../types/auth';
import type { AppSnapshot, UserLeague } from '../types/models';

export interface AppStoreState {
  loading: boolean;
  error: string | null;
  snapshot: AppSnapshot | null;
  session: AdminSession | null;
  memberships: UserLeague[];
  currentLeagueId: string | null;
  isLeagueAdmin: boolean;
  mutating: boolean;
}

class AppStore extends EventTarget {
  private authUnsubscribe: (() => void) | null = null;
  private sessionRequestId = 0;

  private state: AppStoreState = {
    loading: true,
    error: null,
    snapshot: null,
    session: null,
    memberships: [],
    currentLeagueId: null,
    isLeagueAdmin: false,
    mutating: false
  };

  getState(): AppStoreState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.addEventListener('change', listener);
    return () => this.removeEventListener('change', listener);
  }

  async load(): Promise<void> {
    if (!this.authUnsubscribe) {
      this.authUnsubscribe = subscribeAuthChanges(({ session }) => {
        void this.applySession(session);
      });
    }

    this.patch({ loading: true, error: null });
  }

  async login(): Promise<void> {
    this.patch({ error: null, loading: true });
    try {
      const session = await signInWithGoogle();
      await this.applySession(session);
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo iniciar sesion.'
      });
    }
  }

  async logout(): Promise<void> {
    this.patch({ error: null, mutating: true });
    try {
      await signOutAdmin();
      await this.applySession(null);
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo cerrar sesion.'
      });
    }
  }

  async createLeague(name: string): Promise<void> {
    const uid = this.state.session?.uid;
    if (!uid) return this.patch({ error: 'Debes iniciar sesion para crear una liga.' });
    await this.runLeagueSetup(() => createLeagueRecord(name, uid));
  }

  async joinLeague(code: string): Promise<void> {
    const uid = this.state.session?.uid;
    if (!uid) return this.patch({ error: 'Debes iniciar sesion para unirte a una liga.' });
    await this.runLeagueSetup(() => joinLeagueByCode(code, uid));
  }

  async switchLeague(leagueId: string): Promise<void> {
    const selected = this.state.memberships.find((item) => item.league.id === leagueId);
    if (!selected) {
      this.patch({ error: 'No perteneces a esa liga.' });
      return;
    }
    await this.activateLeague(leagueId, this.state.memberships);
  }

  async addPlayer(nombre: string): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await createPlayer(leagueId, { nombre });
    });
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await deletePlayer(leagueId, playerId);
    });
  }

  async renamePlayer(playerId: string, nombre: string): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await updatePlayerName(leagueId, playerId, nombre);
    });
  }

  async addMatch(input: CreateMatchInput): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await createMatch(leagueId, input);
    });
  }

  async removeMatch(matchId: string): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await deleteMatch(leagueId, matchId);
    });
  }

  async editMatch(input: UpdateMatchInput): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await updateMatch(leagueId, input);
    });
  }

  async updateWrapped(enabled: boolean): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await setWrappedEnabled(leagueId, enabled);
    });
  }

  private async runMutation(action: (leagueId: string) => Promise<void>): Promise<void> {
    const leagueId = this.state.currentLeagueId;
    if (!leagueId) {
      this.patch({ error: 'Selecciona una liga para continuar.' });
      return;
    }
    this.patch({ mutating: true, error: null });
    try {
      await action(leagueId);
      const snapshot = await getSnapshot(leagueId);
      this.patch({ snapshot, mutating: false });
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo guardar el cambio.'
      });
    }
  }

  private async applySession(session: AdminSession | null): Promise<void> {
    const requestId = ++this.sessionRequestId;
    if (!session) {
      localStorage.removeItem('mejenga:currentLeagueId');
      this.patch({
        session: null,
        memberships: [],
        currentLeagueId: null,
        isLeagueAdmin: false,
        snapshot: null,
        loading: false,
        mutating: false
      });
      return;
    }

    this.patch({
      session,
      memberships: [],
      currentLeagueId: null,
      isLeagueAdmin: false,
      snapshot: null,
      loading: true,
      error: null
    });
    try {
      const memberships = await getUserLeagues(session.uid);
      if (requestId !== this.sessionRequestId) return;
      const savedLeagueId = localStorage.getItem('mejenga:currentLeagueId');
      const selected =
        memberships.find((item) => item.league.id === savedLeagueId) ?? memberships[0];
      if (!selected) {
        localStorage.removeItem('mejenga:currentLeagueId');
        this.patch({ memberships, loading: false });
        return;
      }

      const snapshot = await getSnapshot(selected.league.id);
      if (requestId !== this.sessionRequestId) return;
      localStorage.setItem('mejenga:currentLeagueId', selected.league.id);
      this.patch({
        memberships,
        currentLeagueId: selected.league.id,
        isLeagueAdmin: session.isAdmin || selected.membership.role === 'admin',
        snapshot,
        loading: false
      });
    } catch (error) {
      if (requestId !== this.sessionRequestId) return;
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar las ligas.'
      });
    }
  }

  private async runLeagueSetup(action: () => Promise<UserLeague>): Promise<void> {
    this.patch({ mutating: true, error: null });
    try {
      const userLeague = await action();
      const memberships = [
        ...this.state.memberships.filter((item) => item.league.id !== userLeague.league.id),
        userLeague
      ];
      await this.activateLeague(userLeague.league.id, memberships);
      this.patch({ mutating: false });
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo configurar la liga.'
      });
    }
  }

  private async activateLeague(leagueId: string, memberships: UserLeague[]): Promise<void> {
    const selected = memberships.find((item) => item.league.id === leagueId);
    if (!selected) return;
    const isLeagueAdmin =
      Boolean(this.state.session?.isAdmin) || selected.membership.role === 'admin';
    this.patch({
      loading: true,
      error: null,
      snapshot: null,
      memberships,
      currentLeagueId: leagueId,
      isLeagueAdmin
    });
    try {
      const snapshot = await getSnapshot(leagueId);
      localStorage.setItem('mejenga:currentLeagueId', leagueId);
      this.patch({ snapshot, loading: false });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar la liga.'
      });
    }
  }

  private patch(update: Partial<AppStoreState>): void {
    this.state = { ...this.state, ...update };
    this.dispatchEvent(new Event('change'));
  }
}

export const appStore = new AppStore();
