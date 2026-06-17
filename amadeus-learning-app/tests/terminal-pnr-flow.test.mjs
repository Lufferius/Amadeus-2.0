import {
  commitPnr,
  createPnrWorkArea,
  createProfessionalTerminalSession,
  ignorePnr,
  missingRequiredElements,
  retrievePnr,
  touchPnr,
} from '../src/terminal/sessionState.mjs';
import { executeProfessionalCommand } from '../src/terminal/commandExecutor.mjs';
import * as availabilityFixtures from '../src/terminal/fixtures.mjs';
import { formatPnr } from '../src/terminal/formatters.mjs';

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

export function testAvailabilityCreatesTenSimulatedFilteredRowsAndFirstPage() {
  const session = createProfessionalTerminalSession();
  const result = executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  const outputLines = result.output.split('\n');
  const rowLines = outputLines.filter((line) => /^\s+\d+\s+[A-Z0-9]{2}\d{4}\s+/.test(line));
  const firstRow = session.availability.rows[0];

  assert(result.status === 'OK' && result.type === 'CRYPTIC_AVAILABILITY', 'Availability should execute successfully');
  assert(session.availability.rows.length === 10, 'MAD-AMS should contain exactly ten rows');
  assert(session.availability.rows.every((row) => row.simulated === true), 'Every row should be explicitly simulated');
  assert(session.availability.rows.every((row) => row.airline === 'IB'), 'The airline filter should apply to every row');
  assertDeepEqual(session.availability.query, {
    date: '17JUN', origin: 'MAD', destination: 'AMS', airlineCode: 'IB',
  }, 'Availability should preserve its parsed query');
  assert(outputLines[0] === 'AVAILABILITY 17JUN MAD-AMS /IB', 'Header should include date, route, and carrier');
  assert(outputLines[1] === 'SIMULATED AVAILABILITY - NO LIVE INVENTORY', 'Output should carry the exact simulation marker');
  assert(result.output.includes('PAGE 1/2'), 'First response should show page one of two');
  assert(rowLines.length === 6, 'First page should contain exactly six actual row lines');
  assert(/^\s+1\s+/.test(rowLines[0]) && /^\s+6\s+/.test(rowLines[5]), 'First page should include stable lines one through six');
  assert(rowLines[0].includes(firstRow.classes), 'A row should display representative class inventory');
  assert(rowLines[0].includes(`${firstRow.departure}-${firstRow.arrival}`), 'A row should display departure and arrival');
  assert(rowLines[0].includes('NONSTOP'), 'A row should display its stop representation');
}

export function testCanonicalAvailabilityCannotBeMutatedThroughPublicResultsOrExports() {
  const query = { date: '17JUN', origin: 'MAD', destination: 'AMS', airlineCode: 'IB' };
  const pristine = availabilityFixtures.generateAvailabilityRows(query);
  const returnedRows = availabilityFixtures.generateAvailabilityRows(query);
  returnedRows[0].flight = 'MUTATED';
  returnedRows.push({ line: 99 });

  assertDeepEqual(
    availabilityFixtures.generateAvailabilityRows(query),
    pristine,
    'Mutating one returned result should not affect later generated results',
  );

  const exportedCanonical = availabilityFixtures.MAD_AMS_AVAILABILITY;
  let externalMutationLeaked = false;
  if (exportedCanonical) {
    const originalFlight = exportedCanonical[0].flight;
    try {
      exportedCanonical[0].flight = 'EXTERNAL_MUTATION';
      const session = createProfessionalTerminalSession();
      executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
      externalMutationLeaked = session.availability.rows[0].flight === 'EXTERNAL_MUTATION';
    } finally {
      exportedCanonical[0].flight = originalFlight;
    }
  }

  assert(!externalMutationLeaked, 'External canonical mutation should not alter generated availability');
  assert(!Object.hasOwn(availabilityFixtures, 'MAD_AMS_AVAILABILITY'), 'Canonical fixture should not be publicly exported');
  assertDeepEqual(Object.keys(availabilityFixtures), ['generateAvailabilityRows'], 'Only the cloning generator should be public');
}

export function testAvailabilityMovementUsesOverlappingClampedPages() {
  const session = createProfessionalTerminalSession();
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');

  const down = executeProfessionalCommand(session, 'MD');
  assert(session.availability.offset === 4, 'Down should clamp to the final full page offset');
  assert(down.output.includes('PAGE 2/2'), 'Down should show page two');
  assert(down.output.includes(' 5 ') && down.output.includes(' 10 '), 'Final page should contain stable lines five through ten');
  assert(executeProfessionalCommand(session, 'MD').output === down.output, 'Repeated down should remain clamped');

  executeProfessionalCommand(session, 'MU');
  assert(session.availability.offset === 0, 'Up should return to zero');
  executeProfessionalCommand(session, 'MB');
  assert(session.availability.offset === 4, 'Bottom should use rows minus page size');
  executeProfessionalCommand(session, 'MT');
  assert(session.availability.offset === 0, 'Top should return to zero');
}

export function testAvailabilityMovementIsSymmetricAcrossFourLogicalPages() {
  const session = createProfessionalTerminalSession();
  const query = { date: '03DEC', origin: 'LIS', destination: 'FRA', airlineCode: undefined };
  const baseRows = availabilityFixtures.generateAvailabilityRows(query);
  const rows = [...baseRows, ...baseRows.map((row) => ({ ...row, line: row.line + 10 }))];
  session.availability = { rows, offset: 0, pageSize: 6, query };

  assert(executeProfessionalCommand(session, 'MD').output.includes('PAGE 2/4'), 'First down should show page two');
  assert(session.availability.offset === 6, 'First down should move to offset six');
  assert(executeProfessionalCommand(session, 'MD').output.includes('PAGE 3/4'), 'Second down should show page three');
  assert(session.availability.offset === 12, 'Second down should move to offset twelve');
  assert(executeProfessionalCommand(session, 'MD').output.includes('PAGE 4/4'), 'Bottom clamp should show page four');
  assert(session.availability.offset === 14, 'Third down should clamp to offset fourteen');

  assert(executeProfessionalCommand(session, 'MU').output.includes('PAGE 3/4'), 'Up from bottom clamp should show page three');
  assert(session.availability.offset === 12, 'Up from offset fourteen should return to offset twelve');
  executeProfessionalCommand(session, 'MU');
  assert(session.availability.offset === 6, 'Next up should return to offset six');
  executeProfessionalCommand(session, 'MU');
  assert(session.availability.offset === 0, 'Final up should return to offset zero');

  assert(executeProfessionalCommand(session, 'MB').output.includes('PAGE 4/4'), 'Bottom should show the final logical page');
  assert(session.availability.offset === 14, 'Bottom should use the final full-window offset');
  assert(executeProfessionalCommand(session, 'MU').output.includes('PAGE 3/4'), 'Up after bottom should show page three');
  assert(session.availability.offset === 12, 'Up after bottom should return to offset twelve');
}

export function testAvailabilityDetailUsesStableLineAcrossPages() {
  const session = createProfessionalTerminalSession();
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  executeProfessionalCommand(session, 'MD');

  const detail = executeProfessionalCommand(session, 'DO1');
  const firstRow = session.availability.rows[0];
  assert(detail.status === 'OK' && detail.output.includes(firstRow.flight), 'DO1 should find original line one off-page');
  assert(detail.output.includes(firstRow.classes), 'Detail should include class inventory');
  assert(detail.output.includes(`${firstRow.departure}-${firstRow.arrival}`), 'Detail should include departure and arrival');
  assert(detail.output.includes(`EQUIPMENT ${firstRow.equipment}`), 'Detail should include equipment');
  assert(detail.output.includes(`DURATION ${firstRow.duration}`), 'Detail should include duration');
  assert(detail.output.includes('STOPS: NONSTOP'), 'Detail should represent a nonstop flight');
  assert(detail.output.includes('ROUTE MAD-AMS 17JUN'), 'Detail should include route and date');
  assert(detail.output.includes('TRAINING / SIMULATED - NO LIVE INVENTORY'), 'Detail should include the training marker');

  const connectingRow = session.availability.rows.find((row) => row.via);
  const connectingDetail = executeProfessionalCommand(session, `DO${connectingRow.line}`);
  assert(connectingDetail.output.includes(`STOPS: ${connectingRow.stops} VIA ${connectingRow.via}`), 'Detail should include stops and via point');

  const missing = executeProfessionalCommand(session, 'DO99');
  assert(missing.status === 'ERROR' && missing.errorCode === 'CHECK_LINE_NUMBER', 'Unknown line should have a stable error code');
  assert(missing.output === 'CHECK LINE NUMBER', 'Unknown line should have exact output');
}

export function testAvailabilityCommandsWithoutContextDoNotMutatePnr() {
  for (const input of ['MD', 'DO1']) {
    const session = createProfessionalTerminalSession();
    completePnr(session.pnr);
    const pnrBefore = JSON.parse(JSON.stringify(session.pnr));
    const result = executeProfessionalCommand(session, input);

    assert(result.status === 'ERROR' && result.errorCode === 'NO_AVAILABILITY_ACTIVE', `${input} should report missing availability`);
    assert(result.output === 'NO AVAILABILITY ACTIVE', `${input} should use the exact missing-context output`);
    assertDeepEqual(session.pnr, pnrBefore, `${input} should not mutate the PNR`);
  }
}

export function testGeneratedAvailabilityIsDeterministicWithoutNetwork() {
  const first = createProfessionalTerminalSession();
  const second = createProfessionalTerminalSession();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  try {
    globalThis.fetch = () => {
      fetchCalls += 1;
      throw new Error('Network access is forbidden in deterministic availability');
    };
    availabilityFixtures.generateAvailabilityRows({ date: '03DEC', origin: 'LIS', destination: 'FRA' });
    executeProfessionalCommand(first, 'AN03DECLISFRA');
    executeProfessionalCommand(second, 'AN03DECLISFRA');
  } finally {
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }

  assert(fetchCalls === 0, 'Fixture generation and execution should make zero fetch calls');
  assertDeepEqual(first.availability.rows, second.availability.rows, 'Generated route rows should be deterministic across sessions');
  assert(first.availability.rows.length === 10, 'Generated routes should also return ten rows');
  assert(first.availability.rows.every((row) => row.origin === 'LIS' && row.destination === 'FRA'), 'Generated rows should use the query route');
}

export function testProfessionalCommandResultSchemaHasNoUndefinedOutputLines() {
  const session = createProfessionalTerminalSession();
  const notImplemented = executeProfessionalCommand(session, 'HELP');
  const success = executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  const error = executeProfessionalCommand(session, 'DO99');
  const results = [success, error, notImplemented];

  for (const result of results) {
    const stringKeys = ['type', 'input', 'output', 'explanation', 'disclaimer', 'status'];
    for (const key of [...stringKeys, 'safeMode']) {
      assert(Object.hasOwn(result, key), `Result should define ${key}`);
      assert(result[key] !== undefined && result[key] !== null, `Result ${key} should not be undefined or null`);
    }
    for (const key of stringKeys) assert(typeof result[key] === 'string', `Result ${key} should be a string`);
    assert(typeof result.safeMode === 'boolean' && result.safeMode === true, 'Every executor result should remain in safe mode');
    assert(['OK', 'ERROR', 'NOT_IMPLEMENTED'].includes(result.status), 'Status should use the defined result vocabulary');
    assert(result.output.split('\n').every((line) => typeof line === 'string'), 'Every output line should be a string');
    assert(!result.output.split('\n').includes('undefined'), 'Output should contain no undefined lines');
  }

  assert(success.status === 'OK', 'Availability should exercise the success schema');
  assert(error.status === 'ERROR' && typeof error.errorCode === 'string', 'Missing detail should exercise the error schema');
  assert(notImplemented.status === 'NOT_IMPLEMENTED', 'Unhandled parsed commands should exercise the not-implemented schema');
}

function buildCompleteProfessionalPnr(session) {
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  executeProfessionalCommand(session, 'SS1Y1');
  executeProfessionalCommand(session, 'NM1GARCIA/ANA MS');
  executeProfessionalCommand(session, 'AP MAD 600000000');
  executeProfessionalCommand(session, 'TKOK');
  executeProfessionalCommand(session, 'RF ANA');
}

export function testProfessionalSellRequiresValidAvailabilityLineClassAndQuantity() {
  const noContext = createProfessionalTerminalSession();
  const noAvailability = executeProfessionalCommand(noContext, 'SS1Y1');
  assert(noAvailability.errorCode === 'NO_AVAILABILITY_ACTIVE', 'Sell should require active availability');

  const session = createProfessionalTerminalSession();
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  const availabilityBefore = JSON.stringify(session.availability);
  const sold = executeProfessionalCommand(session, 'SS1Y1');
  assert(sold.status === 'OK', 'Valid sell should succeed');
  assert(session.pnr.segments.length === 1, 'Valid sell should add one segment');
  assert(session.pnr.segments[0].classCode === 'Y', 'Sold segment should retain booking class');
  assert(session.pnr.segments[0].quantity === 1 && session.pnr.segments[0].status === 'HK', 'Sold segment should have quantity and HK status');
  assert(session.pnr.status === 'WORKING' && session.pnr.dirty, 'Sell should touch the PNR');
  assert(JSON.stringify(session.availability) === availabilityBefore, 'Training sell must not reduce availability inventory');

  assert(executeProfessionalCommand(session, 'SS1Y99').errorCode === 'CHECK_LINE_NUMBER', 'Unknown line should be rejected');
  assert(executeProfessionalCommand(session, 'SS1Z1').errorCode === 'CLASS_NOT_AVAILABLE', 'Unknown class should be rejected');
  assert(executeProfessionalCommand(session, 'SS9D1').errorCode === 'CLASS_NOT_AVAILABLE', 'Quantity above displayed seats should be rejected');
}

export function testProfessionalPnrElementsAreStoredAndRendered() {
  const session = createProfessionalTerminalSession();
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  executeProfessionalCommand(session, 'SS1Y1');
  executeProfessionalCommand(session, 'SS1B2');
  executeProfessionalCommand(session, 'NM1GARCIA/ANA MS');
  executeProfessionalCommand(session, 'AP MAD 600000000');
  executeProfessionalCommand(session, 'TKOK');
  executeProfessionalCommand(session, 'RF ANA');
  executeProfessionalCommand(session, 'SR WCHR/P1');
  executeProfessionalCommand(session, 'OS IB TRAINING PASSENGER');
  executeProfessionalCommand(session, 'RM TRAINING ONLY');

  assertDeepEqual(session.pnr.names, ['GARCIA/ANA MS'], 'Name should be stored');
  assertDeepEqual(session.pnr.contacts, ['MAD 600000000'], 'Contact should be stored');
  assert(session.pnr.ticketing === 'TKOK' && session.pnr.receivedFrom === 'ANA', 'Ticketing and received-from should be stored');
  assertDeepEqual(session.pnr.ssrs, ['WCHR/P1'], 'SSR should preserve full descriptor');
  assertDeepEqual(session.pnr.osis, [{ carrier: 'IB', text: 'TRAINING PASSENGER' }], 'OSI should preserve carrier and text');
  assertDeepEqual(session.pnr.remarks, ['TRAINING ONLY'], 'Remark should be stored');

  const display = formatPnr(session.pnr);
  for (const expected of ['ACTIVE TRAINING PNR', 'GARCIA/ANA MS', 'IB', 'AP MAD 600000000', 'TK TKOK', 'SR WCHR/P1', 'OS IB TRAINING PASSENGER', 'RM TRAINING ONLY', 'RF ANA', 'TRAINING RECORD - NO REAL BOOKING OR TICKET']) {
    assert(display.includes(expected), `PNR display should include ${expected}`);
  }
  assert(!display.includes('undefined'), 'PNR display must never include undefined');

  const cancelled = executeProfessionalCommand(session, 'XE1');
  assert(cancelled.status === 'OK' && session.pnr.segments.length === 1, 'XE1 should cancel the first itinerary segment');
  assert(formatPnr(session.pnr).includes(' 1 '), 'Remaining itinerary should be renumbered to one');
  assert(executeProfessionalCommand(session, 'XE9').errorCode === 'CHECK_ELEMENT_NUMBER', 'Unknown itinerary element should be rejected');
}

export function testProfessionalEndReportsMissingElementsInOrderThenCommits() {
  const session = createProfessionalTerminalSession();
  const expected = [
    ['ER', 'NEED_NAME', 'NEED NAME'],
  ];
  for (const [input, code, output] of expected) {
    const result = executeProfessionalCommand(session, input);
    assert(result.errorCode === code && result.output === output, `${input} should report ${output}`);
  }

  executeProfessionalCommand(session, 'NM1GARCIA/ANA MS');
  assert(executeProfessionalCommand(session, 'ER').errorCode === 'NEED_ITINERARY', 'Segment should be required second');
  executeProfessionalCommand(session, 'AN17JUNMADAMS/IB');
  executeProfessionalCommand(session, 'SS1Y1');
  assert(executeProfessionalCommand(session, 'ER').errorCode === 'NEED_CONTACT_ELEMENT', 'Contact should be required third');
  executeProfessionalCommand(session, 'AP MAD 600000000');
  assert(executeProfessionalCommand(session, 'ER').errorCode === 'NEED_TICKETING_ARRANGEMENT', 'Ticketing should be required fourth');
  executeProfessionalCommand(session, 'TKOK');
  assert(executeProfessionalCommand(session, 'ER').errorCode === 'NEED_RECEIVED_FROM', 'Received from should be required last');
  assertDeepEqual(session.records, {}, 'Incomplete PNR must not be committed');

  executeProfessionalCommand(session, 'RF ANA');
  const committed = executeProfessionalCommand(session, 'ER');
  assert(committed.status === 'OK' && committed.output.includes('TRN001'), 'ER should commit and display TRN001');
  assert(session.pnr.status === 'COMMITTED' && !session.pnr.dirty, 'ER should retain a clean committed PNR');
  assert(Boolean(session.records.TRN001), 'ER should store the training record');
}

export function testProfessionalRetrieveIgnoreAndEndTransactionLifecycle() {
  const session = createProfessionalTerminalSession();
  assert(executeProfessionalCommand(session, 'RT').errorCode === 'NO_ACTIVE_PNR', 'RT without active PNR should fail clearly');
  buildCompleteProfessionalPnr(session);
  const ended = executeProfessionalCommand(session, 'ET');
  assert(ended.status === 'OK' && ended.output.includes('END OF TRANSACTION'), 'ET should confirm end of transaction');
  assertDeepEqual(session.pnr, createPnrWorkArea(), 'ET should clear the active work area');
  assert(Boolean(session.records.TRN001), 'ET should retain committed record');

  const beforeMissing = JSON.stringify(session.pnr);
  const missing = executeProfessionalCommand(session, 'RT TRN999');
  assert(missing.errorCode === 'RECORD_LOCATOR_NOT_FOUND', 'Unknown locator should use stable error');
  assert(JSON.stringify(session.pnr) === beforeMissing, 'Unknown retrieval should not mutate active PNR');

  const retrieved = executeProfessionalCommand(session, 'RT TRN001');
  assert(retrieved.status === 'OK' && session.pnr.status === 'RETRIEVED', 'Known locator should be retrieved');
  executeProfessionalCommand(session, 'RM UNSAVED CHANGE');
  assert(session.pnr.dirty, 'Edit to retrieved PNR should be dirty');
  const ignored = executeProfessionalCommand(session, 'IG');
  assert(ignored.output.includes('WORK AREA RESTORED'), 'IG should restore a saved record');
  assert(!session.pnr.remarks.includes('UNSAVED CHANGE') && !session.pnr.dirty, 'IG should discard unsaved retrieved edit');

  session.pnr = createPnrWorkArea();
  executeProfessionalCommand(session, 'NM1UNSAVED/DEMO MS');
  const cleared = executeProfessionalCommand(session, 'IG');
  assert(cleared.output === 'IGNORED - WORK AREA CLEARED', 'IG should clear a new unsaved work area');
  assertDeepEqual(session.pnr, createPnrWorkArea(), 'New work area should return to exact empty state');
}
