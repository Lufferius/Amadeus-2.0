import { scenarios } from './scenarios.mjs';
import { createProfessionalTerminalSession } from './sessionState.mjs';

export const TERMINAL_STORAGE_KEY = 'amadeus-learning-coach-terminal-v2';
const VERSION = 2;

function freshState() {
  return {
    session: createProfessionalTerminalSession(),
    mode: 'guided',
    selectedScenarioId: scenarios[0].id,
    scenarioProgress: {},
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validPnr(pnr) {
  return isObject(pnr)
    && ['EMPTY', 'WORKING', 'COMMITTED', 'RETRIEVED'].includes(pnr.status)
    && ['names', 'segments', 'contacts', 'ssrs', 'osis', 'remarks'].every((key) => Array.isArray(pnr[key]));
}

function validSession(session) {
  return isObject(session)
    && Array.isArray(session.history)
    && Array.isArray(session.transcript)
    && Array.isArray(session.mistakes)
    && isObject(session.score)
    && validPnr(session.pnr)
    && isObject(session.records)
    && Number.isInteger(session.locatorCounter)
    && (session.availability === null || (isObject(session.availability) && Array.isArray(session.availability.rows)))
    && isObject(session.queue)
    && Array.isArray(session.queue.items)
    && Number.isInteger(session.queue.currentIndex);
}

export function serializeTerminalState(state) {
  return JSON.stringify({
    version: VERSION,
    session: state.session,
    mode: state.mode === 'free' ? 'free' : 'guided',
    selectedScenarioId: scenarios.some((scenario) => scenario.id === state.selectedScenarioId)
      ? state.selectedScenarioId
      : scenarios[0].id,
    scenarioProgress: isObject(state.scenarioProgress) ? state.scenarioProgress : {},
  });
}

export function deserializeTerminalState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== VERSION || !validSession(parsed.session)) return freshState();
    return JSON.parse(serializeTerminalState(parsed));
  } catch {
    return freshState();
  }
}

export function saveTerminalState(storage, state) {
  try {
    storage.setItem(TERMINAL_STORAGE_KEY, serializeTerminalState(state));
    return true;
  } catch {
    return false;
  }
}

export function loadTerminalState(storage) {
  try {
    return deserializeTerminalState(storage.getItem(TERMINAL_STORAGE_KEY));
  } catch {
    return freshState();
  }
}
