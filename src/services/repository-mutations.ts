import {
  writeBatch,
  collection,
  doc,
  runTransaction,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import type { CreateMatchInput, CreatePlayerInput, UpdateMatchInput } from '../types/actions';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';
import { getLocalSnapshot, localLeagues, localSnapshots } from './repository-support';

export async function createPlayer(leagueId: string, input: CreatePlayerInput): Promise<void> {
  const email = input.email?.trim().toLowerCase() || null;
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(`${leagueId}:${snapshot.season.id}`, {
      ...snapshot,
      players: [
        ...snapshot.players,
        { id: crypto.randomUUID(), nombre: input.nombre, activo: true, email }
      ]
    });
    return;
  }

  const { db } = getFirebaseServices();
  const playerRef = doc(collection(db, 'leagues', leagueId, 'players'));
  const batch = writeBatch(db);
  batch.set(playerRef, {
    nombre: input.nombre,
    activo: true
  });
  if (email) {
    batch.set(doc(db, 'leagues', leagueId, 'playerContacts', playerRef.id), { email });
  }
  await batch.commit();
}

export async function deletePlayer(leagueId: string, playerId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(`${leagueId}:${snapshot.season.id}`, {
      ...snapshot,
      players: snapshot.players.filter((player) => player.id !== playerId),
      matches: snapshot.matches.map((match) => ({
        ...match,
        team1PlayerIds: match.team1PlayerIds.filter((id) => id !== playerId),
        team2PlayerIds: match.team2PlayerIds.filter((id) => id !== playerId),
        mvpPlayerId: match.mvpPlayerId === playerId ? null : match.mvpPlayerId,
        asistencia:
          match.team1PlayerIds.filter((id) => id !== playerId).length +
          match.team2PlayerIds.filter((id) => id !== playerId).length
      }))
    });
    return;
  }

  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'leagues', leagueId, 'players', playerId));
  batch.delete(doc(db, 'leagues', leagueId, 'playerContacts', playerId));
  await batch.commit();
}

export async function updatePlayer(
  leagueId: string,
  playerId: string,
  data: { nombre: string; email?: string | null }
): Promise<void> {
  const emailDefined = Object.prototype.hasOwnProperty.call(data, 'email');
  const normalizedEmail = emailDefined ? (data.email?.trim().toLowerCase() || null) : undefined;

  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(`${leagueId}:${snapshot.season.id}`, {
      ...snapshot,
      players: snapshot.players.map((player) =>
        player.id === playerId
          ? { ...player, nombre: data.nombre, ...(emailDefined ? { email: normalizedEmail } : {}) }
          : player
      )
    });
    return;
  }

  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  batch.update(doc(db, 'leagues', leagueId, 'players', playerId), { nombre: data.nombre });
  if (!emailDefined) {
    await batch.commit();
    return;
  }

  const contactRef = doc(db, 'leagues', leagueId, 'playerContacts', playerId);
  if (normalizedEmail) {
    batch.set(contactRef, { email: normalizedEmail });
  } else {
    batch.delete(contactRef);
  }
  await batch.commit();
}

export async function renamePlayer(leagueId: string, playerId: string, nombre: string): Promise<void> {
  return updatePlayer(leagueId, playerId, { nombre });
}

function matchPayload(input: CreateMatchInput): Omit<CreateMatchInput, 'mvpPlayerId'> & {
  mvpPlayerId: string | null;
  asistencia: number;
} {
  return {
    nombre: input.nombre,
    fechaISO: input.fechaISO,
    team1PlayerIds: input.team1PlayerIds,
    team2PlayerIds: input.team2PlayerIds,
    resultado: input.resultado,
    mvpPlayerId: input.mvpPlayerId,
    asistencia: input.team1PlayerIds.length + input.team2PlayerIds.length
  };
}

function matchesCollection(leagueId: string, seasonId: string) {
  const { db } = getFirebaseServices();
  return collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches');
}

export async function createMatch(
  leagueId: string,
  seasonId: string,
  input: CreateMatchInput
): Promise<void> {
  const payload = matchPayload(input);
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId, seasonId);
    if (!snapshot) throw new Error('No se encontro la temporada.');
    assertLocalActiveSeason(leagueId, seasonId, snapshot);
    localSnapshots.set(`${leagueId}:${seasonId}`, {
      ...snapshot,
      matches: [...snapshot.matches, { id: crypto.randomUUID(), ...payload }],
      season: { ...snapshot.season, matchCount: snapshot.season.matchCount + 1 }
    });
    return;
  }

  const { db } = getFirebaseServices();
  await runTransaction(db, async (transaction) => {
    const leagueRef = doc(db, 'leagues', leagueId);
    const seasonRef = doc(db, 'leagues', leagueId, 'seasons', seasonId);
    const [leagueSnapshot, seasonSnapshot] = await Promise.all([
      transaction.get(leagueRef),
      transaction.get(seasonRef)
    ]);
    assertActiveSeason(leagueId, seasonId, leagueSnapshot.data(), seasonSnapshot.data());
    transaction.set(doc(matchesCollection(leagueId, seasonId)), payload);
    transaction.update(seasonRef, { matchCount: Number(seasonSnapshot.data()?.matchCount ?? 0) + 1 });
  });
}

export async function deleteMatch(leagueId: string, seasonId: string, matchId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId, seasonId);
    if (!snapshot) throw new Error('No se encontro la temporada.');
    assertLocalActiveSeason(leagueId, seasonId, snapshot);
    const matches = snapshot.matches.filter((match) => match.id !== matchId);
    localSnapshots.set(`${leagueId}:${seasonId}`, {
      ...snapshot,
      matches,
      season: { ...snapshot.season, matchCount: matches.length }
    });
    return;
  }

  const { db } = getFirebaseServices();
  await runTransaction(db, async (transaction) => {
    const leagueRef = doc(db, 'leagues', leagueId);
    const seasonRef = doc(db, 'leagues', leagueId, 'seasons', seasonId);
    const matchRef = doc(matchesCollection(leagueId, seasonId), matchId);
    const [leagueSnapshot, seasonSnapshot, matchSnapshot] = await Promise.all([
      transaction.get(leagueRef),
      transaction.get(seasonRef),
      transaction.get(matchRef)
    ]);
    assertActiveSeason(leagueId, seasonId, leagueSnapshot.data(), seasonSnapshot.data());
    if (!matchSnapshot.exists()) throw new Error('No se encontro el partido.');
    transaction.delete(matchRef);
    transaction.update(seasonRef, { matchCount: Math.max(0, Number(seasonSnapshot.data()?.matchCount ?? 1) - 1) });
  });
}

export async function editMatch(leagueId: string, seasonId: string, input: UpdateMatchInput): Promise<void> {
  const payload = matchPayload(input);
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId, seasonId);
    if (!snapshot) throw new Error('No se encontro la temporada.');
    assertLocalActiveSeason(leagueId, seasonId, snapshot);
    localSnapshots.set(`${leagueId}:${seasonId}`, {
      ...snapshot,
      matches: snapshot.matches.map((match) =>
        match.id === input.id ? { ...match, ...payload } : match
      )
    });
    return;
  }

  const { db } = getFirebaseServices();
  await runTransaction(db, async (transaction) => {
    const leagueRef = doc(db, 'leagues', leagueId);
    const seasonRef = doc(db, 'leagues', leagueId, 'seasons', seasonId);
    const matchRef = doc(matchesCollection(leagueId, seasonId), input.id);
    const [leagueSnapshot, seasonSnapshot] = await Promise.all([
      transaction.get(leagueRef),
      transaction.get(seasonRef)
    ]);
    assertActiveSeason(leagueId, seasonId, leagueSnapshot.data(), seasonSnapshot.data());
    transaction.update(matchRef, payload);
  });
}

export async function setWrappedEnabled(leagueId: string, enabled: boolean): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(`${leagueId}:${snapshot.season.id}`, {
      ...snapshot,
      config: { ...snapshot.config, wrappedEnabled: enabled }
    });
    return;
  }

  const { db } = getFirebaseServices();
  await setDoc(doc(db, 'leagues', leagueId, 'config', 'global'), { wrappedEnabled: enabled }, { merge: true });
}

export async function updateLeagueColor(leagueId: string, themeColor: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const league = localLeagues.find((l) => l.id === leagueId);
    if (league) league.themeColor = themeColor;
    return;
  }

  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'leagues', leagueId), { themeColor });
}

function assertActiveSeason(
  leagueId: string,
  seasonId: string,
  league: Record<string, unknown> | undefined,
  season: Record<string, unknown> | undefined
): void {
  if (!league || !season || league.activeSeasonId !== seasonId || season.status !== 'active') {
    throw new Error(`La temporada activa de ${leagueId} no esta disponible.`);
  }
}

function assertLocalActiveSeason(
  leagueId: string,
  seasonId: string,
  snapshot: { season: { id: string; status: string } }
): void {
  const league = localLeagues.find((item) => item.id === leagueId);
  if (!league || league.activeSeasonId !== seasonId || snapshot.season.status !== 'active') {
    throw new Error(`La temporada activa de ${leagueId} no esta disponible.`);
  }
}