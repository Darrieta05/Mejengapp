const LEAGUE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LEAGUE_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LEAGUE_CODE_NUMBERS = '23456789';

export function generateLeagueCode(length = 6): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  const code = Array.from(values, (value) =>
    LEAGUE_CODE_ALPHABET[value % LEAGUE_CODE_ALPHABET.length]
  );

  code[0] = LEAGUE_CODE_LETTERS[values[0] % LEAGUE_CODE_LETTERS.length];
  code[1] = LEAGUE_CODE_NUMBERS[values[1] % LEAGUE_CODE_NUMBERS.length];

  return code.join('');
}

export function normalizeLeagueCode(code: string): string {
  return code.trim().toUpperCase();
}