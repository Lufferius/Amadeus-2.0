export function normalizeCommand(input = '') {
  return String(input).trim().replace(/\s+/g, ' ').toUpperCase();
}

function result(type, args = [], safe = true) {
  return { type, args, safe };
}

export function parseCommand(input = '') {
  const normalized = normalizeCommand(input);

  if (!normalized) {
    return {
      ...result('EMPTY'),
      message: 'Escribe HELP para ver comandos disponibles del simulador.',
    };
  }

  if (/^(?:TTP|TRF)(?:\/.*)?$/.test(normalized)
    || /^(?:FXQ|TRDC)(?:\/.*)?$/.test(normalized)
    || /^(?:REFUND|REISSUE)(?:\s+.*)?$/.test(normalized)
    || /^(?:FP\s*CC|CARD\s+).*$/.test(normalized)
    || /^(?:FP\s+)?(?:CC)?(?:VI|MC|AX)?\d{12,19}(?:[\s/].*)?$/.test(normalized)) {
    return result('PROHIBITED', [normalized], false);
  }

  const fixedCommands = new Map([
    ['HELP', 'HELP'],
    ['RESET', 'RESET'],
    ['SHOW SAMPLE_PNR', 'SHOW_SAMPLE_PNR'],
    ['TKOK', 'CRYPTIC_TICKETING'],
    ['RT', 'CRYPTIC_RETRIEVE_PNR'],
    ['ER', 'PNR_END_RETRIEVE'],
    ['ET', 'PNR_END'],
    ['IG', 'PNR_IGNORE'],
    ['FXP', 'FARE_PRICE_STORE'],
    ['FXX', 'FARE_PRICE_INFORMATIVE'],
    ['TQT', 'FARE_DISPLAY_STORED'],
    ['QT', 'QUEUE_TOTALS'],
    ['QN', 'QUEUE_NEXT'],
    ['HE', 'HELP_TOPIC'],
  ]);
  const fixedType = fixedCommands.get(normalized);
  if (fixedType) return result(fixedType);

  const availabilityMoves = new Map([
    ['MD', 'DOWN'],
    ['MU', 'UP'],
    ['MB', 'BOTTOM'],
    ['MT', 'TOP'],
  ]);
  const direction = availabilityMoves.get(normalized);
  if (direction) return result('AVAILABILITY_MOVE', [direction]);

  const rules = [
    [/^GLOSSARY\s+([A-Z_]+)$/, 'GLOSSARY', (match) => [match[1]]],
    [/^SHOW\s+AVAILABILITY\s+([A-Z]{3})\s+([A-Z]{3})(?:\s+([A-Z0-9]{2}))?$/, 'SHOW_AVAILABILITY', (match) => [match[1], match[2], match[3]]],
    [/^SHOW\s+FARE_RULE\s+(BASIC|FLEX)$/, 'SHOW_FARE_RULE', (match) => [match[1]]],
    [/^PRACTICE\s+(SEGMENTS|SSR_OSI|FARES)$/, 'PRACTICE', (match) => [match[1]]],
    [/^AIRLINE\s+([A-Z0-9]{2})$/, 'REFERENCE_AIRLINE', (match) => [match[1]]],
    [/^AIRPORT\s+([A-Z]{3})$/, 'REFERENCE_AIRPORT', (match) => [match[1]]],
    [/^TRAIN\s+([A-Z0-9_]+)$/, 'REFERENCE_TRAIN', (match) => [match[1]]],
    [/^HOTEL\s+([A-Z0-9_]+)$/, 'REFERENCE_HOTEL', (match) => [match[1]]],
    [/^SHOW\s+HOTELS\s+([A-Z]{3})$/, 'SHOW_HOTELS', (match) => [match[1]]],
    [/^SHOW\s+TRAINS\s+([A-Z]{3})\s+([A-Z]{3})$/, 'SHOW_TRAINS', (match) => [match[1], match[2]]],
    [/^AN(\d{2}[A-Z]{3})([A-Z]{3})([A-Z]{3})(?:\/([A-Z0-9]{2}))?$/, 'CRYPTIC_AVAILABILITY', (match) => [match[1], match[2], match[3], match[4]]],
    [/^SS(\d+)([A-Z])(\d+)$/, 'CRYPTIC_SELL_SEGMENT', (match) => [match[1], match[2], match[3]]],
    [/^NM(\d+)([A-Z]+\/[A-Z ]+(?:\s+(?:MR|MS|MRS|MSTR))?)$/, 'CRYPTIC_NAME', (match) => [match[1], match[2]]],
    [/^AP\s+(.+)$/, 'CRYPTIC_CONTACT', (match) => [match[1]]],
    [/^RF\s+(.+)$/, 'CRYPTIC_RECEIVED_FROM', (match) => [match[1]]],
    [/^DO(\d+)$/, 'AVAILABILITY_DETAIL', (match) => [match[1]]],
    [/^XE(\d+)$/, 'PNR_CANCEL_ELEMENT', (match) => [match[1]]],
    [/^SR\s+([A-Z0-9]{4})$/, 'PNR_SSR', (match) => [match[1]]],
    [/^OS\s+([A-Z0-9]{2})\s+(.+)$/, 'PNR_OSI', (match) => [match[1], match[2]]],
    [/^RM\s+(.+)$/, 'PNR_REMARK', (match) => [match[1]]],
    [/^FQN(\d+)$/, 'FARE_RULE_DETAIL', (match) => [match[1]]],
    [/^QS(\d+)$/, 'QUEUE_START', (match) => [match[1]]],
    [/^PDN\/(.+)$/, 'PROFILE_DISPLAY', (match) => [match[1]]],
    [/^HE\s+([A-Z0-9/._-]+)$/, 'HELP_TOPIC', (match) => [match[1]]],
  ];

  for (const [pattern, type, args] of rules) {
    const match = normalized.match(pattern);
    if (match) return result(type, args(match));
  }

  return {
    ...result('UNKNOWN', [normalized], false),
    message: 'Comando no permitido en este simulador. Usa HELP: no hay conexion real ni operaciones de produccion.',
  };
}
