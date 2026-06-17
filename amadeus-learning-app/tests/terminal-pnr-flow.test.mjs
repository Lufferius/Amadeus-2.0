import {
  commitPnr,
  createPnrWorkArea,
  createProfessionalTerminalSession,
  ignorePnr,
  missingRequiredElements,
  retrievePnr,
  touchPnr,
} from '../src/terminal/sessionState.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
}

function completePnr(pnr, name = 'GARCIA/ANA MS') {
  pnr.names.push(name);
  pnr.segments.push({ flight: 'TRN310' });
  pnr.contacts.push('MAD 600000000');
  pnr.ticketing = 'TKOK';
  pnr.receivedFrom = 'ANA';
  touchPnr(pnr);
}

export function testFreshProfessionalSessionHasExactEmptyPnrShape() {
  const expectedPnr = {
    status: 'EMPTY',
    locator: null,
    names: [],
    segments: [],
    contacts: [],
    ssrs: [],
    osis: [],
    remarks: [],
    ticketing: null,
    receivedFrom: null,
    storedFare: null,
    dirty: false,
  };
  const session = createProfessionalTerminalSession();

  assertDeepEqual(createPnrWorkArea(), expectedPnr, 'PNR factory should return the exact empty shape');
  assertDeepEqual(Object.keys(createPnrWorkArea()), Object.keys(expectedPnr), 'PNR work area should not include extra keys');
  assertDeepEqual(session.pnr, expectedPnr, 'A professional session should start with an empty PNR');
  assertDeepEqual(session.history, [], 'History should start empty');
  assertDeepEqual(session.transcript, [], 'Transcript should start empty');
  assert(session.activePractice === null, 'No practice should be active');
  assertDeepEqual(session.score, { correct: 0, total: 0 }, 'Score should match current session needs');
  assertDeepEqual(session.mistakes, [], 'Mistakes should start empty');
  assertDeepEqual(session.records, {}, 'Records should be a locator dictionary');
  assert(session.locatorCounter === 1, 'Locator counter should start at one');
  assert(session.availability === null, 'Availability should start inactive');
  assertDeepEqual(
    Object.keys(session),
    ['history', 'transcript', 'activePractice', 'score', 'mistakes', 'pnr', 'records', 'locatorCounter', 'availability', 'queue'],
    'Professional session should have the exact top-level key set',
  );
  assertDeepEqual(
    session.queue,
    { activeNumber: null, items: [], currentIndex: -1 },
    'Queue should have the exact initial shape chosen for later tasks',
  );
}

export function testTouchPnrTransitionsWorkingButPreservesRetrievedStatus() {
  const pnr = createPnrWorkArea();
  touchPnr(pnr);
  assert(pnr.status === 'WORKING' && pnr.dirty === true, 'Touching an empty PNR should make it dirty and working');

  pnr.status = 'RETRIEVED';
  pnr.dirty = false;
  assert(touchPnr(pnr) === pnr, 'Touch should return the same work area');
  assert(pnr.status === 'RETRIEVED' && pnr.dirty === true, 'Touching a retrieved PNR should preserve retrieved status');
}

export function testMissingRequiredElementsStayOrderedAndDisappearProgressively() {
  const pnr = createPnrWorkArea();
  assertDeepEqual(
    missingRequiredElements(pnr),
    ['NAME', 'SEGMENT', 'CONTACT', 'TICKETING', 'RECEIVED_FROM'],
    'All required elements should be reported in terminal order',
  );

  pnr.names.push('GARCIA/ANA MS');
  assertDeepEqual(missingRequiredElements(pnr), ['SEGMENT', 'CONTACT', 'TICKETING', 'RECEIVED_FROM'], 'Name should be removed');
  pnr.segments.push({ flight: 'TRN310' });
  assertDeepEqual(missingRequiredElements(pnr), ['CONTACT', 'TICKETING', 'RECEIVED_FROM'], 'Segment should be removed');
  pnr.contacts.push('MAD 600000000');
  assertDeepEqual(missingRequiredElements(pnr), ['TICKETING', 'RECEIVED_FROM'], 'Contact should be removed');
  pnr.ticketing = 'TKOK';
  assertDeepEqual(missingRequiredElements(pnr), ['RECEIVED_FROM'], 'Ticketing should be removed');
  pnr.receivedFrom = 'ANA';
  assertDeepEqual(missingRequiredElements(pnr), [], 'A complete PNR should have no missing elements');
}

export function testCommitRefusalDoesNotMutateRecordsOrCounter() {
  const session = createProfessionalTerminalSession();
  session.history.push('NM1GARCIA/ANA MS');
  const beforeCommit = JSON.parse(JSON.stringify(session));
  const result = commitPnr(session, { keepActive: true });

  assertDeepEqual(result, { ok: false, missing: ['NAME', 'SEGMENT', 'CONTACT', 'TICKETING', 'RECEIVED_FROM'] }, 'Invalid commit should explain missing fields');
  assertDeepEqual(session, beforeCommit, 'Invalid commit should not mutate any session state');
}

export function testRecommitReusesLocatorWithoutAdvancingCounter() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  commitPnr(session, { keepActive: true });
  const counterAfterFirstCommit = session.locatorCounter;

  session.pnr.remarks.push('UPDATED TRAINING RECORD');
  touchPnr(session.pnr);
  const recommitted = commitPnr(session, { keepActive: true });

  assert(recommitted.locator === 'TRN001', 'Recommit should reuse the existing locator');
  assert(session.locatorCounter === counterAfterFirstCommit, 'Recommit should not advance the locator counter');
  assertDeepEqual(Object.keys(session.records), ['TRN001'], 'Recommit should not create a second record key');
  assertDeepEqual(session.records.TRN001.remarks, ['UPDATED TRAINING RECORD'], 'Recommit should replace the saved snapshot');
}

export function testCommitAllocatesDeterministicLocatorsAndHonorsKeepActive() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  const kept = commitPnr(session, { keepActive: true });

  assert(kept.ok && kept.locator === 'TRN001', 'First commit should allocate TRN001');
  assert(session.locatorCounter === 2, 'First allocation should advance the counter');
  assert(session.pnr.status === 'COMMITTED' && session.pnr.dirty === false, 'Kept PNR should remain committed and clean');
  assert(session.pnr === kept.record, 'keepActive should return the retained active record');

  session.pnr = createPnrWorkArea();
  completePnr(session.pnr, 'LOPEZ/LUIS MR');
  const closed = commitPnr(session, { keepActive: false });

  assert(closed.ok && closed.locator === 'TRN002', 'Second commit should allocate TRN002');
  assert(closed.record.status === 'COMMITTED' && closed.record.dirty === false, 'Returned snapshot should be committed and clean');
  assertDeepEqual(session.pnr, createPnrWorkArea(), 'Closing commit should install a fresh empty work area');
}

export function testCommittedSnapshotsAreNotAliased() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  const result = commitPnr(session, { keepActive: true });

  session.pnr.names.push('MUTATED/ACTIVE');
  result.record.contacts.push('MUTATED/RETURN');
  assertDeepEqual(session.records.TRN001.names, ['GARCIA/ANA MS'], 'Stored names should not alias the active PNR');
  assertDeepEqual(session.records.TRN001.contacts, ['MAD 600000000'], 'Stored contacts should not alias the returned record');
}

export function testRetrieveKnownAndUnknownLocators() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  commitPnr(session, { keepActive: false });

  const known = retrievePnr(session, 'trn001');
  assert(known.ok && known.record === session.pnr, 'Known lowercase locator should retrieve into the work area');
  assert(session.pnr.status === 'RETRIEVED' && session.pnr.dirty === false, 'Retrieved PNR should be clean and retrieved');
  session.pnr.names.push('MUTATED/RETRIEVED');
  assertDeepEqual(session.records.TRN001.names, ['GARCIA/ANA MS'], 'Retrieved work area should not alias saved state');

  const beforeUnknown = session.pnr;
  const unknown = retrievePnr(session, 'missing');
  assertDeepEqual(unknown, { ok: false, errorCode: 'RECORD_LOCATOR_NOT_FOUND' }, 'Unknown locator should return a stable error');
  assert(session.pnr === beforeUnknown, 'Unknown retrieval should not mutate the active work area');
}

export function testIgnoreRestoresSavedRecordOrClearsUnsavedArea() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  commitPnr(session, { keepActive: true });
  session.pnr.names.push('UNSAVED/CHANGE');
  touchPnr(session.pnr);

  const restored = ignorePnr(session);
  assert(restored === session.pnr, 'Ignore should return the installed work area');
  assertDeepEqual(restored.names, ['GARCIA/ANA MS'], 'Ignore should restore the saved snapshot');
  assert(restored.dirty === false, 'Restored snapshot should be clean');
  assert(restored !== session.records.TRN001, 'Restored PNR should be a deep copy');

  session.pnr = createPnrWorkArea();
  session.pnr.names.push('UNSAVED/NEW');
  touchPnr(session.pnr);
  assertDeepEqual(ignorePnr(session), createPnrWorkArea(), 'Ignore should clear an unsaved new work area');
}

export function testIgnoreRetrievedEditRestoresCommittedSnapshot() {
  const session = createProfessionalTerminalSession();
  completePnr(session.pnr);
  commitPnr(session, { keepActive: false });
  const savedSnapshot = JSON.parse(JSON.stringify(session.records.TRN001));

  retrievePnr(session, 'TRN001');
  session.pnr.names.push('UNSAVED/RETRIEVED');
  touchPnr(session.pnr);
  const restored = ignorePnr(session);

  assertDeepEqual(restored, savedSnapshot, 'Ignore should restore the complete saved snapshot after a retrieved edit');
  assert(restored.status === 'COMMITTED', 'Ignore should restore the saved committed status');
  assert(restored.dirty === false, 'Ignore should clear dirty state after restoring a retrieved record');
}
