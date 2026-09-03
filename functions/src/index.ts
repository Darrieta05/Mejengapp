import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

interface Player {
  id: string;
  nombre: string;
}

interface Match {
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  resultado: 'team1' | 'team2' | 'draw';
  mvpPlayerId: string | null;
  asistencia: number;
}

interface StandingRow {
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

interface Season {
  id: string;
  leagueId: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'ending' | 'ended';
  matchCount: number;
}

interface SeasonHistory {
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

interface EndSeasonRequest {
  leagueId: string;
  newSeasonName: string;
  requestId: string;
}

interface EndSeasonResult {
  newSeason: Season;
  history: SeasonHistory;
}

export const endSeason = onCall<EndSeasonRequest>(async (request): Promise<EndSeasonResult> => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesion.');
  const uid = request.auth.uid;
  const input = request.data;
  if (!input || typeof input.leagueId !== 'string' || typeof input.requestId !== 'string' ||
      !input.leagueId || input.leagueId.includes('/') || !input.requestId || input.requestId.includes('/')) {
    throw new HttpsError('invalid-argument', 'La solicitud de temporada no es valida.');
  }
  const newSeasonName = typeof input.newSeasonName === 'string' ? input.newSeasonName.trim() : '';
  if (!newSeasonName || newSeasonName.length > 60) {
    throw new HttpsError('invalid-argument', 'El nombre de temporada no es valido.');
  }

  const operationRef = db.doc(`leagues/${input.leagueId}/seasonOperations/${input.requestId}`);
  const newSeasonRef = db.collection(`leagues/${input.leagueId}/seasons`).doc();
  return db.runTransaction(async (transaction) => {
    const leagueRef = db.doc(`leagues/${input.leagueId}`);
    const leagueSnapshot = await transaction.get(leagueRef);
    const existingOperation = await transaction.get(operationRef);
    if (!leagueSnapshot.exists) throw new HttpsError('not-found', 'No se encontro la liga.');

    const leagueData = leagueSnapshot.data() ?? {};
    const adminsRef = db.doc(`admins/${uid}`);
    const adminSnapshot = await transaction.get(adminsRef);
    const isLeagueAdmin = Array.isArray(leagueData.adminUids) && leagueData.adminUids.includes(uid);
    if (!adminSnapshot.exists && !isLeagueAdmin) {
      throw new HttpsError('permission-denied', 'No tienes permisos para cerrar la temporada.');
    }
    if (existingOperation.exists) return existingOperation.data()?.result as EndSeasonResult;

    const seasonId = String(leagueData.activeSeasonId ?? '');
    if (!seasonId) throw new HttpsError('failed-precondition', 'La liga no tiene temporada activa.');
    const seasonRef = db.doc(`leagues/${input.leagueId}/seasons/${seasonId}`);
    const historyRef = db.doc(`leagues/${input.leagueId}/history/${seasonId}`);
    const playersQuery = db.collection(`leagues/${input.leagueId}/players`);
    const matchesQuery = db.collection(`leagues/${input.leagueId}/seasons/${seasonId}/matches`);
    const [seasonSnapshot, historySnapshot, playersSnapshot, matchesSnapshot] = await Promise.all([
      transaction.get(seasonRef),
      transaction.get(historyRef),
      transaction.get(playersQuery),
      transaction.get(matchesQuery)
    ]);
    if (!seasonSnapshot.exists) throw new HttpsError('not-found', 'No se encontro la temporada.');
    const season = toSeason(seasonId, seasonSnapshot.data() ?? {});
    if (season.status !== 'active') throw new HttpsError('failed-precondition', 'La temporada no esta activa.');
    if (historySnapshot.exists) throw new HttpsError('already-exists', 'La temporada ya tiene historial.');

    const endedAt = new Date().toISOString();
    const players = playersSnapshot.docs.map((item) => ({ id: item.id, nombre: String(item.data().nombre ?? '') }));
    const matches = matchesSnapshot.docs.map((item) => toMatch(item.data()));
    const history = buildSeasonHistory(season, players, matches, endedAt);
    const newSeason: Season = {
      id: newSeasonRef.id,
      leagueId: input.leagueId,
      name: newSeasonName,
      startedAt: endedAt,
      endedAt: null,
      status: 'active',
      matchCount: 0
    };
    const endedSeason = { ...season, status: 'ended' as const, endedAt };

    transaction.set(seasonRef, endedSeason);
    transaction.set(historyRef, history);
    transaction.set(newSeasonRef, newSeason);
    transaction.update(leagueRef, { activeSeasonId: newSeason.id });
    transaction.set(operationRef, { result: { newSeason, history }, createdAt: endedAt, uid });
    return { newSeason, history };
  });
});

function toSeason(id: string, data: DocumentData): Season {
  const status = data.status === 'ended' || data.status === 'ending' ? data.status : 'active';
  return {
    id,
    leagueId: String(data.leagueId ?? ''),
    name: String(data.name ?? 'Temporada'),
    startedAt: String(data.startedAt ?? ''),
    endedAt: data.endedAt ? String(data.endedAt) : null,
    status,
    matchCount: Number(data.matchCount ?? 0)
  };
}

function toMatch(data: DocumentData): Match {
  return {
    team1PlayerIds: asStrings(data.team1PlayerIds),
    team2PlayerIds: asStrings(data.team2PlayerIds),
    resultado: data.resultado === 'team1' || data.resultado === 'team2' ? data.resultado : 'draw',
    mvpPlayerId: data.mvpPlayerId ? String(data.mvpPlayerId) : null,
    asistencia: Number(data.asistencia ?? 0)
  };
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function buildSeasonHistory(
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

function buildStandings(players: Player[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  players.forEach((player) => rows.set(player.id, {
    playerId: player.id, nombre: player.nombre, pj: 0, g: 0, e: 0, p: 0, puntos: 0, efectividad: 0, mvp: 0
  }));
  matches.forEach((match) => {
    match.team1PlayerIds.forEach((id) => updateRow(rows.get(id), match.resultado, true));
    match.team2PlayerIds.forEach((id) => updateRow(rows.get(id), match.resultado, false));
    if (match.mvpPlayerId && rows.has(match.mvpPlayerId)) rows.get(match.mvpPlayerId)!.mvp += 1;
  });
  const standings = [...rows.values()];
  standings.forEach((row) => {
    row.efectividad = row.pj > 0 ? Math.round(((row.g * 3 + row.e) / (row.pj * 3)) * 100) : 0;
  });
  return standings.sort((a, b) => b.puntos - a.puntos || b.g - a.g || a.pj - b.pj || a.nombre.localeCompare(b.nombre));
}

function updateRow(row: StandingRow | undefined, result: Match['resultado'], inTeam1: boolean): void {
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