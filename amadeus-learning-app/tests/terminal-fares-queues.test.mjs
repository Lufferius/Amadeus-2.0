import { executeProfessionalCommand } from '../src/terminal/commandExecutor.mjs';
import { createProfessionalTerminalSession } from '../src/terminal/sessionState.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deep(value) {
  return JSON.stringify(value);
}

function addItinerary(session) {
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  executeProfessionalCommand(session, 'SS1Y1');
}

export function testPricingRequiresItineraryAndSeparatesInformativeFromStoredFare() {
  const empty = createProfessionalTerminalSession();
  for (const command of ['FXX', 'FXP']) {
    const result = executeProfessionalCommand(empty, command);
    assert(result.errorCode === 'NO_ITINERARY' && result.output === 'NO ITINERARY', `${command} should require itinerary`);
  }

  const session = createProfessionalTerminalSession();
  addItinerary(session);
  const pnrBeforeFxx = deep(session.pnr);
  const informative = executeProfessionalCommand(session, 'FXX');
  assert(informative.status === 'OK' && informative.output.includes('TOTAL EUR 231.60'), 'FXX should show deterministic total');
  assert(informative.output.includes('INFORMATIVE PRICING - NOT STORED'), 'FXX should identify informational pricing');
  assert(deep(session.pnr) === pnrBeforeFxx, 'FXX must not mutate or store fare in PNR');

  const stored = executeProfessionalCommand(session, 'FXP');
  assert(stored.status === 'OK' && stored.output.includes('FARE STORED IN TRAINING PNR'), 'FXP should show stored training fare');
  assert(session.pnr.storedFare?.totalCents === 23160, 'FXP should store deterministic integer-cents total');
  assert(session.pnr.storedFare?.fareBasis === 'YTRN', 'FXP should store fare basis');
  assert(session.pnr.dirty, 'Storing a fare should dirty the local PNR');
}

export function testStoredFareDisplayAndRuleDetailAreContextual() {
  const session = createProfessionalTerminalSession();
  assert(executeProfessionalCommand(session, 'TQT').errorCode === 'NO_STORED_FARE', 'TQT should explain missing stored fare');
  addItinerary(session);
  executeProfessionalCommand(session, 'FXP');
  const display = executeProfessionalCommand(session, 'TQT');
  assert(display.output.includes('TST 1') && display.output.includes('YTRN') && display.output.includes('EUR 231.60'), 'TQT should display stored TST-like fare');
  const rules = executeProfessionalCommand(session, 'FQN1');
  for (const text of ['CHANGES', 'CANCELLATIONS', 'NO-SHOW', 'TRAINING RULES']) assert(rules.output.includes(text), `FQN1 should include ${text}`);
  assert(executeProfessionalCommand(session, 'FQN9').errorCode === 'CHECK_RULE_NUMBER', 'Unknown rule should be rejected');
}

export function testQueueTotalsStartAndNextUseOnlyTrainingRecords() {
  const session = createProfessionalTerminalSession();
  const totals = executeProfessionalCommand(session, 'QT');
  assert(totals.output.includes('QUEUE 8') && totals.output.includes('2'), 'QT should show deterministic queue totals');
  assert(totals.output.includes('TRAINING QUEUES ONLY'), 'Queue totals should disclose simulation');
  const started = executeProfessionalCommand(session, 'QS8');
  assert(started.status === 'OK' && session.queue.activeNumber === 8 && session.queue.currentIndex === 0, 'QS8 should enter queue 8');
  assert(started.output.includes('TRN101'), 'First training queue item should be shown');
  assert(executeProfessionalCommand(session, 'QN').output.includes('TRN102'), 'QN should advance to second item');
  assert(executeProfessionalCommand(session, 'QN').output === 'QUEUE COMPLETE - TRAINING ONLY', 'QN should finish safely');
  assert(executeProfessionalCommand(createProfessionalTerminalSession(), 'QN').errorCode === 'NO_ACTIVE_QUEUE', 'QN should require active queue');
  assert(executeProfessionalCommand(createProfessionalTerminalSession(), 'QS99').errorCode === 'QUEUE_NOT_FOUND', 'Unknown queue should be rejected');
}

export function testFictionalProfileAndContextualHelpStayLocal() {
  const session = createProfessionalTerminalSession();
  const profile = executeProfessionalCommand(session, 'PDN/DEMO CORP');
  assert(profile.status === 'OK' && profile.output.includes('DEMO CORP'), 'Demo profile should be displayed');
  assert(profile.output.includes('FICTIONAL CORPORATE PROFILE'), 'Profile should be explicitly fictional');
  assert(profile.output.includes('POLICY') && profile.output.includes('PREFERRED'), 'Profile should include training policy fields');
  assert(executeProfessionalCommand(session, 'PDN/REAL CORP').errorCode === 'PROFILE_NOT_FOUND', 'Unknown profile should not be invented');
  const general = executeProfessionalCommand(session, 'HE');
  const pricing = executeProfessionalCommand(session, 'HE FXP');
  assert(general.output.includes('HELP TOPICS') && general.output.includes('FXP'), 'HE should list local help topics');
  assert(pricing.output.includes('FXP') && pricing.output.includes('stores a fictional fare'), 'HE FXP should explain the local command');
  assert(executeProfessionalCommand(session, 'HE UNKNOWN').errorCode === 'HELP_TOPIC_NOT_FOUND', 'Unknown help topic should be rejected');
}

export function testProhibitedTransactionsNeverMutateSession() {
  for (const command of ['TTP', 'TRF 123-4567890123', 'FP VI4111111111111111/1228']) {
    const session = createProfessionalTerminalSession();
    addItinerary(session);
    const before = deep(session);
    const result = executeProfessionalCommand(session, command);
    assert(result.type === 'PROHIBITED' && result.status === 'ERROR', `${command} should remain prohibited`);
    assert(result.errorCode === 'OPERATION_PROHIBITED', `${command} should expose safety error code`);
    assert(result.output === 'OPERATION NOT AVAILABLE IN TRAINING', `${command} should have exact safe output`);
    assert(deep(session) === before, `${command} must not mutate any session state`);
  }
}
