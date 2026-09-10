import { demoSeason, demoSnapshot } from '../data/demo';
import { buildSeasonHistory } from '../utils/calculations';
import type {
  AppSnapshot,
  EndSeasonResult,
  League,
  LeagueMembership,
  Match,
  Player,
  Season,
  SeasonHistory
} from '../types/models';

export const demoLeague: League = {
  id: 'demo-league',
  name: 'Liga demo',
  code: 'DEMO24',
  createdBy: 'demo-admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  adminUids: ['demo-admin'],
  activeSeasonId: demoSeason.id,
  themeColor: '#0ea5e9'
};

export const localLeagues: League[] = [demoLeague];
export const localMemberships: LeagueMembership[] = [
  {
    uid: 'demo-admin',
    leagueId: demoLeague.id,
    role: 'admin',
    joinCode: '',
    joinedAt: demoLeague.createdAt
  }
];
export const localSnapshots = new Map<string, AppSnapshot>([
  [snapshotKey(demoLeague.id, demoSeason.id), cloneSnapshot({ ...demoSnapshot, season: demoSeason, history: null })]
]);
export const localSeasons = new Map<string, Season[]>([[demoLeague.id, [demoSeason]]]);
export const localHistories = new Map<string, ReturnType<typeof buildSeasonHistory>>();
export const localSeasonOperations = new Map<string, EndSeasonResult>();

export function snapshotKey(leagueId: string, seasonId: string): string {
  return `${leagueId}:${seasonId}`;
}

export function getLocalSnapshot(leagueId: string, seasonId?: string): AppSnapshot | undefined {
  const league = localLeagues.find((item) => item.id === leagueId);
  if (!league) return undefined;
  return localSnapshots.get(snapshotKey(leagueId, seasonId ?? league.activeSeasonId));
}

export function setLocalSnapshot(snapshot: AppSnapshot): void {
  localSnapshots.set(snapshotKey(snapshot.season.leagueId, snapshot.season.id), snapshot);
}

export function cloneSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    players: snapshot.players.map((player) => ({ ...player })),
    matches: snapshot.matches.map((match) => ({
      ...match,
      team1PlayerIds: [...match.team1PlayerIds],
      team2PlayerIds: [...match.team2PlayerIds]
    })),
    config: { ...snapshot.config },
    season: { ...snapshot.season },
    history: snapshot.history
      ? { ...snapshot.history, finalStandings: snapshot.history.finalStandings.map((row) => ({ ...row })) }
      : null
  };
}

export function mapLeague(id: string, raw: Record<string, unknown>): League {
  return {
    id,
    name: String(raw.name ?? 'Liga'),
    code: String(raw.code ?? ''),
    createdBy: String(raw.createdBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    adminUids: Array.isArray(raw.adminUids) ? raw.adminUids.map(String) : [],
    activeSeasonId: String(raw.activeSeasonId ?? ''),
    themeColor: raw.themeColor ? String(raw.themeColor) : undefined
  };
}

export function mapSeason(id: string, raw: Record<string, unknown>): Season {
  const status = raw.status === 'ended' || raw.status === 'ending' ? raw.status : 'active';
  return {
    id,
    leagueId: String(raw.leagueId ?? ''),
    name: String(raw.name ?? 'Temporada'),
    startedAt: String(raw.startedAt ?? ''),
    endedAt: raw.endedAt ? String(raw.endedAt) : null,
    status,
    matchCount: Number(raw.matchCount ?? 0)
  };
}

export function makeLocalHistory(
  season: Season,
  players: Player[],
  matches: Match[],
  endedAt: string
) {
  return buildSeasonHistory(season, players, matches, endedAt);
}

export function mapHistory(id: string, raw: Record<string, unknown>): SeasonHistory {
  return {
    seasonId: String(raw.seasonId ?? id),
    leagueId: String(raw.leagueId ?? ''),
    name: String(raw.name ?? 'Temporada'),
    startedAt: String(raw.startedAt ?? ''),
    endedAt: String(raw.endedAt ?? ''),
    matchCount: Number(raw.matchCount ?? 0),
    playerCount: Number(raw.playerCount ?? 0),
    totalAttendance: Number(raw.totalAttendance ?? 0),
    finalStandings: Array.isArray(raw.finalStandings) ? raw.finalStandings as SeasonHistory['finalStandings'] : []
  };
}

export function mapMembership(id: string, raw: Record<string, unknown>): LeagueMembership {
  return {
    uid: String(raw.uid ?? id.split('_')[0]),
    leagueId: String(raw.leagueId ?? ''),
    role: raw.role === 'admin' ? 'admin' : 'player',
    joinCode: String(raw.joinCode ?? ''),
    joinedAt: String(raw.joinedAt ?? '')
  };
}

export function mapPlayers(raw: unknown[]): Player[] {
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      nombre: String(row.nombre ?? ''),
      activo: Boolean(row.activo ?? true),
      email: row.email ? String(row.email).toLowerCase().trim() : null
    };
  });
}

export function mapMatches(raw: unknown[]): Match[] {
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      nombre: String(row.nombre ?? 'Mejenga'),
      fechaISO: String(row.fechaISO ?? ''),
      team1PlayerIds: Array.isArray(row.team1PlayerIds) ? row.team1PlayerIds.map(String) : [],
      team2PlayerIds: Array.isArray(row.team2PlayerIds) ? row.team2PlayerIds.map(String) : [],
      resultado: (row.resultado as Match['resultado']) ?? 'draw',
      mvpPlayerId: row.mvpPlayerId ? String(row.mvpPlayerId) : null,
      asistencia: Number(row.asistencia ?? 0)
    };
  });
}