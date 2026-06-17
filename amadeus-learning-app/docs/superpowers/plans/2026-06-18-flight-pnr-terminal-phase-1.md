# Flight and PNR Terminal Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first professional-training phase: a deterministic local terminal where learners can navigate flight availability and construct, validate, commit, retrieve, price, and review fictional PNRs.

**Architecture:** Split the current monolithic simulator into focused parser, state, formatter, scenario, and persistence modules while preserving the public terminal API used by lessons. All commands operate on deterministic in-memory fixtures and return structured results; the UI renders those results in guided or free mode.

**Tech Stack:** Browser ES modules, vanilla JavaScript, JSON curriculum data, localStorage, Node.js custom test runner, static local server.

---

## File Map

- Create `src/terminal/commandParser.mjs`: normalize and parse cryptic training commands.
- Create `src/terminal/sessionState.mjs`: session and PNR factories, snapshots, required-element validation.
- Create `src/terminal/fixtures.mjs`: deterministic fictional availability, fares, queues, and profiles.
- Create `src/terminal/formatters.mjs`: cryptic-style output formatting.
- Create `src/terminal/commandExecutor.mjs`: contextual validation and local state transitions.
- Create `src/terminal/scenarios.mjs`: guided scenario definitions and progress evaluation.
- Create `src/terminal/persistence.mjs`: serialize and restore safe terminal state.
- Modify `src/terminalSimulator.mjs`: compatibility facade over the new modules.
- Modify `src/app.js`: guided/free mode, scenario panel, persistence, and reset confirmation.
- Modify `src/styles.css`: stable terminal controls and responsive scenario layout.
- Modify `tests/terminal-parser.test.mjs`: parser coverage for the expanded catalog.
- Create `tests/terminal-pnr-flow.test.mjs`: PNR state-transition tests.
- Create `tests/terminal-fares-queues.test.mjs`: fares, help, queues, profile, and prohibited-action tests.
- Create `tests/terminal-scenarios.test.mjs`: scenario and persistence tests.
- Modify `tests/run-tests.mjs`: register new suites.
- Modify `docs/terminal-simulator-spec.md`: document supported Phase 1 behavior.

### Task 1: Extract the command parser

**Files:**
- Create: `src/terminal/commandParser.mjs`
- Modify: `src/terminalSimulator.mjs`
- Modify: `tests/terminal-parser.test.mjs`

- [ ] **Step 1: Write failing parser tests**

Add table cases for `MD`, `MU`, `MB`, `MT`, `DO1`, `XE1`, `SR WCHR`, `SR VGML`, `OS IB TRAINING NOTE`, `RM TRAINING NOTE`, `ER`, `ET`, `IG`, `FXP`, `FXX`, `FQN1`, `TQT`, `QT`, `QS8`, `QN`, `PDN/DEMO CORP`, `HE`, and `HE FXP`. Assert exact types such as `AVAILABILITY_MOVE`, `PNR_END_RETRIEVE`, and `FARE_PRICE_STORE`.

- [ ] **Step 2: Run the suite and verify RED**

Run: `node tests/run-tests.mjs`

Expected: parser assertions fail because the command types are currently `UNKNOWN`.

- [ ] **Step 3: Implement the parser module**

Export `normalizeCommand(input)` and `parseCommand(input)`. Use anchored regular expressions and return `{ type, args, safe: true }`. Return `PROHIBITED` for `TTP`, `TRF`, payment-card patterns, and production-like refund/reissue commands; return `UNKNOWN` for unsupported input.

```js
const exact = new Map([
  ['MD', ['AVAILABILITY_MOVE', ['DOWN']]],
  ['ER', ['PNR_END_RETRIEVE', []]],
  ['FXP', ['FARE_PRICE_STORE', []]],
]);

export function parseCommand(input = '') {
  const normalized = normalizeCommand(input);
  const match = exact.get(normalized);
  if (match) return { type: match[0], args: match[1], safe: true };
  // Continue with anchored parameterized patterns.
}
```

- [ ] **Step 4: Re-export through the compatibility facade**

Make `parseTerminalCommand` delegate to `parseCommand` so existing lesson and UI imports remain unchanged.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: all parser tests pass and the pre-existing suites remain green.

- [ ] **Step 6: Commit**

```powershell
git add src/terminal/commandParser.mjs src/terminalSimulator.mjs tests/terminal-parser.test.mjs
git commit -m "Add expanded cryptic command parser"
```

### Task 2: Model the PNR work area

**Files:**
- Create: `src/terminal/sessionState.mjs`
- Create: `tests/terminal-pnr-flow.test.mjs`
- Modify: `tests/run-tests.mjs`

- [ ] **Step 1: Write failing state tests**

Test that a new session is `EMPTY`, the first element moves it to `WORKING`, required elements report `NAME`, `SEGMENT`, `CONTACT`, `TICKETING`, and `RECEIVED_FROM`, committed records receive a `TRN` locator, and an ignored work area returns to `EMPTY`.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: module import fails because `sessionState.mjs` does not exist.

- [ ] **Step 3: Implement factories and validation**

```js
export function createPnrWorkArea() {
  return {
    status: 'EMPTY', locator: null, names: [], segments: [], contacts: [],
    ssrs: [], osis: [], remarks: [], ticketing: null, receivedFrom: null,
    storedFare: null, dirty: false,
  };
}

export function missingRequiredElements(pnr) {
  return [
    !pnr.names.length && 'NAME', !pnr.segments.length && 'SEGMENT',
    !pnr.contacts.length && 'CONTACT', !pnr.ticketing && 'TICKETING',
    !pnr.receivedFrom && 'RECEIVED_FROM',
  ].filter(Boolean);
}
```

Generate deterministic locators from a session counter: `TRN001`, `TRN002`, and so on. Store committed snapshots in `session.records`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: state tests pass with no regression.

- [ ] **Step 5: Commit**

```powershell
git add src/terminal/sessionState.mjs tests/terminal-pnr-flow.test.mjs tests/run-tests.mjs
git commit -m "Model fictional PNR work area state"
```

### Task 3: Add deterministic availability navigation

**Files:**
- Create: `src/terminal/fixtures.mjs`
- Create: `src/terminal/formatters.mjs`
- Create: `src/terminal/commandExecutor.mjs`
- Modify: `tests/terminal-pnr-flow.test.mjs`

- [ ] **Step 1: Write failing availability tests**

Assert that `AN17JUNMADAMS/IB` creates at least eight fictional rows, shows six per page, `MD` advances the offset, `MU` returns it, `MT` moves to the top, `MB` moves to the bottom, `DO1` shows detail for visible line 1, and movement without active availability returns `NO AVAILABILITY ACTIVE`.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: execution fails because the executor does not exist.

- [ ] **Step 3: Implement fixtures and formatting**

Create a fixed route fixture keyed by `MAD-AMS`. Each row must include line, airline, flight, class inventory, date, origin, destination, departure, arrival, stops, equipment, duration, and a `simulated: true` flag.

```js
export const availabilityFixtures = {
  'MAD-AMS': Array.from({ length: 10 }, (_, index) => ({
    line: index + 1, airline: index % 2 ? 'KL' : 'IB',
    flight: `${index % 2 ? 'KL' : 'IB'}${310 + index}`,
    classes: 'J4 C4 D2 Y9 B9 M7', simulated: true,
  })),
};
```

Format six rows per page and preserve the original fixture line number for selling and detail lookup.

- [ ] **Step 4: Implement navigation execution**

Use `session.availability = { rows, offset: 0, pageSize: 6, query }`. Clamp moves to valid offsets and return structured `errorCode` values rather than throwing.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: navigation and existing terminal tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/terminal/fixtures.mjs src/terminal/formatters.mjs src/terminal/commandExecutor.mjs tests/terminal-pnr-flow.test.mjs
git commit -m "Add navigable fictional flight availability"
```

### Task 4: Complete the local PNR lifecycle

**Files:**
- Modify: `src/terminal/commandExecutor.mjs`
- Modify: `src/terminal/formatters.mjs`
- Modify: `tests/terminal-pnr-flow.test.mjs`

- [ ] **Step 1: Write failing lifecycle tests**

Cover selling after availability, `XE1` renumbering, names, contact, ticketing, received from, remarks, SSR, OSI, `ER`, `ET`, `RT TRN001`, and `IG`. Assert that `ER` without a contact returns `NEED CONTACT ELEMENT` and does not commit.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: new lifecycle assertions fail.

- [ ] **Step 3: Implement contextual mutations**

Every mutation must clone or snapshot state before commit. `ER` validates, stores a deep copy, clears `dirty`, and keeps the record active. `ET` does the same and replaces the work area with an empty one. `IG` restores the last committed snapshot when editing a retrieved record; otherwise it clears the work area.

- [ ] **Step 4: Format a numbered PNR display**

Render names, segments, contacts, ticketing, SSR, OSI, remarks, received-from, and stored-fare references in stable order. End every display with `TRAINING RECORD - NO REAL BOOKING OR TICKET`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: lifecycle tests and all previous tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/terminal/commandExecutor.mjs src/terminal/formatters.mjs tests/terminal-pnr-flow.test.mjs
git commit -m "Implement fictional PNR lifecycle"
```

### Task 5: Add fares, help, queues, profiles, and safety blocks

**Files:**
- Create: `tests/terminal-fares-queues.test.mjs`
- Modify: `tests/run-tests.mjs`
- Modify: `src/terminal/fixtures.mjs`
- Modify: `src/terminal/commandExecutor.mjs`

- [ ] **Step 1: Write failing tests**

Assert `FXX` prices without storing, `FXP` stores a fictional fare, `TQT` retrieves it, `FQN1` returns restrictions, pricing without itinerary returns `NO ITINERARY`, `QT/QS8/QN` navigate demonstration queue items, `PDN/DEMO CORP` returns a fictional profile, `HE FXP` returns contextual help, and `TTP` returns `OPERATION NOT AVAILABLE IN TRAINING` without changing state.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: fare, queue, help, and safety assertions fail.

- [ ] **Step 3: Implement deterministic fares and fixtures**

Use integer euro cents and fixed taxes. A fixture may return base `18400`, taxes `4760`, total `23160`, fare basis `YTRN`, and rule number `1`. Mark every structure `simulated: true`.

- [ ] **Step 4: Implement queues, profiles, help, and prohibited commands**

Queues contain only `TRN` records. `HE` reads a local topic map. `PROHIBITED` commands always return a safe result and never mutate the session.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: all suites pass.

- [ ] **Step 6: Commit**

```powershell
git add src/terminal/fixtures.mjs src/terminal/commandExecutor.mjs tests/terminal-fares-queues.test.mjs tests/run-tests.mjs
git commit -m "Add fictional fares queues and contextual help"
```

### Task 6: Add guided scenarios and persistence

**Files:**
- Create: `src/terminal/scenarios.mjs`
- Create: `src/terminal/persistence.mjs`
- Create: `tests/terminal-scenarios.test.mjs`
- Modify: `tests/run-tests.mjs`

- [ ] **Step 1: Write failing scenario tests**

Test three scenarios: basic PNR, SSR/OSI classification, and informational-versus-stored pricing. Assert progress is based on state predicates, not exact command strings. Test JSON round-trip persistence and rejection of malformed stored data.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: scenario and persistence imports fail.

- [ ] **Step 3: Implement scenario definitions**

```js
export const scenarios = [{
  id: 'basic-one-way-pnr',
  title: 'PNR basico de ida',
  steps: [
    { id: 'availability', complete: (s) => Boolean(s.availability?.rows.length) },
    { id: 'segment', complete: (s) => s.pnr.segments.length === 1 },
    { id: 'commit', complete: (s) => s.pnr.status === 'COMMITTED' },
  ],
}];
```

Return the first incomplete step and a Spanish hint. Never require one exact airline, name, or phone value.

- [ ] **Step 4: Implement persistence guards**

Persist only serializable training state under `amadeus-learning-coach-terminal-v2`. Restore with schema checks and fall back to a fresh session on malformed input.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: all scenario and persistence tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/terminal/scenarios.mjs src/terminal/persistence.mjs tests/terminal-scenarios.test.mjs tests/run-tests.mjs
git commit -m "Add guided terminal scenarios and persistence"
```

### Task 7: Integrate guided and free modes in the UI

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Add UI state and mode controls**

Load the saved terminal session on startup. Add an accessible segmented control with buttons `Guiado` and `Libre`; expose `aria-pressed` and keep dimensions stable.

- [ ] **Step 2: Render the guided scenario panel**

Show scenario selector, objective, progress count, current step hint, and completed-step indicators. Keep terminal output as the primary surface and explanations visually separate.

- [ ] **Step 3: Persist after every command**

After `runTerminalCommand`, save the session, evaluate the selected scenario, refresh history and state panels, and keep input focus. Require visible confirmation before `RESET` clears the active session.

- [ ] **Step 4: Add responsive styling**

Use a two-column terminal/scenario layout above `860px` and one column below. Keep buttons, terminal prompt, autocomplete, score, and warnings from shifting as content changes.

- [ ] **Step 5: Run automated tests**

Run: `node tests/run-tests.mjs`

Expected: all suites pass.

- [ ] **Step 6: Commit**

```powershell
git add src/app.js src/styles.css
git commit -m "Add guided and free professional terminal modes"
```

### Task 8: Update documentation and curriculum command validation

**Files:**
- Modify: `docs/terminal-simulator-spec.md`
- Modify: `docs/curriculum.md`
- Modify: `tests/curriculum-data.test.mjs`

- [ ] **Step 1: Write failing curriculum validation cases**

Replace duplicated command regular expressions with `parseTerminalCommand` assertions. Require every terminal example and exercise to parse as safe and reject `PROHIBITED`, `UNKNOWN`, and live-operation claims.

- [ ] **Step 2: Verify RED**

Run: `node tests/run-tests.mjs`

Expected: validation fails until the test imports and accepts the expanded parser catalog.

- [ ] **Step 3: Document the Phase 1 command catalog**

Describe guided/free modes, PNR states, command families, fictional fixtures, prohibited operations, and the permanent disclaimer. Update the curriculum to reference the professional roadmap and competency gates.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node tests/run-tests.mjs`

Expected: all curriculum and terminal suites pass.

- [ ] **Step 5: Commit**

```powershell
git add docs/terminal-simulator-spec.md docs/curriculum.md tests/curriculum-data.test.mjs
git commit -m "Document professional terminal phase one"
```

### Task 9: Browser verification

**Files:**
- No committed files expected.

- [ ] **Step 1: Run the complete automated suite**

Run: `node tests/run-tests.mjs`

Expected: zero failures.

- [ ] **Step 2: Verify the free-mode lifecycle**

In `http://localhost:5173/`, execute `AN17JUNMADAMS/IB`, `SS1Y1`, `NM1GARCIA/ANA MS`, `AP MAD 600000000`, `TKOK`, `RF ANA`, `FXP`, and `ER`. Verify a `TRN` record is displayed and the browser console has no relevant errors.

- [ ] **Step 3: Verify guided mode**

Start `PNR basico de ida`, complete it using the terminal, and verify each predicate-driven step updates. Reload and verify progress persists.

- [ ] **Step 4: Verify safety and responsive behavior**

Run `TTP` and verify it is blocked without state changes. Check desktop and a mobile viewport for overlap, clipping, hidden warnings, and inaccessible controls.

- [ ] **Step 5: Commit any fixes using a new RED/GREEN cycle**

If browser verification reveals a defect, add a failing automated test where possible, implement the smallest fix, rerun all tests, and commit only the fix files.

