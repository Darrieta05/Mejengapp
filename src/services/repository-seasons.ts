import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { EndSeasonResult, Season, SeasonHistory } from '../types/models';
import { buildSeasonHistory } from '../utils/calculations';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';
import {
  getLocalSnapshot,
  localLeagues,
  localSeasonOperations,
  localSeasons,
  mapHistory,
  mapSeason,
  setLocalSnapshot
} from './repository-support';

interface EndSeasonRequest {
  leagueId: string;
  newSeasonName: string;
  requestId: string;
}

export async function getSeasons(leagueId: string): Promise<Season[]> {
  if (!isFirebaseConfigured()) return [...(localSeasons.get(leagueId) ?? [])].reverse();

  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(collection(db, 'leagues', leagueId, 'seasons'), orderBy('startedAt', 'desc'))
  );
  return snapshot.docs.map((item) => mapSeason(item.id, item.data() as Record<string, unknown>));
}

export async function getSeasonHistories(leagueId: string): Promise<SeasonHistory[]> {
  if (!isFirebaseConfigured()) {
    const seasons = localSeasons.get(leagueId) ?? [];
    const histories: SeasonHistory[] = [];
    for (const s of seasons) {
      const snap = getLocalSnapshot(leagueId, s.id);
      if (snap?.history) {
        histories.push(snap.history);
      }
    }
    return histories;
  }

  const { db } = getFirebaseServices();
  const snapshot = await getDocs(collection(db, 'leagues', leagueId, 'history'));
  return snapshot.docs.map((item) => mapHistory(item.id, item.data() as Record<string, unknown>));
}

export async function endSeason(
  leagueId: string,
  newSeasonName: string,
  requestId: string
): Promise<EndSeasonResult> {
  const normalizedName = newSeasonName.trim().replace(/\s+/g, ' ');
  if (!normalizedName) throw new Error('El nombre de la nueva temporada es requerido.');

  if (!isFirebaseConfigured()) {
    const operationKey = `${leagueId}:${requestId}`;
    const existingOperation = localSeasonOperations.get(operationKey);
    if (existingOperation) return existingOperation;
    const league = localLeagues.find((item) => item.id === leagueId);
    const snapshot = getLocalSnapshot(leagueId);
    if (!league || !snapshot) throw new Error('No se encontro la liga.');
    if (snapshot.season.status !== 'active' || league.activeSeasonId !== snapshot.season.id) {
      throw new Error('La temporada no esta activa.');
    }
    const endedAt = new Date().toISOString();
    const history = buildSeasonHistory(snapshot.season, snapshot.players, snapshot.matches, endedAt);
    const endedSeason: Season = { ...snapshot.season, status: 'ended', endedAt };
    const newSeason: Season = {
      id: crypto.randomUUID(),
      leagueId,
      name: normalizedName,
      startedAt: endedAt,
      endedAt: null,
      status: 'active',
      matchCount: 0
    };
    league.activeSeasonId = newSeason.id;
    localSeasons.set(leagueId, [...(localSeasons.get(leagueId) ?? []).map((season) =>
      season.id === endedSeason.id ? endedSeason : season
    ), newSeason]);
    setLocalSnapshot({ ...snapshot, season: endedSeason, history });
    setLocalSnapshot({ ...snapshot, matches: [], season: newSeason, history: null });
    const result = { newSeason, history };
    localSeasonOperations.set(operationKey, result);
    return result;
  }

  const { functions } = getFirebaseServices();
  const callable = httpsCallable<EndSeasonRequest, EndSeasonResult>(functions, 'endSeason');
  return (await callable({ leagueId, newSeasonName: normalizedName, requestId })).data;
}
