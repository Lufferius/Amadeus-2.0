import { executeProfessionalCommand } from '../src/terminal/commandExecutor.mjs';
import { deserializeTerminalState, loadTerminalState, saveTerminalState, serializeTerminalState } from '../src/terminal/persistence.mjs';
import { evaluateScenario, getScenario, scenarios } from '../src/terminal/scenarios.mjs';
import { createProfessionalTerminalSession } from '../src/terminal/sessionState.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(session, command) {
  const result = executeProfessionalCommand(session, command);
  session.history.push(command);
  session.transcript.push(result);
  return result;
}

export function testThreeProfessionalScenariosHaveStableLearningStructure() {
  assert(scenarios.length === 3, 'Phase one should expose exactly three guided scenarios');
  assert(JSON.stringify(scenarios.map((item) => item.id)) === JSON.stringify(['basic-one-way-pnr', 'ssr-osi-quality', 'pricing-comparison']), 'Scenario ids should be stable');
  for (const scenario of scenarios) {
    assert(scenario.title && scenario.objective && scenario.steps.length >= 3, `${scenario.id} should be complete`);
    for (const step of scenario.steps) assert(step.id && step.title && step.hint && typeof step.complete === 'function', `${scenario.id} steps should be evaluable`);
  }
}

export function testBasicPnrScenarioProgressUsesStatePredicates() {
  const session = createProfessionalTerminalSession();
  let progress = evaluateScenario('basic-one-way-pnr', session);
  assert(progress.completedCount === 0 && progress.currentStep.id === 'availability', 'Basic scenario should begin with availability');
  run(session, 'AN17JUNMADAMS/IB');
  run(session, 'SS1Y1');
  run(session, 'NM1LOPEZ/LUCIA MS');
  run(session, 'AP MAD 611111111');
  run(session, 'TKOK');
  run(session, 'RF LUCIA');
  progress = evaluateScenario('basic-one-way-pnr', session);
  assert(progress.currentStep.id === 'commit', 'Any valid fictional passenger/contact should reach commit step');
  run(session, 'ER');
  progress = evaluateScenario('basic-one-way-pnr', session);
  assert(progress.complete && progress.completedCount === progress.totalSteps, 'Committed local PNR should complete scenario');
}

export function testServiceAndPricingScenariosEvaluateResultsNotExactInput() {
  const serviceSession = createProfessionalTerminalSession();
  run(serviceSession, 'SR WCHR/P1');
  let service = evaluateScenario('ssr-osi-quality', serviceSession);
  assert(service.completedCount === 1 && service.currentStep.id === 'osi', 'SSR state should complete first service step');
  run(serviceSession, 'OS IB TRAINING PASSENGER');
  service = evaluateScenario('ssr-osi-quality', serviceSession);
  assert(service.complete, 'Any stored SSR and OSI should complete quality scenario');

  const pricingSession = createProfessionalTerminalSession();
  run(pricingSession, 'AN17JUNMADAMS/IB');
  run(pricingSession, 'SS1Y1');
  run(pricingSession, 'FXX');
  let pricing = evaluateScenario('pricing-comparison', pricingSession);
  assert(pricing.currentStep.id === 'stored-fare', 'Successful informative result should advance without checking raw command text');
  run(pricingSession, 'FXP');
  run(pricingSession, 'FQN1');
  pricing = evaluateScenario('pricing-comparison', pricingSession);
  assert(pricing.complete, 'Stored fare plus successful rule result should complete pricing scenario');
}

export function testUnknownScenarioReturnsSafeEmptyEvaluation() {
  assert(getScenario('missing') === null, 'Unknown scenario lookup should return null');
  const result = evaluateScenario('missing', createProfessionalTerminalSession());
  assert(result.errorCode === 'SCENARIO_NOT_FOUND' && result.complete === false, 'Unknown scenario should not throw');
}

export function testTerminalStateRoundTripsWithoutAliasing() {
  const session = createProfessionalTerminalSession();
  run(session, 'AN17JUNMADAMS/IB');
  run(session, 'SS1Y1');
  const state = { session, mode: 'guided', selectedScenarioId: 'basic-one-way-pnr', scenarioProgress: { attempts: 2 } };
  const raw = serializeTerminalState(state);
  const restored = deserializeTerminalState(raw);
  assert(restored.mode === 'guided' && restored.selectedScenarioId === 'basic-one-way-pnr', 'UI state should round-trip');
  assert(restored.session.pnr.segments.length === 1 && restored.session.availability.rows.length === 10, 'Terminal session should round-trip');
  restored.session.pnr.segments[0].flight = 'MUTATED';
  assert(session.pnr.segments[0].flight !== 'MUTATED', 'Restored state should not alias source state');
}

export function testMalformedPersistenceFallsBackToFreshSafeState() {
  for (const raw of ['', '{bad', 'null', JSON.stringify({ version: 1 }), JSON.stringify({ version: 2, session: { pnr: {} } })]) {
    const restored = deserializeTerminalState(raw);
    assert(restored.mode === 'guided', 'Fallback should use guided mode');
    assert(restored.selectedScenarioId === 'basic-one-way-pnr', 'Fallback should select first scenario');
    assert(restored.session.pnr.status === 'EMPTY' && restored.session.records && restored.session.queue, 'Fallback should create a valid fresh session');
  }
}

export function testStorageAdapterSavesLoadsAndRecoversFromReadErrors() {
  const values = new Map();
  const storage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) ?? null; },
  };
  const state = { session: createProfessionalTerminalSession(), mode: 'free', selectedScenarioId: 'pricing-comparison', scenarioProgress: {} };
  saveTerminalState(storage, state);
  const loaded = loadTerminalState(storage);
  assert(loaded.mode === 'free' && loaded.selectedScenarioId === 'pricing-comparison', 'Storage adapter should load saved state');
  const brokenStorage = { getItem() { throw new Error('blocked'); } };
  assert(loadTerminalState(brokenStorage).session.pnr.status === 'EMPTY', 'Storage read errors should return fresh state');
}

