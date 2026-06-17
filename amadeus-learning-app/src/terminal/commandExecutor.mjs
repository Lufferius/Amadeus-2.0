import { normalizeCommand, parseCommand } from './commandParser.mjs';
import { generateAvailabilityRows } from './fixtures.mjs';
import { formatAvailabilityDetail, formatAvailabilityPage } from './formatters.mjs';

const DISCLAIMER = 'TRAINING SIMULATION ONLY - NO LIVE INVENTORY OR TRANSACTIONS';

function result(type, input, status, output, options = {}) {
  return {
    type,
    input,
    output,
    explanation: options.explanation ?? '',
    disclaimer: DISCLAIMER,
    safeMode: true,
    status,
    ...(options.errorCode ? { errorCode: options.errorCode } : {}),
    ...(options.contextualHelp ? { contextualHelp: options.contextualHelp } : {}),
  };
}

function noAvailability(type, input) {
  return result(type, input, 'ERROR', 'NO AVAILABILITY ACTIVE', {
    errorCode: 'NO_AVAILABILITY_ACTIVE',
    explanation: 'Request availability before moving or displaying a flight.',
    contextualHelp: 'Use ANDDMMMORGDST, optionally followed by /XX.',
  });
}

export function executeProfessionalCommand(session, input) {
  const normalizedInput = normalizeCommand(input);
  const command = parseCommand(input);

  if (command.type === 'CRYPTIC_AVAILABILITY') {
    const [date, origin, destination, airlineCode] = command.args;
    const query = { date, origin, destination, airlineCode };
    session.availability = {
      rows: generateAvailabilityRows(query),
      offset: 0,
      pageSize: 6,
      query,
    };
    return result(command.type, normalizedInput, 'OK', formatAvailabilityPage(session.availability), {
      explanation: 'Created deterministic fictional availability for training.',
    });
  }

  if (command.type === 'AVAILABILITY_MOVE') {
    if (!session.availability) return noAvailability(command.type, normalizedInput);

    const availability = session.availability;
    const maxOffset = Math.max(0, availability.rows.length - availability.pageSize);
    const direction = command.args[0];
    if (direction === 'DOWN') availability.offset = Math.min(availability.offset + availability.pageSize, maxOffset);
    if (direction === 'UP') {
      const partialPageOffset = availability.offset % availability.pageSize;
      availability.offset = partialPageOffset === 0
        ? Math.max(availability.offset - availability.pageSize, 0)
        : Math.floor(availability.offset / availability.pageSize) * availability.pageSize;
    }
    if (direction === 'TOP') availability.offset = 0;
    if (direction === 'BOTTOM') availability.offset = maxOffset;

    return result(command.type, normalizedInput, 'OK', formatAvailabilityPage(availability), {
      explanation: `Moved availability ${direction.toLowerCase()}.`,
    });
  }

  if (command.type === 'AVAILABILITY_DETAIL') {
    if (!session.availability) return noAvailability(command.type, normalizedInput);

    const line = Number(command.args[0]);
    const row = session.availability.rows.find((candidate) => candidate.line === line);
    if (!row) {
      return result(command.type, normalizedInput, 'ERROR', 'CHECK LINE NUMBER', {
        errorCode: 'CHECK_LINE_NUMBER',
        explanation: 'The requested line is not present in the active availability.',
        contextualHelp: 'Use a stable line number shown in the availability display.',
      });
    }

    return result(command.type, normalizedInput, 'OK', formatAvailabilityDetail(row), {
      explanation: `Displayed simulated detail for availability line ${line}.`,
    });
  }

  return result(command.type, normalizedInput, 'NOT_IMPLEMENTED', 'NOT IMPLEMENTED', {
    explanation: 'This parsed command is reserved for a later professional terminal task.',
  });
}
