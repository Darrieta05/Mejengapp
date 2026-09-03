import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import type { CreateMatchInput, CreatePlayerInput, UpdateMatchInput } from '../types/actions';
import type {
  AppSnapshot,
  League,
  LeagueMembership,
  UserLeague
} from '../types/models';
import {
  localLeagues,
  localMemberships,
  localSnapshots,
  mapLeague,
  mapMembership,
  mapMatches,
  mapPlayers
} from './repository-support';
import { generateLeagueCode, normalizeLeagueCode } from '../utils/league-code';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';

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

export async function createLeague(name: string, uid: string): Promise<UserLeague> {
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
      adminUids: [uid]
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
    localSnapshots.set(league.id, {
      players: [],
      matches: [],
      config: { wrappedEnabled: false, seasonLabel: 'Temporada' }
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
        const createdAt = new Date().toISOString();
        const league: League = {
          id: leagueRef.id,
          name: normalizedName,
          code,
          createdBy: uid,
          createdAt,
          adminUids: [uid]
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
          adminUids: [uid]
        });
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
      role: 'member',
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
      role: 'member',
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

export async function getSnapshot(leagueId: string): Promise<AppSnapshot> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    return snapshot;
  }

  const { db } = getFirebaseServices();
  const playersQ = query(collection(db, 'leagues', leagueId, 'players'));
  const matchesQ = query(collection(db, 'leagues', leagueId, 'matches'), orderBy('fechaISO', 'asc'));
  const configRef = doc(db, 'leagues', leagueId, 'config', 'global');

  const [playersSnap, matchesSnap, configSnap] = await Promise.all([
    getDocs(playersQ),
    getDocs(matchesQ),
    getDoc(configRef)
  ]);

  const players = mapPlayers(playersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  const matches = mapMatches(matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

  const configData = configSnap.exists()
    ? (configSnap.data() as Record<string, unknown>)
    : { wrappedEnabled: false, seasonLabel: 'Temporada' };

  return {
    players,
    matches,
    config: {
      wrappedEnabled: Boolean(configData.wrappedEnabled ?? false),
      seasonLabel: String(configData.seasonLabel ?? 'Temporada')
    }
  };
}

export async function createPlayer(leagueId: string, input: CreatePlayerInput): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      players: [...snapshot.players, { id: crypto.randomUUID(), nombre: input.nombre, activo: true }]
    });
    return;
  }

  const { db } = getFirebaseServices();
  await addDoc(collection(db, 'leagues', leagueId, 'players'), {
    nombre: input.nombre,
    activo: true
  });
}

export async function deletePlayer(leagueId: string, playerId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
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
  await deleteDoc(doc(db, 'leagues', leagueId, 'players', playerId));
}

export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  nombre: string
): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      players: snapshot.players.map((player) =>
        player.id === playerId ? { ...player, nombre } : player
      )
    });
    return;
  }

  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'leagues', leagueId, 'players', playerId), { nombre });
}

function matchPayload(input: CreateMatchInput) {
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

export async function createMatch(leagueId: string, input: CreateMatchInput): Promise<void> {
  const payload = matchPayload(input);
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      matches: [...snapshot.matches, { id: crypto.randomUUID(), ...payload }]
    });
    return;
  }

  const { db } = getFirebaseServices();
  await addDoc(collection(db, 'leagues', leagueId, 'matches'), payload);
}

export async function deleteMatch(leagueId: string, matchId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      matches: snapshot.matches.filter((match) => match.id !== matchId)
    });
    return;
  }

  const { db } = getFirebaseServices();
  await deleteDoc(doc(db, 'leagues', leagueId, 'matches', matchId));
}

export async function updateMatch(leagueId: string, input: UpdateMatchInput): Promise<void> {
  const payload = matchPayload(input);
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      matches: snapshot.matches.map((match) =>
        match.id === input.id ? { ...match, ...payload } : match
      )
    });
    return;
  }

  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'leagues', leagueId, 'matches', input.id), payload);
}

export async function setWrappedEnabled(leagueId: string, enabled: boolean): Promise<void> {
  if (!isFirebaseConfigured()) {
    const snapshot = localSnapshots.get(leagueId);
    if (!snapshot) throw new Error('No se encontro la liga.');
    localSnapshots.set(leagueId, {
      ...snapshot,
      config: { ...snapshot.config, wrappedEnabled: enabled }
    });
    return;
  }

  const { db } = getFirebaseServices();
  const ref = doc(db, 'leagues', leagueId, 'config', 'global');
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, { wrappedEnabled: enabled });
  } else {
    await setDoc(ref, { wrappedEnabled: enabled, seasonLabel: 'Temporada' });
  }
}
