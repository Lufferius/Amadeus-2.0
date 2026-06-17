import { normalizeCommand, parseCommand } from './commandParser.mjs';
import { generateAvailabilityRows } from './fixtures.mjs';
import { formatAvailabilityDetail, formatAvailabilityPage, formatPnr } from './formatters.mjs';
import { commitPnr, ignorePnr, retrievePnr, touchPnr } from './sessionState.mjs';
import {
  getHelpTopic,
  getQueue,
  getQueueTotals,
  getTrainingFare,
  getTrainingProfile,
  listHelpTopics,
} from './trainingCatalog.mjs';

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

function errorResult(type, input, errorCode, output, explanation, contextualHelp) {
  return result(type, input, 'ERROR', output, { errorCode, explanation, contextualHelp });
}

function firstMissingError(missing) {
  const errors = {
    NAME: ['NEED_NAME', 'NEED NAME'],
    SEGMENT: ['NEED_ITINERARY', 'NEED ITINERARY'],
    CONTACT: ['NEED_CONTACT_ELEMENT', 'NEED CONTACT ELEMENT'],
    TICKETING: ['NEED_TICKETING_ARRANGEMENT', 'NEED TICKETING ARRANGEMENT'],
    RECEIVED_FROM: ['NEED_RECEIVED_FROM', 'NEED RECEIVED FROM'],
  };
  return errors[missing];
}

function mutatePnr(session, command, input, mutation, output, explanation) {
  mutation(session.pnr);
  touchPnr(session.pnr);
  return result(command.type, input, 'OK', output, { explanation });
}

function money(cents) {
  return (cents / 100).toFixed(2);
}

function formatFare(fare, stored) {
  return [
    stored ? 'TST 1 - FARE STORED IN TRAINING PNR' : 'INFORMATIVE PRICING - NOT STORED',
    `FARE BASIS ${fare.fareBasis}`,
    `BASE ${fare.currency} ${money(fare.baseCents)}`,
    `TAX ${fare.currency} ${money(fare.taxCents)}`,
    `TOTAL ${fare.currency} ${money(fare.totalCents)}`,
    'FICTIONAL FARE - NO TICKET ISSUED',
  ].join('\n');
}

function formatQueueItem(item, position, total) {
  return [
    `QUEUE ITEM ${position}/${total}`,
    `LOCATOR ${item.locator}`,
    `REASON ${item.reason}`,
    `PRIORITY ${item.priority}`,
    'TRAINING QUEUE ITEM - NO LIVE PNR',
  ].join('\n');
}

export function executeProfessionalCommand(session, input) {
  const normalizedInput = normalizeCommand(input);
  const command = parseCommand(input);

  if (command.type === 'PROHIBITED') {
    return errorResult(command.type, normalizedInput, 'OPERATION_PROHIBITED', 'OPERATION NOT AVAILABLE IN TRAINING', 'Issuance, refunds, reissues, payments, and live transactions are disabled.', 'Practise pricing and PNR review without executing financial or supplier actions.');
  }

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

  if (command.type === 'CRYPTIC_SELL_SEGMENT') {
    if (!session.availability) return noAvailability(command.type, normalizedInput);
    const [quantityText, classCode, lineText] = command.args;
    const quantity = Number(quantityText);
    const line = Number(lineText);
    const row = session.availability.rows.find((candidate) => candidate.line === line);
    if (!row) {
      return errorResult(command.type, normalizedInput, 'CHECK_LINE_NUMBER', 'CHECK LINE NUMBER', 'The requested availability line does not exist.', 'Display availability and use one of its stable line numbers.');
    }
    const classMatch = row.classes.match(new RegExp(`(?:^|\\s)${classCode}(\\d+)(?:\\s|$)`));
    const displayedSeats = classMatch ? Number(classMatch[1]) : 0;
    if (quantity < 1 || displayedSeats < quantity) {
      return errorResult(command.type, normalizedInput, 'CLASS_NOT_AVAILABLE', 'CLASS NOT AVAILABLE', 'The requested class or quantity is not displayed as available in this fictional row.', 'Choose a class and quantity shown on the active availability.');
    }
    const segment = { ...row, quantity, classCode, status: 'HK', sourceLine: line };
    session.pnr.segments.push(segment);
    touchPnr(session.pnr);
    return result(command.type, normalizedInput, 'OK', `${row.flight} ${classCode} ${row.date} ${row.origin}${row.destination} HK${quantity} ${row.departure} ${row.arrival}`, {
      explanation: 'Added a simulated segment to the local training PNR. No inventory was changed.',
    });
  }

  if (command.type === 'PNR_CANCEL_ELEMENT') {
    const position = Number(command.args[0]);
    if (!Number.isInteger(position) || position < 1 || position > session.pnr.segments.length) {
      return errorResult(command.type, normalizedInput, 'CHECK_ELEMENT_NUMBER', 'CHECK ELEMENT NUMBER', 'That itinerary element is not present in the local PNR.', 'Use the itinerary position shown by RT.');
    }
    session.pnr.segments.splice(position - 1, 1);
    touchPnr(session.pnr);
    return result(command.type, normalizedInput, 'OK', `SEGMENT ${position} CANCELLED IN TRAINING PNR`, {
      explanation: 'Removed only the local fictional itinerary element. No supplier booking was changed.',
    });
  }

  if (command.type === 'CRYPTIC_NAME') {
    const count = Number(command.args[0]);
    if (!Number.isInteger(count) || count < 1) {
      return errorResult(command.type, normalizedInput, 'CHECK_NAME_COUNT', 'CHECK NAME COUNT', 'Passenger count must be at least one.', 'Use a fictional name such as NM1GARCIA/ANA MS.');
    }
    return mutatePnr(session, command, normalizedInput, (pnr) => {
      for (let index = 0; index < count; index += 1) pnr.names.push(command.args[1]);
    }, `NM OK - ${count} TRAINING PASSENGER(S)`, 'Added fictional passenger data to the local PNR.');
  }

  if (command.type === 'CRYPTIC_CONTACT') {
    return mutatePnr(session, command, normalizedInput, (pnr) => pnr.contacts.push(command.args[0]), `AP ${command.args[0]}`, 'Added a fictional contact element.');
  }

  if (command.type === 'CRYPTIC_TICKETING') {
    return mutatePnr(session, command, normalizedInput, (pnr) => { pnr.ticketing = 'TKOK'; }, 'TKOK', 'Added a training ticketing arrangement; no ticket was issued.');
  }

  if (command.type === 'CRYPTIC_RECEIVED_FROM') {
    return mutatePnr(session, command, normalizedInput, (pnr) => { pnr.receivedFrom = command.args[0]; }, `RF ${command.args[0]}`, 'Recorded received-from in the local training PNR.');
  }

  if (command.type === 'PNR_REMARK') {
    return mutatePnr(session, command, normalizedInput, (pnr) => pnr.remarks.push(command.args[0]), `RM ${command.args[0]}`, 'Added a local training remark.');
  }

  if (command.type === 'PNR_SSR') {
    return mutatePnr(session, command, normalizedInput, (pnr) => pnr.ssrs.push(command.args[0]), `SR ${command.args[0]}`, 'Added a simulated SSR; nothing was sent to an airline.');
  }

  if (command.type === 'PNR_OSI') {
    return mutatePnr(session, command, normalizedInput, (pnr) => pnr.osis.push({ carrier: command.args[0], text: command.args[1] }), `OS ${command.args[0]} ${command.args[1]}`, 'Added simulated other service information locally.');
  }

  if (command.type === 'PNR_END_RETRIEVE' || command.type === 'PNR_END') {
    const keepActive = command.type === 'PNR_END_RETRIEVE';
    const committed = commitPnr(session, { keepActive });
    if (!committed.ok) {
      const [errorCode, output] = firstMissingError(committed.missing[0]);
      return errorResult(command.type, normalizedInput, errorCode, output, 'The PNR is missing a required element.', 'Add the required training element, then try the end command again.');
    }
    const display = formatPnr(committed.record);
    return result(command.type, normalizedInput, 'OK', keepActive ? display : `${display}\nEND OF TRANSACTION`, {
      explanation: 'Saved only a local fictional PNR. No booking or ticket exists in any external system.',
    });
  }

  if (command.type === 'PNR_IGNORE') {
    const hadSavedRecord = Boolean(session.pnr.locator && session.records[session.pnr.locator]);
    const restored = ignorePnr(session);
    const output = hadSavedRecord
      ? `IGNORED - WORK AREA RESTORED\n${formatPnr(restored)}`
      : 'IGNORED - WORK AREA CLEARED';
    return result(command.type, normalizedInput, 'OK', output, {
      explanation: 'Discarded unsaved changes in the local training work area only.',
    });
  }

  if (command.type === 'CRYPTIC_RETRIEVE_PNR') {
    const locator = command.args[0];
    if (!locator) {
      if (session.pnr.status === 'EMPTY') {
        return errorResult(command.type, normalizedInput, 'NO_ACTIVE_PNR', 'NO ACTIVE PNR', 'There is no PNR in the local work area.', 'Retrieve a TRN locator or build a new training PNR.');
      }
      return result(command.type, normalizedInput, 'OK', formatPnr(session.pnr), {
        explanation: 'Displayed the active local training PNR.',
      });
    }
    const retrieved = retrievePnr(session, locator);
    if (!retrieved.ok) {
      return errorResult(command.type, normalizedInput, 'RECORD_LOCATOR_NOT_FOUND', 'RECORD LOCATOR NOT FOUND - TRAINING DATA ONLY', 'The requested locator is not present in local training records.', 'Use a TRN locator created in this browser session.');
    }
    return result(command.type, normalizedInput, 'OK', formatPnr(retrieved.record), {
      explanation: 'Retrieved a deep copy of a local fictional PNR.',
    });
  }

  if (command.type === 'FARE_PRICE_INFORMATIVE' || command.type === 'FARE_PRICE_STORE') {
    if (session.pnr.segments.length === 0) {
      return errorResult(command.type, normalizedInput, 'NO_ITINERARY', 'NO ITINERARY', 'Pricing requires at least one local training segment.', 'Display availability and add a simulated segment first.');
    }
    const fare = getTrainingFare();
    const store = command.type === 'FARE_PRICE_STORE';
    if (store) {
      session.pnr.storedFare = fare;
      touchPnr(session.pnr);
    }
    return result(command.type, normalizedInput, 'OK', formatFare(fare, store), {
      explanation: store
        ? 'Stored a deterministic fictional fare in the local PNR. No ticket was issued.'
        : 'Displayed deterministic fictional pricing without changing the PNR.',
    });
  }

  if (command.type === 'FARE_DISPLAY_STORED') {
    if (!session.pnr.storedFare) {
      return errorResult(command.type, normalizedInput, 'NO_STORED_FARE', 'NO STORED FARE', 'The active training PNR has no stored fare.', 'Use FXP after adding an itinerary.');
    }
    return result(command.type, normalizedInput, 'OK', formatFare(session.pnr.storedFare, true), {
      explanation: 'Displayed the fictional stored fare from the local PNR.',
    });
  }

  if (command.type === 'FARE_RULE_DETAIL') {
    if (Number(command.args[0]) !== 1) {
      return errorResult(command.type, normalizedInput, 'CHECK_RULE_NUMBER', 'CHECK RULE NUMBER', 'Only rule category 1 exists in this training fixture.', 'Use FQN1.');
    }
    return result(command.type, normalizedInput, 'OK', [
      'TRAINING RULES - FICTIONAL CONDITIONS',
      'CHANGES: PERMITTED WITH EUR 60.00 TRAINING PENALTY',
      'CANCELLATIONS: NON-REFUNDABLE IN THIS EXAMPLE',
      'NO-SHOW: ADDITIONAL RESTRICTIONS APPLY IN THE SCENARIO',
      'VERIFY ALL REAL RULES IN AUTHORISED SYSTEMS',
    ].join('\n'), { explanation: 'Displayed simplified fictional fare rules for learning.' });
  }

  if (command.type === 'QUEUE_TOTALS') {
    const lines = ['QUEUE TOTALS - TRAINING QUEUES ONLY'];
    getQueueTotals().forEach((entry) => lines.push(`QUEUE ${entry.number} ITEMS ${entry.count}`));
    return result(command.type, normalizedInput, 'OK', lines.join('\n'), {
      explanation: 'Displayed local demonstration queue totals.',
    });
  }

  if (command.type === 'QUEUE_START') {
    const number = Number(command.args[0]);
    const items = getQueue(number);
    if (!items) {
      return errorResult(command.type, normalizedInput, 'QUEUE_NOT_FOUND', 'QUEUE NOT FOUND - TRAINING ONLY', 'That queue is not defined in the local training catalog.', 'Use QT to see available training queues.');
    }
    session.queue = { activeNumber: number, items, currentIndex: 0 };
    return result(command.type, normalizedInput, 'OK', formatQueueItem(items[0], 1, items.length), {
      explanation: 'Entered a local demonstration queue.',
    });
  }

  if (command.type === 'QUEUE_NEXT') {
    if (session.queue.activeNumber === null || session.queue.currentIndex < 0) {
      return errorResult(command.type, normalizedInput, 'NO_ACTIVE_QUEUE', 'NO ACTIVE QUEUE', 'There is no active local training queue.', 'Use QT and QS8 to start queue practice.');
    }
    const nextIndex = session.queue.currentIndex + 1;
    if (nextIndex >= session.queue.items.length) {
      session.queue = { activeNumber: null, items: [], currentIndex: -1 };
      return result(command.type, normalizedInput, 'OK', 'QUEUE COMPLETE - TRAINING ONLY', {
        explanation: 'Finished all local demonstration queue items.',
      });
    }
    session.queue.currentIndex = nextIndex;
    return result(command.type, normalizedInput, 'OK', formatQueueItem(session.queue.items[nextIndex], nextIndex + 1, session.queue.items.length), {
      explanation: 'Moved to the next local demonstration queue item.',
    });
  }

  if (command.type === 'PROFILE_DISPLAY') {
    const profile = getTrainingProfile(command.args[0]);
    if (!profile) {
      return errorResult(command.type, normalizedInput, 'PROFILE_NOT_FOUND', 'PROFILE NOT FOUND - TRAINING DATA ONLY', 'The requested profile is not in the fictional catalog.', 'Use PDN/DEMO CORP.');
    }
    return result(command.type, normalizedInput, 'OK', [
      `FICTIONAL CORPORATE PROFILE: ${profile.name}`,
      `POLICY: ${profile.policy}`,
      `PREFERRED: ${profile.preferred}`,
      `CONTACT: ${profile.contact}`,
      'LOCAL TRAINING PROFILE - NO CORPORATE SYSTEM CONNECTION',
    ].join('\n'), { explanation: 'Displayed a fictional company profile for policy practice.' });
  }

  if (command.type === 'HELP_TOPIC') {
    const topic = command.args[0];
    if (!topic) {
      return result(command.type, normalizedInput, 'OK', `HELP TOPICS: ${listHelpTopics().join(', ')}\nLOCAL TRAINING HELP ONLY`, {
        explanation: 'Listed contextual help topics supported by this simulator.',
      });
    }
    const helpText = getHelpTopic(topic);
    if (!helpText) {
      return errorResult(command.type, normalizedInput, 'HELP_TOPIC_NOT_FOUND', 'HELP TOPIC NOT FOUND', 'That topic is not in local training help.', `Available topics: ${listHelpTopics().join(', ')}.`);
    }
    return result(command.type, normalizedInput, 'OK', `HE ${topic}\n${helpText}`, {
      explanation: 'Displayed local contextual help.',
    });
  }

  return result(command.type, normalizedInput, 'NOT_IMPLEMENTED', 'NOT IMPLEMENTED', {
    explanation: 'This parsed command is reserved for a later professional terminal task.',
  });
}
