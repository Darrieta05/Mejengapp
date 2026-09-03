import type { AppSnapshot } from '../types/models';

export const demoSeason = {
  id: 'demo-season-1',
  leagueId: 'demo-league',
  name: 'Temporada 2026',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: null,
  status: 'active' as const,
  matchCount: 3
};

export const demoSnapshot: AppSnapshot = {
  players: [
    { id: 'p1', nombre: 'Kevin', activo: true },
    { id: 'p2', nombre: 'Juan', activo: true },
    { id: 'p3', nombre: 'Manuel', activo: true },
    { id: 'p4', nombre: 'Andres', activo: true },
    { id: 'p5', nombre: 'David', activo: true },
    { id: 'p6', nombre: 'Ronaldo', activo: true }
  ],
  matches: [
    {
      id: 'm1',
      nombre: 'Apertura',
      fechaISO: '2026-08-04',
      team1PlayerIds: ['p1', 'p2', 'p3'],
      team2PlayerIds: ['p4', 'p5', 'p6'],
      resultado: 'team1',
      mvpPlayerId: 'p1',
      asistencia: 6
    },
    {
      id: 'm2',
      nombre: 'Jornada 2',
      fechaISO: '2026-08-11',
      team1PlayerIds: ['p1', 'p4', 'p6'],
      team2PlayerIds: ['p2', 'p3', 'p5'],
      resultado: 'draw',
      mvpPlayerId: 'p5',
      asistencia: 6
    },
    {
      id: 'm3',
      nombre: 'Jornada 3',
      fechaISO: '2026-08-18',
      team1PlayerIds: ['p1', 'p3', 'p5'],
      team2PlayerIds: ['p2', 'p4', 'p6'],
      resultado: 'team2',
      mvpPlayerId: 'p6',
      asistencia: 6
    }
  ],
  config: {
    wrappedEnabled: false
  },
  season: demoSeason,
  history: null
};
