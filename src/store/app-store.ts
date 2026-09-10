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
  endSeason as endSeasonRecord,
  getSeasons,
  updateMatch,
  updatePlayer,
  setWrappedEnabled,
  updateLeagueColor
} from '../services/repository';
import type { CreateMatchInput, UpdateMatchInput } from '../types/actions';
import type { AdminSession } from '../types/auth';
import type { AppSnapshot, Season, UserLeague } from '../types/models';

export interface AppStoreState {
  loading: boolean;
  error: string | null;
  snapshot: AppSnapshot | null;
  session: AdminSession | null;
  memberships: UserLeague[];
  currentLeagueId: string | null;
  seasons: Season[];
  currentSeasonId: string | null;
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
    seasons: [],
    currentSeasonId: null,
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

  async createLeague(name: string, themeColor?: string): Promise<void> {
    const uid = this.state.session?.uid;
    if (!uid) return this.patch({ error: 'Debes iniciar sesion para crear una liga.' });
    await this.runLeagueSetup(() => createLeagueRecord(name, uid, themeColor));
  }

  async updateLeagueColor(themeColor: string): Promise<void> {
    const leagueId = this.state.currentLeagueId;
    if (!leagueId) return;
    this.patch({ mutating: true, error: null });
    try {
      await updateLeagueColor(leagueId, themeColor);
      const memberships = this.state.memberships.map((m) =>
        m.league.id === leagueId
          ? { ...m, league: { ...m.league, themeColor } }
          : m
      );
      this.patch({ memberships, mutating: false });
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo actualizar el color.'
      });
    }
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

  async switchSeason(seasonId: string): Promise<void> {
    const leagueId = this.state.currentLeagueId;
    if (!leagueId || !this.state.seasons.some((season) => season.id === seasonId)) {
      this.patch({ error: 'La temporada no esta disponible.' });
      return;
    }
    await this.activateSeason(leagueId, seasonId, this.state.memberships, this.state.seasons);
  }

  async endCurrentSeason(newSeasonName: string): Promise<void> {
    const leagueId = this.state.currentLeagueId;
    const uid = this.state.session?.uid;
    if (!leagueId || !uid || !this.state.snapshot || this.state.snapshot.season.status !== 'active') {
      this.patch({ error: 'No hay una temporada activa para cerrar.' });
      return;
    }
    this.patch({ mutating: true, error: null });
    try {
      await endSeasonRecord(leagueId, newSeasonName, crypto.randomUUID());
      const [memberships, seasons] = await Promise.all([getUserLeagues(uid), getSeasons(leagueId)]);
      const snapshot = await getSnapshot(leagueId);
      this.patch({
        memberships,
        seasons,
        currentSeasonId: snapshot.season.id,
        snapshot,
        currentLeagueId: leagueId,
        mutating: false
      });
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo cerrar la temporada.'
      });
    }
  }

  async addPlayer(nombre: string, email?: string | null): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await createPlayer(leagueId, { nombre, email });
    });
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await deletePlayer(leagueId, playerId);
    });
  }

  async updatePlayer(playerId: string, nombre: string, email?: string | null): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await updatePlayer(leagueId, playerId, { nombre, email });
    });
  }

  async renamePlayer(playerId: string, nombre: string): Promise<void> {
    await this.updatePlayer(playerId, nombre);
  }

  async addMatch(input: CreateMatchInput): Promise<void> {
    await this.runMutation(async (leagueId, seasonId) => {
      await createMatch(leagueId, seasonId, input);
    });
  }

  async removeMatch(matchId: string): Promise<void> {
    await this.runMutation(async (leagueId, seasonId) => {
      await deleteMatch(leagueId, seasonId, matchId);
    });
  }

  async editMatch(input: UpdateMatchInput): Promise<void> {
    await this.runMutation(async (leagueId, seasonId) => {
      await updateMatch(leagueId, seasonId, input);
    });
  }

  async updateWrapped(enabled: boolean): Promise<void> {
    await this.runMutation(async (leagueId) => {
      await setWrappedEnabled(leagueId, enabled);
    });
  }

  private async runMutation(action: (leagueId: string, seasonId: string) => Promise<void>): Promise<void> {
    const leagueId = this.state.currentLeagueId;
    if (!leagueId) {
      this.patch({ error: 'Selecciona una liga para continuar.' });
      return;
    }
    this.patch({ mutating: true, error: null });
    try {
      const seasonId = this.state.snapshot?.season.id;
      if (!seasonId) {
        this.patch({ mutating: false, error: 'No hay una temporada activa.' });
        return;
      }
      await action(leagueId, seasonId);
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
        seasons: [],
        currentSeasonId: null,
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
      seasons: [],
      currentSeasonId: null,
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

      const seasons = await getSeasons(selected.league.id);
      const snapshot = await getSnapshot(selected.league.id);
      if (requestId !== this.sessionRequestId) return;
      localStorage.setItem('mejenga:currentLeagueId', selected.league.id);
      this.patch({
        memberships,
        currentLeagueId: selected.league.id,
        seasons,
        currentSeasonId: snapshot.season.id,
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
      const seasons = await getSeasons(leagueId);
      const snapshot = await getSnapshot(leagueId);
      localStorage.setItem('mejenga:currentLeagueId', leagueId);
      this.patch({ snapshot, seasons, currentSeasonId: snapshot.season.id, loading: false });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar la liga.'
      });
    }
  }

  private async activateSeason(
    leagueId: string,
    seasonId: string,
    memberships: UserLeague[],
    seasons: Season[]
  ): Promise<void> {
    this.patch({ loading: true, error: null, snapshot: null, memberships, seasons, currentSeasonId: seasonId });
    try {
      const snapshot = await getSnapshot(leagueId, seasonId);
      this.patch({ snapshot, loading: false });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar la temporada.'
      });
    }
  }

  private patch(update: Partial<AppStoreState>): void {
    this.state = { ...this.state, ...update };
    this.dispatchEvent(new Event('change'));
  }
}

export const appStore = new AppStore();
