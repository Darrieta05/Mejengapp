import { demoSnapshot } from '../data/demo';
import type { AppSnapshot, League, LeagueMembership, Match, Player } from '../types/models';

export const demoLeague: League = {
  id: 'demo-league',
  name: 'Liga demo',
  code: 'DEMO24',
  createdBy: 'demo-admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  adminUids: ['demo-admin']
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
  [demoLeague.id, cloneSnapshot(demoSnapshot)]
]);

export function cloneSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    players: snapshot.players.map((player) => ({ ...player })),
    matches: snapshot.matches.map((match) => ({
      ...match,
      team1PlayerIds: [...match.team1PlayerIds],
      team2PlayerIds: [...match.team2PlayerIds]
    })),
    config: { ...snapshot.config }
  };
}

export function mapLeague(id: string, raw: Record<string, unknown>): League {
  return {
    id,
    name: String(raw.name ?? 'Liga'),
    code: String(raw.code ?? ''),
    createdBy: String(raw.createdBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    adminUids: Array.isArray(raw.adminUids) ? raw.adminUids.map(String) : []
  };
}

export function mapMembership(id: string, raw: Record<string, unknown>): LeagueMembership {
  return {
    uid: String(raw.uid ?? id.split('_')[0]),
    leagueId: String(raw.leagueId ?? ''),
    role: raw.role === 'admin' ? 'admin' : 'member',
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
      activo: Boolean(row.activo ?? true)
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