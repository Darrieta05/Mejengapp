import { signInAdmin, signOutAdmin, subscribeAuthChanges } from '../services/auth';
import {
  createMatch,
  createPlayer,
  deleteMatch,
  deletePlayer,
  getSnapshot,
  setWrappedEnabled
} from '../services/repository';
import type { CreateMatchInput } from '../types/actions';
import type { AdminSession } from '../types/auth';
import type { AppSnapshot } from '../types/models';

export interface AppStoreState {
  loading: boolean;
  error: string | null;
  snapshot: AppSnapshot | null;
  session: AdminSession | null;
  mutating: boolean;
}

class AppStore extends EventTarget {
  private authUnsubscribe: (() => void) | null = null;

  private state: AppStoreState = {
    loading: true,
    error: null,
    snapshot: null,
    session: null,
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
        this.patch({ session });
      });
    }

    this.patch({ loading: true, error: null });
    try {
      const snapshot = await getSnapshot();
      this.patch({ loading: false, snapshot });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'No se pudo cargar la data.'
      });
    }
  }

  async login(): Promise<void> {
    this.patch({ error: null });
    try {
      const session = await signInAdmin();
      this.patch({ session });
    } catch (error) {
      this.patch({ error: error instanceof Error ? error.message : 'No se pudo iniciar sesion.' });
    }
  }

  async logout(): Promise<void> {
    this.patch({ error: null });
    try {
      await signOutAdmin();
      this.patch({ session: null });
    } catch (error) {
      this.patch({ error: error instanceof Error ? error.message : 'No se pudo cerrar sesion.' });
    }
  }

  async addPlayer(nombre: string): Promise<void> {
    await this.runMutation(async () => {
      await createPlayer({ nombre });
    });
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.runMutation(async () => {
      await deletePlayer(playerId);
    });
  }

  async addMatch(input: CreateMatchInput): Promise<void> {
    await this.runMutation(async () => {
      await createMatch(input);
    });
  }

  async removeMatch(matchId: string): Promise<void> {
    await this.runMutation(async () => {
      await deleteMatch(matchId);
    });
  }

  async updateWrapped(enabled: boolean): Promise<void> {
    await this.runMutation(async () => {
      await setWrappedEnabled(enabled);
    });
  }

  private async runMutation(action: () => Promise<void>): Promise<void> {
    this.patch({ mutating: true, error: null });
    try {
      await action();
      const snapshot = await getSnapshot();
      this.patch({ snapshot, mutating: false });
    } catch (error) {
      this.patch({
        mutating: false,
        error: error instanceof Error ? error.message : 'No se pudo guardar el cambio.'
      });
    }
  }

  private patch(update: Partial<AppStoreState>): void {
    this.state = { ...this.state, ...update };
    this.dispatchEvent(new Event('change'));
  }
}

export const appStore = new AppStore();
