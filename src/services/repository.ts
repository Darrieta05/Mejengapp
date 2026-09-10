import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  where
} from 'firebase/firestore';
import type {
  AppSnapshot,
  League,
  LeagueMembership,
  Season,
  UserLeague
} from '../types/models';
import {
  localLeagues,
  localMemberships,
  localSeasons,
  localSnapshots,
  getLocalSnapshot,
  mapHistory,
  mapLeague,
  mapMembership,
  mapMatches,
  mapPlayers,
  mapSeason,
  snapshotKey
} from './repository-support';
import { generateLeagueCode, normalizeLeagueCode } from '../utils/league-code';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';
export {
  createMatch,
  createPlayer,
  deleteMatch,
  deletePlayer,
  editMatch as updateMatch,
  renamePlayer as updatePlayerName,
  updatePlayer,
  setWrappedEnabled,
  updateLeagueColor
} from './repository-mutations';
export { endSeason, getSeasons, getSeasonHistories } from './repository-seasons';

class LeagueCodeCollisionError extends Error {}

function makeMembershipId(uid: string, leagueId: string): string {
  return `${uid}_${leagueId}`;
}
export async function getUserLeagues(uid: string): Promise<UserLeague[]> {
  if (!isFirebaseConfigured()) {
    return localMemberships
      .filter((membership) => membership.uid === uid)
      .map((membership) => {
        const league = localLeagues.find((item) => item.id === membership.leagueId);
        if (!league) throw new Error('No se encontro la liga.');
        return { league, membership };
      });
  }

  const { db } = getFirebaseServices();
  const membershipsSnapshot = await getDocs(
    query(collection(db, 'memberships'), where('uid', '==', uid))
  );
  const memberships = membershipsSnapshot.docs.map((item) =>
    mapMembership(item.id, item.data() as Record<string, unknown>)
  );
  const userLeagues = await Promise.all(
    memberships.map(async (membership) => {
      const leagueSnapshot = await getDoc(doc(db, 'leagues', membership.leagueId));
      if (!leagueSnapshot.exists()) return null;
      return {
        league: mapLeague(leagueSnapshot.id, leagueSnapshot.data() as Record<string, unknown>),
        membership
      };
    })
  );

  return userLeagues
    .filter((item): item is UserLeague => Boolean(item))
    .sort((a, b) => a.league.name.localeCompare(b.league.name));
}

export async function createLeague(name: string, uid: string, themeColor?: string): Promise<UserLeague> {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (!normalizedName) throw new Error('El nombre de la liga es requerido.');

  if (!isFirebaseConfigured()) {
    let code = generateLeagueCode();
    while (localLeagues.some((league) => league.code === code)) code = generateLeagueCode();
    const league: League = {
      id: `local-${crypto.randomUUID()}`,
      name: normalizedName,
      code,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      adminUids: [uid],
      activeSeasonId: crypto.randomUUID(),
      themeColor: themeColor || '#0ea5e9'
    };
    const membership: LeagueMembership = {
      uid,
      leagueId: league.id,
      role: 'admin',
      joinCode: '',
      joinedAt: league.createdAt
    };
    localLeagues.push(league);
    localMemberships.push(membership);
    const season: Season = {
      id: league.activeSeasonId,
      leagueId: league.id,
      name: 'Temporada',
      startedAt: league.createdAt,
      endedAt: null,
      status: 'active',
      matchCount: 0
    };
    localSeasons.set(league.id, [season]);
    localSnapshots.set(snapshotKey(league.id, season.id), {
      players: [],
      matches: [],
      config: { wrappedEnabled: false },
      season,
      history: null
    });
    return { league, membership };
  }

  const { db } = getFirebaseServices();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateLeagueCode();
    try {
      return await runTransaction(db, async (transaction) => {
        const codeRef = doc(db, 'leagueCodes', code);
        const codeSnapshot = await transaction.get(codeRef);
        if (codeSnapshot.exists()) throw new LeagueCodeCollisionError();

        const leagueRef = doc(collection(db, 'leagues'));
        const membershipRef = doc(db, 'memberships', makeMembershipId(uid, leagueRef.id));
        const seasonRef = doc(collection(db, 'leagues', leagueRef.id, 'seasons'));
        const createdAt = new Date().toISOString();
        const league: League = {
          id: leagueRef.id,
          name: normalizedName,
          code,
          createdBy: uid,
          createdAt,
          adminUids: [uid],
          activeSeasonId: seasonRef.id,
          themeColor: themeColor || '#0ea5e9'
        };
        const season: Season = {
          id: seasonRef.id,
          leagueId: leagueRef.id,
          name: 'Temporada',
          startedAt: createdAt,
          endedAt: null,
          status: 'active',
          matchCount: 0
        };
        const membership: LeagueMembership = {
          uid,
          leagueId: leagueRef.id,
          role: 'admin',
          joinCode: '',
          joinedAt: createdAt
        };

        transaction.set(leagueRef, {
          name: league.name,
          code,
          createdBy: uid,
          createdAt,
          adminUids: [uid],
          activeSeasonId: season.id,
          themeColor: league.themeColor
        });
        transaction.set(seasonRef, season);
        transaction.set(codeRef, { leagueId: leagueRef.id });
        transaction.set(membershipRef, membership);
        return { league, membership };
      });
    } catch (error) {
      if (!(error instanceof LeagueCodeCollisionError)) throw error;
    }
  }

  throw new Error('No se pudo generar un codigo unico. Intenta de nuevo.');
}

export async function joinLeagueByCode(code: string, uid: string): Promise<UserLeague> {
  const normalizedCode = normalizeLeagueCode(code);
  if (!isFirebaseConfigured()) {
    const league = localLeagues.find((item) => item.code === normalizedCode);
    if (!league) throw new Error('El codigo de la liga no es valido.');
    if (localMemberships.some((item) => item.uid === uid && item.leagueId === league.id)) {
      throw new Error('Ya perteneces a esta liga.');
    }
    const membership: LeagueMembership = {
      uid,
      leagueId: league.id,
      role: 'player',
      joinCode: normalizedCode,
      joinedAt: new Date().toISOString()
    };
    localMemberships.push(membership);
    return { league, membership };
  }

  const { db } = getFirebaseServices();
  return runTransaction(db, async (transaction) => {
    const codeRef = doc(db, 'leagueCodes', normalizedCode);
    const codeSnapshot = await transaction.get(codeRef);
    if (!codeSnapshot.exists()) throw new Error('El codigo de la liga no es valido.');

    const leagueId = String(codeSnapshot.data().leagueId ?? '');
    const leagueRef = doc(db, 'leagues', leagueId);
    const membershipRef = doc(db, 'memberships', makeMembershipId(uid, leagueId));
    const leagueSnapshot = await transaction.get(leagueRef);
    const membershipSnapshot = await transaction.get(membershipRef);
    if (!leagueSnapshot.exists()) throw new Error('El codigo de la liga no es valido.');
    if (membershipSnapshot.exists()) throw new Error('Ya perteneces a esta liga.');

    const membership: LeagueMembership = {
      uid,
      leagueId,
      role: 'player',
      joinCode: normalizedCode,
      joinedAt: new Date().toISOString()
    };
    transaction.set(membershipRef, membership);
    return {
      league: mapLeague(leagueSnapshot.id, leagueSnapshot.data() as Record<string, unknown>),
      membership
    };
  });
}

export async function getSnapshot(leagueId: string, seasonId?: string): Promise<AppSnapshot> {
  if (!isFirebaseConfigured()) {
    const snapshot = getLocalSnapshot(leagueId, seasonId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    return snapshot;
  }

  const { db } = getFirebaseServices();
  const leagueSnap = await getDoc(doc(db, 'leagues', leagueId));
  if (!leagueSnap.exists()) throw new Error('No se encontro la liga.');
  const league = mapLeague(leagueSnap.id, leagueSnap.data() as Record<string, unknown>);
  const selectedSeasonId = seasonId ?? league.activeSeasonId;
  if (!selectedSeasonId) throw new Error('La liga no tiene una temporada activa.');
  const playersQ = query(collection(db, 'leagues', leagueId, 'players'));
  const matchesQ = query(
    collection(db, 'leagues', leagueId, 'seasons', selectedSeasonId, 'matches'),
    orderBy('fechaISO', 'asc')
  );
  const seasonRef = doc(db, 'leagues', leagueId, 'seasons', selectedSeasonId);
  const historyRef = doc(db, 'leagues', leagueId, 'history', selectedSeasonId);
  const configRef = doc(db, 'leagues', leagueId, 'config', 'global');

  const [playersSnap, matchesSnap, configSnap, seasonSnap, historySnap] = await Promise.all([
    getDocs(playersQ),
    getDocs(matchesQ),
    getDoc(configRef),
    getDoc(seasonRef),
    getDoc(historyRef)
  ]);
  if (!seasonSnap.exists()) throw new Error('No se encontro la temporada.');

  const players = mapPlayers(playersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  const matches = mapMatches(matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

  const configData = configSnap.exists()
    ? (configSnap.data() as Record<string, unknown>)
    : { wrappedEnabled: false, seasonLabel: 'Temporada' };

  return {
    players,
    matches,
    config: {
      wrappedEnabled: Boolean(configData.wrappedEnabled ?? false)
    },
    season: mapSeason(seasonSnap.id, seasonSnap.data() as Record<string, unknown>),
    history: historySnap.exists()
      ? mapHistory(historySnap.id, historySnap.data() as Record<string, unknown>)
      : null
  };
}
