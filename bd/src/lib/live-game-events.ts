import { logger } from './logger.js';

/** Carries the new state itself, so viewers never refetch per scorer tap. */
export interface LiveGameChangedEvent {
  gameId: string;
  state: unknown;
  type: 'state_changed';
}

type Listener = (event: LiveGameChangedEvent) => void;
const listeners = new Set<Listener>();

export function emitLiveGameChanged(gameId: string, state: unknown): void {
  for (const listener of listeners) {
    try {
      listener({ gameId, state, type: 'state_changed' });
    } catch (error) {
      logger.warn({ err: error }, 'Live game listener threw — dropped');
    }
  }
}

export function subscribeLiveGameEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
