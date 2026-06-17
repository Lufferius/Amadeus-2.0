import {
  createTerminalSession,
  getAutocompleteSuggestions,
  parseTerminalCommand,
  runTerminalCommand,
} from '../src/terminalSimulator.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function testParserRecognisesSupportedCommands() {
  const commands = [
    ['HELP', 'HELP'],
    ['GLOSSARY PNR', 'GLOSSARY'],
    ['SHOW SAMPLE_PNR', 'SHOW_SAMPLE_PNR'],
    ['SHOW AVAILABILITY MAD AMS', 'SHOW_AVAILABILITY'],
    ['SHOW FARE_RULE BASIC', 'SHOW_FARE_RULE'],
    ['SHOW FARE_RULE FLEX', 'SHOW_FARE_RULE'],
    ['AIRLINE IB', 'REFERENCE_AIRLINE'],
    ['AIRPORT MAD', 'REFERENCE_AIRPORT'],
    ['TRAIN AVE', 'REFERENCE_TRAIN'],
    ['HOTEL MELIA', 'REFERENCE_HOTEL'],
    ['SHOW HOTELS MAD', 'SHOW_HOTELS'],
    ['SHOW TRAINS MAD BCN', 'SHOW_TRAINS'],
    ['SHOW AVAILABILITY MAD AMS IB', 'SHOW_AVAILABILITY'],
    ['AN17JUNMADAMS/IB', 'CRYPTIC_AVAILABILITY'],
    ['SS1Y1', 'CRYPTIC_SELL_SEGMENT'],
    ['NM1GARCIA/ANA MS', 'CRYPTIC_NAME'],
    ['AP MAD 600000000', 'CRYPTIC_CONTACT'],
    ['TKOK', 'CRYPTIC_TICKETING'],
    ['RF ANA', 'CRYPTIC_RECEIVED_FROM'],
    ['RT', 'CRYPTIC_RETRIEVE_PNR'],
    ['PRACTICE SEGMENTS', 'PRACTICE'],
    ['PRACTICE SSR_OSI', 'PRACTICE'],
    ['PRACTICE FARES', 'PRACTICE'],
    ['RESET', 'RESET'],
  ];

  for (const [input, expectedType] of commands) {
    const parsed = parseTerminalCommand(input);
    assert(parsed.type === expectedType, `${input}: expected ${expectedType}, got ${parsed.type}`);
  }
}

export function testCrypticTrainingFlowBuildsLocalFictionalPnr() {
  const session = createTerminalSession();

  const availability = runTerminalCommand(session, 'AN17JUNMADAMS/IB');
  assert(availability.type === 'CRYPTIC_AVAILABILITY', 'Cryptic availability should be recognised');
  assert(availability.output.some((line) => line.includes('IB310')), 'Cryptic availability should show realistic IB options');

  const sell = runTerminalCommand(session, 'SS1Y1');
  assert(sell.output.some((line) => line.includes('segmento 1')), 'Sell should add selected simulated segment');

  runTerminalCommand(session, 'NM1GARCIA/ANA MS');
  runTerminalCommand(session, 'AP MAD 600000000');
  runTerminalCommand(session, 'TKOK');
  runTerminalCommand(session, 'RF ANA');
  const pnr = runTerminalCommand(session, 'RT');

  assert(pnr.type === 'CRYPTIC_RETRIEVE_PNR', 'RT should retrieve the training PNR');
  assert(pnr.output.some((line) => line.includes('GARCIA/ANA MS')), 'PNR should include passenger name');
  assert(pnr.output.some((line) => line.includes('IB310')), 'PNR should include sold segment');
  assert(pnr.output.some((line) => line.includes('TKOK')), 'PNR should include ticketing marker');
}

export function testParserRejectsUnsupportedOrUnsafeCommands() {
  const parsed = parseTerminalCommand('SELL FLIGHT MAD AMS');

  assert(parsed.type === 'UNKNOWN', 'Unsupported commands should be unknown');
  assert(parsed.safe === false, 'Unsupported commands should be marked unsafe for the simulator');
  assert(parsed.message.includes('simulador'), 'Unknown command should explain simulator limits');
}

export function testAutocompleteReturnsCommandSuggestions() {
  const suggestions = getAutocompleteSuggestions('SHOW F');

  assert(suggestions.includes('SHOW FARE_RULE BASIC'), 'Autocomplete should suggest BASIC fare rule');
  assert(suggestions.includes('SHOW FARE_RULE FLEX'), 'Autocomplete should suggest FLEX fare rule');

  const referenceSuggestions = getAutocompleteSuggestions('AIR');
  assert(referenceSuggestions.includes('AIRLINE IB'), 'Autocomplete should suggest real airline code references');
}

export function testReferenceCommandsReturnStaticRealCodesWithoutExternalConnection() {
  const session = createTerminalSession();

  const airline = runTerminalCommand(session, 'AIRLINE IB');
  assert(airline.output.some((line) => line.includes('Iberia')), 'AIRLINE IB should identify Iberia');
  assert(airline.explanation.includes('referencia estatica'), 'Reference command should disclose static data');

  const airport = runTerminalCommand(session, 'AIRPORT MAD');
  assert(airport.output.some((line) => line.includes('Madrid')), 'AIRPORT MAD should identify Madrid');

  const hotel = runTerminalCommand(session, 'SHOW HOTELS MAD');
  assert(hotel.output.some((line) => line.includes('Melia')), 'SHOW HOTELS MAD should include realistic hotel chain examples');
  assert(hotel.output.every((line) => !line.includes('confirmada')), 'Hotel output should not imply real confirmed inventory');
}

export function testAvailabilityAcceptsOptionalRealAirlineCode() {
  const session = createTerminalSession();
  const result = runTerminalCommand(session, 'SHOW AVAILABILITY MAD AMS IB');

  assert(result.type === 'SHOW_AVAILABILITY', 'Availability with airline code should be supported');
  assert(result.output.some((line) => line.includes('IB')), 'Availability output should include the airline code');
  assert(result.explanation.includes('simulada'), 'Availability must remain simulated');
}

export function testPracticeScoringAndMistakeLog() {
  const session = createTerminalSession();

  const start = runTerminalCommand(session, 'PRACTICE SEGMENTS');
  assert(start.practice?.active === true, 'Practice should start an active prompt');
  assert(start.score.total === 0, 'Starting practice should not score yet');

  const wrong = runTerminalCommand(session, '2');
  assert(wrong.score.total === 1, 'Practice answer should count as one attempt');
  assert(wrong.score.correct === 0, 'Wrong practice answer should not count as correct');
  assert(session.mistakes.length === 1, 'Wrong answer should be logged');
  assert(session.mistakes[0].input === '2', 'Mistake log should include learner answer');
  assert(wrong.explanation.includes('respuesta correcta'), 'Wrong practice answer should include explanation');

  runTerminalCommand(session, 'PRACTICE SEGMENTS');
  const right = runTerminalCommand(session, '3');
  assert(right.score.total === 2, 'Second practice answer should count');
  assert(right.score.correct === 1, 'Correct practice answer should increase score');
}

export function testResetClearsHistoryScoreAndMistakes() {
  const session = createTerminalSession();

  runTerminalCommand(session, 'HELP');
  runTerminalCommand(session, 'PRACTICE FARES');
  runTerminalCommand(session, 'A');
  assert(session.history.length > 0, 'History should include commands before reset');
  assert(session.mistakes.length > 0, 'Mistakes should exist before reset');

  const result = runTerminalCommand(session, 'RESET');

  assert(result.type === 'RESET', 'Reset should return RESET type');
  assert(session.history.length === 0, 'Reset should clear command history');
  assert(session.mistakes.length === 0, 'Reset should clear mistakes');
  assert(session.score.total === 0 && session.score.correct === 0, 'Reset should clear score');
}
