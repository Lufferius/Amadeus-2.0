function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createPnrWorkArea() {
  return {
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
}

export function createProfessionalTerminalSession() {
  return {
    history: [],
    transcript: [],
    activePractice: null,
    score: { correct: 0, total: 0 },
    mistakes: [],
    pnr: createPnrWorkArea(),
    records: {},
    locatorCounter: 1,
    availability: null,
    queue: {
      activeNumber: null,
      items: [],
      currentIndex: -1,
    },
  };
}

export function touchPnr(pnr) {
  pnr.dirty = true;
  if (pnr.status !== 'RETRIEVED') {
    pnr.status = 'WORKING';
  }
  return pnr;
}

export function missingRequiredElements(pnr) {
  return [
    !pnr.names.length && 'NAME',
    !pnr.segments.length && 'SEGMENT',
    !pnr.contacts.length && 'CONTACT',
    !pnr.ticketing && 'TICKETING',
    !pnr.receivedFrom && 'RECEIVED_FROM',
  ].filter(Boolean);
}

export function commitPnr(session, { keepActive }) {
  const missing = missingRequiredElements(session.pnr);
  if (missing.length > 0) {
    return { ok: false, missing };
  }

  if (!session.pnr.locator) {
    session.pnr.locator = `TRN${String(session.locatorCounter).padStart(3, '0')}`;
    session.locatorCounter += 1;
  }

  session.pnr.status = 'COMMITTED';
  session.pnr.dirty = false;
  const record = session.pnr;
  session.records[record.locator] = clone(record);

  if (!keepActive) {
    session.pnr = createPnrWorkArea();
  }

  return { ok: true, locator: record.locator, record };
}

export function ignorePnr(session) {
  const saved = session.pnr.locator && session.records[session.pnr.locator];
  if (saved) {
    session.pnr = clone(saved);
    session.pnr.dirty = false;
  } else {
    session.pnr = createPnrWorkArea();
  }

  return session.pnr;
}

export function retrievePnr(session, locator) {
  const normalizedLocator = locator.toUpperCase();
  const saved = session.records[normalizedLocator];
  if (!saved) {
    return { ok: false, errorCode: 'RECORD_LOCATOR_NOT_FOUND' };
  }

  session.pnr = clone(saved);
  session.pnr.status = 'RETRIEVED';
  session.pnr.dirty = false;
  return { ok: true, record: session.pnr };
}
