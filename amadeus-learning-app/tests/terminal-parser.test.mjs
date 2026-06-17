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
