import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { demoSnapshot } from '../data/demo';
import type { CreateMatchInput, CreatePlayerInput, UpdateMatchInput } from '../types/actions';
import type { AppSnapshot, Match, Player } from '../types/models';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';

let localSnapshot: AppSnapshot = {
  players: [...demoSnapshot.players],
  matches: [...demoSnapshot.matches],
  config: { ...demoSnapshot.config }
};

function mapPlayers(raw: unknown[]): Player[] {
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id),
      nombre: String(row.nombre ?? ''),
      activo: Boolean(row.activo ?? true)
    };
  });
}

function mapMatches(raw: unknown[]): Match[] {
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

export async function getSnapshot(): Promise<AppSnapshot> {
  if (!isFirebaseConfigured()) {
    return localSnapshot;
  }

  const { db } = getFirebaseServices();
  const playersQ = query(collection(db, 'players'));
  const matchesQ = query(collection(db, 'matches'), orderBy('fechaISO', 'asc'));
  const configRef = doc(db, 'config', 'global');

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

export async function createPlayer(input: CreatePlayerInput): Promise<void> {
  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      players: [
        ...localSnapshot.players,
        { id: crypto.randomUUID(), nombre: input.nombre, activo: true }
      ]
    };
    return;
  }

  const { db } = getFirebaseServices();
  await addDoc(collection(db, 'players'), {
    nombre: input.nombre,
    activo: true
  });
}

export async function deletePlayer(playerId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      players: localSnapshot.players.filter((p) => p.id !== playerId),
      matches: localSnapshot.matches.map((match) => ({
        ...match,
        team1PlayerIds: match.team1PlayerIds.filter((id) => id !== playerId),
        team2PlayerIds: match.team2PlayerIds.filter((id) => id !== playerId),
        mvpPlayerId: match.mvpPlayerId === playerId ? null : match.mvpPlayerId,
        asistencia:
          match.team1PlayerIds.filter((id) => id !== playerId).length +
          match.team2PlayerIds.filter((id) => id !== playerId).length
      }))
    };
    return;
  }

  const { db } = getFirebaseServices();
  await deleteDoc(doc(db, 'players', playerId));
}

export async function updatePlayerName(playerId: string, nombre: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      players: localSnapshot.players.map((player) =>
        player.id === playerId ? { ...player, nombre } : player
      )
    };
    return;
  }

  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'players', playerId), { nombre });
}

export async function createMatch(input: CreateMatchInput): Promise<void> {
  const payload = {
    nombre: input.nombre,
    fechaISO: input.fechaISO,
    team1PlayerIds: input.team1PlayerIds,
    team2PlayerIds: input.team2PlayerIds,
    resultado: input.resultado,
    mvpPlayerId: input.mvpPlayerId,
    asistencia: input.team1PlayerIds.length + input.team2PlayerIds.length
  };

  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      matches: [...localSnapshot.matches, { id: crypto.randomUUID(), ...payload }]
    };
    return;
  }

  const { db } = getFirebaseServices();
  await addDoc(collection(db, 'matches'), payload);
}

export async function deleteMatch(matchId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      matches: localSnapshot.matches.filter((m) => m.id !== matchId)
    };
    return;
  }

  const { db } = getFirebaseServices();
  await deleteDoc(doc(db, 'matches', matchId));
}

export async function updateMatch(input: UpdateMatchInput): Promise<void> {
  const payload = {
    nombre: input.nombre,
    fechaISO: input.fechaISO,
    team1PlayerIds: input.team1PlayerIds,
    team2PlayerIds: input.team2PlayerIds,
    resultado: input.resultado,
    mvpPlayerId: input.mvpPlayerId,
    asistencia: input.team1PlayerIds.length + input.team2PlayerIds.length
  };

  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      matches: localSnapshot.matches.map((match) =>
        match.id === input.id ? { ...match, ...payload } : match
      )
    };
    return;
  }

  const { db } = getFirebaseServices();
  await updateDoc(doc(db, 'matches', input.id), payload);
}

export async function setWrappedEnabled(enabled: boolean): Promise<void> {
  if (!isFirebaseConfigured()) {
    localSnapshot = {
      ...localSnapshot,
      config: {
        ...localSnapshot.config,
        wrappedEnabled: enabled
      }
    };
    return;
  }

  const { db } = getFirebaseServices();
  const ref = doc(db, 'config', 'global');
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, { wrappedEnabled: enabled });
  } else {
    await setDoc(ref, { wrappedEnabled: enabled, seasonLabel: 'Temporada' });
  }
}
