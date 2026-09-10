import type { CreateMatchInput } from '../types/actions';
import { normalizeLeagueCode } from './league-code';

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function normalizePlayerEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

export function validatePlayerEmail(email?: string | null): string | null {
  const normalized = normalizePlayerEmail(email);
  if (!normalized) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return 'El formato de correo no es valido.';
  }
  return null;
}

export function validatePlayerName(name: string): string | null {
  const normalized = normalizePlayerName(name);
  if (!normalized) return 'El nombre del jugador es requerido.';
  if (normalized.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (normalized.length > 40) return 'El nombre no debe exceder 40 caracteres.';
  return null;
}

export function validateLeagueName(name: string): string | null {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'El nombre de la liga es requerido.';
  if (normalized.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (normalized.length > 60) return 'El nombre no debe exceder 60 caracteres.';
  return null;
}

export function validateLeagueCode(code: string): string | null {
  const normalized = normalizeLeagueCode(code);
  if (!normalized) return 'El codigo de la liga es requerido.';
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    return 'El codigo debe tener 6 letras o numeros.';
  }
  return null;
}

export function validateMatchInput(input: CreateMatchInput): string | null {
  if (!input.nombre.trim()) return 'El nombre del partido es requerido.';
  if (!input.fechaISO) return 'La fecha del partido es requerida.';
  if (input.team1PlayerIds.length === 0 || input.team2PlayerIds.length === 0) {
    return 'Debes seleccionar jugadores para ambos equipos.';
  }

  const allIds = [...input.team1PlayerIds, ...input.team2PlayerIds];
  const unique = new Set(allIds);
  if (unique.size !== allIds.length) {
    return 'Un jugador no puede estar en ambos equipos.';
  }

  if (input.mvpPlayerId && !allIds.includes(input.mvpPlayerId)) {
    return 'El MVP debe pertenecer a uno de los equipos.';
  }

  return null;
}
