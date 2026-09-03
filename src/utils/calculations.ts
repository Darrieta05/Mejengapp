import type { H2HStats, Match, Player, Season, SeasonHistory, StandingRow } from '../types/models';

export function byDateAsc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.fechaISO.localeCompare(b.fechaISO));
}

export function byDateDesc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => b.fechaISO.localeCompare(a.fechaISO));
}

export function buildStandings(players: Player[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const player of players) {
    rows.set(player.id, {
      playerId: player.id,
      nombre: player.nombre,
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      puntos: 0,
      efectividad: 0,
      mvp: 0
    });
  }

  for (const match of matches) {
    for (const playerId of match.team1PlayerIds) {
      updateFromResult(rows.get(playerId), match.resultado, true);
    }
    for (const playerId of match.team2PlayerIds) {
      updateFromResult(rows.get(playerId), match.resultado, false);
    }
    if (match.mvpPlayerId && rows.has(match.mvpPlayerId)) {
      rows.get(match.mvpPlayerId)!.mvp += 1;
    }
  }

  const list = [...rows.values()];
  for (const row of list) {
    row.efectividad = row.pj > 0 ? Math.round(((row.g * 3 + row.e) / (row.pj * 3)) * 100) : 0;
  }

  list.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.g !== a.g) return b.g - a.g;
    if (a.pj !== b.pj) return a.pj - b.pj;
    return a.nombre.localeCompare(b.nombre);
  });

  return list;
}

export function buildSeasonHistory(
  season: Season,
  players: Player[],
  matches: Match[],
  endedAt: string
): SeasonHistory {
  return {
    seasonId: season.id,
    leagueId: season.leagueId,
    name: season.name,
    startedAt: season.startedAt,
    endedAt,
    matchCount: matches.length,
    playerCount: players.length,
    totalAttendance: matches.reduce((total, match) => total + match.asistencia, 0),
    finalStandings: buildStandings(players, matches)
  };
}

export function calculateH2H(player1Id: string, player2Id: string, matches: Match[]): H2HStats {
  const stats: H2HStats = {
    together: { pj: 0, g: 0, e: 0, p: 0 },
    versus: { pj: 0, p1Wins: 0, draws: 0, p2Wins: 0 }
  };

  for (const m of matches) {
    const p1Eq1 = m.team1PlayerIds.includes(player1Id);
    const p1Eq2 = m.team2PlayerIds.includes(player1Id);
    const p2Eq1 = m.team1PlayerIds.includes(player2Id);
    const p2Eq2 = m.team2PlayerIds.includes(player2Id);

    if ((p1Eq1 && p2Eq1) || (p1Eq2 && p2Eq2)) {
      stats.together.pj += 1;
      if (m.resultado === 'draw') {
        stats.together.e += 1;
      } else if ((m.resultado === 'team1' && p1Eq1) || (m.resultado === 'team2' && p1Eq2)) {
        stats.together.g += 1;
      } else {
        stats.together.p += 1;
      }
      continue;
    }

    if ((p1Eq1 && p2Eq2) || (p1Eq2 && p2Eq1)) {
      stats.versus.pj += 1;
      if (m.resultado === 'draw') {
        stats.versus.draws += 1;
      } else if ((m.resultado === 'team1' && p1Eq1) || (m.resultado === 'team2' && p1Eq2)) {
        stats.versus.p1Wins += 1;
      } else {
        stats.versus.p2Wins += 1;
      }
    }
  }

  return stats;
}

export function buildEvolutionSeries(topPlayerIds: string[], matches: Match[]): Record<string, number[]> {
  const sorted = byDateAsc(matches);
  const points = Object.fromEntries(topPlayerIds.map((id) => [id, 0])) as Record<string, number>;
  const series = Object.fromEntries(topPlayerIds.map((id) => [id, []])) as Record<string, number[]>;

  for (const match of sorted) {
    for (const playerId of topPlayerIds) {
      const inTeam1 = match.team1PlayerIds.includes(playerId);
      const inTeam2 = match.team2PlayerIds.includes(playerId);
      if (inTeam1 || inTeam2) {
        if (match.resultado === 'draw') points[playerId] += 1;
        if ((match.resultado === 'team1' && inTeam1) || (match.resultado === 'team2' && inTeam2)) {
          points[playerId] += 3;
        }
      }
      series[playerId].push(points[playerId]);
    }
  }

  return series;
}

function updateFromResult(row: StandingRow | undefined, result: Match['resultado'], inTeam1: boolean): void {
  if (!row) return;
  row.pj += 1;

  if (result === 'draw') {
    row.e += 1;
    row.puntos += 1;
    return;
  }

  const won = (result === 'team1' && inTeam1) || (result === 'team2' && !inTeam1);
  if (won) {
    row.g += 1;
    row.puntos += 3;
  } else {
    row.p += 1;
  }
}
