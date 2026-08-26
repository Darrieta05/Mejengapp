import type { MatchResult } from './models';

export interface CreatePlayerInput {
  nombre: string;
}

export interface CreateMatchInput {
  nombre: string;
  fechaISO: string;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  resultado: MatchResult;
  mvpPlayerId: string | null;
}

export interface UpdateMatchInput extends CreateMatchInput {
  id: string;
}
