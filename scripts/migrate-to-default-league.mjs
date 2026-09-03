import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
const leagueId = process.env.DEFAULT_LEAGUE_ID || 'liga-original';
const ownerUid = process.env.DEFAULT_LEAGUE_OWNER_UID;

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

function generateCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = process.env.DEFAULT_LEAGUE_CODE || generateCode();
    if (!(await db.collection('leagueCodes').doc(code).get()).exists) return code;
    if (process.env.DEFAULT_LEAGUE_CODE) break;
  }
  throw new Error('No se pudo reservar un codigo para la liga original.');
}

async function commitOperations(operations) {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = db.batch();
    operations.slice(index, index + 450).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }
}

const [oldPlayers, oldMatches, oldConfig, adminDocs] = await Promise.all([
  db.collection('players').get(),
  db.collection('matches').get(),
  db.collection('config').doc('global').get(),
  db.collection('admins').get()
]);
const adminUids = adminDocs.docs.map((item) => item.id);
const createdBy = ownerUid || adminUids[0];
if (!createdBy) throw new Error('Define DEFAULT_LEAGUE_OWNER_UID cuando no existan admins.');
const leagueAdminUids = [...new Set([...adminUids, createdBy])];

const leagueRef = db.collection('leagues').doc(leagueId);
if ((await leagueRef.get()).exists) throw new Error(`La liga ${leagueId} ya existe.`);
const code = await uniqueCode();
const now = new Date().toISOString();
const seasonRef = leagueRef.collection('seasons').doc();
const config = oldConfig.exists
  ? oldConfig.data()
  : { wrappedEnabled: false, seasonLabel: 'Temporada' };
const league = {
  name: 'Liga Original',
  code,
  createdBy,
  createdAt: now,
  adminUids: leagueAdminUids,
  activeSeasonId: seasonRef.id
};
const season = {
  leagueId,
  name: String(config.seasonLabel || 'Temporada'),
  startedAt: now,
  endedAt: null,
  status: 'active',
  matchCount: oldMatches.size
};

const operations = [
  { ref: leagueRef, data: league },
  { ref: db.collection('leagueCodes').doc(code), data: { leagueId } },
  {
    ref: leagueRef.collection('config').doc('global'),
    data: { wrappedEnabled: Boolean(config.wrappedEnabled) }
  },
  { ref: seasonRef, data: season },
  ...oldPlayers.docs.map((item) => ({ ref: leagueRef.collection('players').doc(item.id), data: item.data() })),
  ...oldMatches.docs.map((item) => ({ ref: seasonRef.collection('matches').doc(item.id), data: item.data() })),
  ...leagueAdminUids.map((uid) => ({
    ref: db.collection('memberships').doc(`${uid}_${leagueId}`),
    data: { uid, leagueId, role: 'admin', joinCode: '', joinedAt: now }
  }))
];

await commitOperations(operations);
console.log(`Migrated ${oldPlayers.size} players and ${oldMatches.size} matches to ${leagueId}.`);
console.log(`League code: ${code}`);