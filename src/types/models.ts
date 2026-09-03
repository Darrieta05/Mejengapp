export type MatchResult = 'team1' | 'team2' | 'draw';

export type LeagueMemberRole = 'admin' | 'member';

export interface League {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: string;
  adminUids: string[];
  activeSeasonId: string;
}

export type SeasonStatus = 'active' | 'ending' | 'ended';

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  status: SeasonStatus;
  matchCount: number;
}

export interface SeasonHistory {
  seasonId: string;
  leagueId: string;
  name: string;
  startedAt: string;
  endedAt: string;
  matchCount: number;
  playerCount: number;
  totalAttendance: number;
  finalStandings: StandingRow[];
}

export interface EndSeasonResult {
  newSeason: Season;
  history: SeasonHistory;
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
  seasonLabel?: string;
}

export interface AppSnapshot {
  players: Player[];
  matches: Match[];
  config: AppConfig;
  season: Season;
  history: SeasonHistory | null;
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
