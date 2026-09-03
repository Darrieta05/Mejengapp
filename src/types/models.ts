export type MatchResult = 'team1' | 'team2' | 'draw';

export type LeagueMemberRole = 'admin' | 'member';

export interface League {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: string;
  adminUids: string[];
}

export interface LeagueMembership {
  uid: string;
  leagueId: string;
  role: LeagueMemberRole;
  joinCode: string;
  joinedAt: string;
}

export interface UserLeague {
  league: League;
  membership: LeagueMembership;
}

export interface CreateLeagueInput {
  name: string;
}

export interface JoinLeagueInput {
  code: string;
}

export interface Player {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Match {
  id: string;
  nombre: string;
  fechaISO: string;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  resultado: MatchResult;
  mvpPlayerId: string | null;
  asistencia: number;
}

export interface AppConfig {
  wrappedEnabled: boolean;
  seasonLabel: string;
}

export interface AppSnapshot {
  players: Player[];
  matches: Match[];
  config: AppConfig;
}

export interface StandingRow {
  playerId: string;
  nombre: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  puntos: number;
  efectividad: number;
  mvp: number;
}

export interface H2HStats {
  together: { pj: number; g: number; e: number; p: number };
  versus: { pj: number; p1Wins: number; draws: number; p2Wins: number };
}
