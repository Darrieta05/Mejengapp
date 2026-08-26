import type { CreateMatchInput } from '../types/actions';

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validatePlayerName(name: string): string | null {
  const normalized = normalizePlayerName(name);
  if (!normalized) return 'El nombre del jugador es requerido.';
  if (normalized.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (normalized.length > 40) return 'El nombre no debe exceder 40 caracteres.';
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
