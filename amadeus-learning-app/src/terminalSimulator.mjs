import { normalizeCommand, parseCommand } from './terminal/commandParser.mjs';

export const DISCLAIMER = 'Training simulator only. Not connected to Amadeus or any real booking system.';

const supportedCommands = [
  'HELP',
  'GLOSSARY PNR',
  'GLOSSARY GDS',
  'GLOSSARY SSR',
  'GLOSSARY OSI',
  'GLOSSARY FARE_RULE',
  'SHOW SAMPLE_PNR',
  'SHOW AVAILABILITY MAD AMS',
  'SHOW FARE_RULE BASIC',
  'SHOW FARE_RULE FLEX',
  'AIRLINE IB',
  'AIRLINE AF',
  'AIRLINE KL',
  'AIRLINE LH',
  'AIRPORT MAD',
  'AIRPORT AMS',
  'AIRPORT BCN',
  'TRAIN AVE',
  'TRAIN OUIGO',
  'TRAIN IRYO',
  'HOTEL MELIA',
  'HOTEL NH',
  'HOTEL HILTON',
  'SHOW HOTELS MAD',
  'SHOW TRAINS MAD BCN',
  'AN17JUNMADAMS/IB',
  'SS1Y1',
  'NM1GARCIA/ANA MS',
  'AP MAD 600000000',
  'TKOK',
  'RF ANA',
  'RT',
  'PRACTICE SEGMENTS',
  'PRACTICE SSR_OSI',
  'PRACTICE FARES',
  'RESET',
];

const glossary = {
  GDS: 'Sistema de distribucion global que conecta agencias y proveedores de viaje. En este simulador se estudia solo como concepto.',
  PNR: 'Expediente de reserva. Aqui se usa un PNR ficticio para aprender estructura sin modificar nada real.',
  SSR: 'Special Service Request. En practica, representa una solicitud especial que puede requerir accion o confirmacion.',
  OSI: 'Other Service Information. En practica, representa informacion adicional normalmente informativa.',
  FARE_RULE: 'Regla de tarifa simplificada. Describe condiciones simuladas como cambios, reembolsos o restricciones.',
};

const referenceData = {
  airlines: {
    IB: { name: 'Iberia', country: 'España', alliance: 'oneworld' },
    AF: { name: 'Air France', country: 'Francia', alliance: 'SkyTeam' },
    KL: { name: 'KLM Royal Dutch Airlines', country: 'Paises Bajos', alliance: 'SkyTeam' },
    LH: { name: 'Lufthansa', country: 'Alemania', alliance: 'Star Alliance' },
    VY: { name: 'Vueling', country: 'España', alliance: 'Sin alianza global principal' },
    UX: { name: 'Air Europa', country: 'España', alliance: 'SkyTeam' },
  },
  airports: {
    MAD: { name: 'Adolfo Suarez Madrid-Barajas', city: 'Madrid', country: 'España' },
    AMS: { name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Paises Bajos' },
    BCN: { name: 'Barcelona-El Prat', city: 'Barcelona', country: 'España' },
    CDG: { name: 'Paris Charles de Gaulle', city: 'Paris', country: 'Francia' },
    LHR: { name: 'London Heathrow', city: 'Londres', country: 'Reino Unido' },
    FRA: { name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Alemania' },
  },
  trains: {
    AVE: { name: 'AVE', operator: 'Renfe', market: 'Alta velocidad España' },
    OUIGO: { name: 'OUIGO España', operator: 'SNCF Voyageurs', market: 'Alta velocidad España' },
    IRYO: { name: 'iryo', operator: 'Ilsa', market: 'Alta velocidad España' },
    EUROSTAR: { name: 'Eurostar', operator: 'Eurostar', market: 'Alta velocidad internacional' },
  },
  hotels: {
    MELIA: { name: 'Melia Hotels International', type: 'Cadena hotelera', origin: 'España' },
    NH: { name: 'NH Hotels', type: 'Cadena hotelera', origin: 'España' },
    HILTON: { name: 'Hilton', type: 'Cadena hotelera', origin: 'Estados Unidos' },
    MARRIOTT: { name: 'Marriott', type: 'Cadena hotelera', origin: 'Estados Unidos' },
    ACCOR: { name: 'Accor', type: 'Grupo hotelero', origin: 'Francia' },
  },
};

const practicePrompts = {
  SEGMENTS: {
    prompt: 'Practica: MAD-AMS, AMS-LHR, LHR-MAD. Cuantos segmentos hay?',
    acceptedAnswers: ['3', 'TRES'],
    correctAnswer: '3',
    explanation: 'La respuesta correcta es 3 porque cada tramo individual cuenta como un segmento.',
  },
  SSR_OSI: {
    prompt: 'Practica: pasajera ficticia necesita asistencia de silla de ruedas. Responde SSR, OSI, REMARK o POLICY.',
    acceptedAnswers: ['SSR'],
    correctAnswer: 'SSR',
    explanation: 'La respuesta correcta es SSR porque puede requerir accion o confirmacion por parte de la aerolinea.',
  },
  FARES: {
    prompt: 'Practica: A) tarifa BASIC barata sin cambios. B) tarifa FLEX mas cara con cambios. La politica ficticia prioriza flexibilidad. Responde A o B.',
    acceptedAnswers: ['B', 'FLEX'],
    correctAnswer: 'B',
    explanation: 'La respuesta correcta es B porque la necesidad ficticia prioriza flexibilidad y reduce riesgo operativo.',
  },
};

function normalize(input) {
  return normalizeCommand(input);
}

export function createTerminalSession() {
  return {
    history: [],
    transcript: [],
    activePractice: null,
    score: { correct: 0, total: 0 },
    mistakes: [],
    pnr: {
      recordLocator: 'TRAIN1',
      names: [],
      contacts: [],
      segments: [],
      ticketing: null,
      receivedFrom: null,
    },
    lastAvailability: [],
  };
}

export function getAutocompleteSuggestions(input = '') {
  const normalized = normalize(input);

  if (!normalized) {
    return supportedCommands;
  }

  return supportedCommands.filter((command) => command.startsWith(normalized));
}

export function parseTerminalCommand(input = '') {
  return parseCommand(input);
}

function baseResult(type, input, output, explanation, extra = {}) {
  return {
    type,
    input,
    output,
    explanation,
    disclaimer: DISCLAIMER,
    safeMode: true,
    ...extra,
  };
}

function buildHelp(input) {
  return baseResult(
    'HELP',
    input,
    [
      'Comandos disponibles:',
      ...supportedCommands.map((command) => `- ${command}`),
    ],
    'HELP muestra solo comandos ficticios admitidos por el entorno de entrenamiento.',
    { contextualHelp: 'Prueba SHOW SAMPLE_PNR para ver un expediente ficticio o PRACTICE SEGMENTS para practicar.' },
  );
}

function formatReference(kind, code, record) {
  if (!record) {
    return [`${kind} ${code}: no esta en el catalogo estatico de entrenamiento.`];
  }

  return Object.entries(record).map(([key, value]) => `${key}: ${value}`);
}

function buildSimulatedAvailability(origin, destination, airlineCode = 'XX', date = '17JUN') {
  const prefix = airlineCode || 'XX';
  return [
    {
      line: 1,
      airline: prefix,
      flight: `${prefix}310`,
      date,
      origin,
      destination,
      departure: '0910',
      arrival: '1145',
      classCode: 'Y',
      seats: 7,
      fareFamily: 'BASIC',
    },
    {
      line: 2,
      airline: prefix,
      flight: `${prefix}642`,
      date,
      origin,
      destination,
      departure: '1030',
      arrival: '1450',
      classCode: 'Y',
      seats: 4,
      fareFamily: 'BASIC',
      via: 'CDG',
    },
    {
      line: 3,
      airline: prefix,
      flight: `${prefix}884`,
      date,
      origin,
      destination,
      departure: '1600',
      arrival: '1835',
      classCode: 'Y',
      seats: 9,
      fareFamily: 'FLEX',
    },
  ];
}

function formatAvailabilityLine(option) {
  const via = option.via ? ` VIA ${option.via}` : ' NONSTOP';
  return `${option.line} ${option.flight} ${option.classCode}${option.seats} ${option.date} ${option.origin}${option.destination} ${option.departure} ${option.arrival}${via} ${option.fareFamily}`;
}

function ensureTrainingPnr(session) {
  if (!session.pnr) {
    session.pnr = {
      recordLocator: 'TRAIN1',
      names: [],
      contacts: [],
      segments: [],
      ticketing: null,
      receivedFrom: null,
    };
  }

  return session.pnr;
}

function formatTrainingPnr(session) {
  const pnr = ensureTrainingPnr(session);
  const lines = [`RP/MADTRN000/MADTRN000            ${pnr.recordLocator}`];
  if (pnr.names.length === 0) {
    lines.push('NO NAMES');
  } else {
    pnr.names.forEach((name, index) => lines.push(`${index + 1}. ${name}`));
  }

  if (pnr.segments.length === 0) {
    lines.push('NO SEGMENTS');
  } else {
    pnr.segments.forEach((segment, index) => lines.push(`${index + 1} ${segment.flight} ${segment.classCode} ${segment.date} ${segment.origin}${segment.destination} HK${segment.quantity} ${segment.departure} ${segment.arrival}`));
  }

  pnr.contacts.forEach((contact) => lines.push(`AP ${contact}`));
  if (pnr.ticketing) lines.push(pnr.ticketing);
  if (pnr.receivedFrom) lines.push(`RF ${pnr.receivedFrom}`);
  lines.push('--- PNR FICTICIO DE ENTRENAMIENTO: SIN EMISION, SIN RESERVA REAL ---');
  return lines;
}

function runPracticeAnswer(session, input) {
  const practice = practicePrompts[session.activePractice];
  const normalized = normalize(input);
  const isCorrect = practice.acceptedAnswers.includes(normalized);
  session.score.total += 1;

  if (isCorrect) {
    session.score.correct += 1;
  } else {
    session.mistakes.push({
      practice: session.activePractice,
      input,
      expected: practice.correctAnswer,
      explanation: practice.explanation,
    });
  }

  session.activePractice = null;

  return baseResult(
    'PRACTICE_ANSWER',
    input,
    isCorrect ? ['Correcto.'] : [`Incorrecto. Has respondido "${input}".`],
    isCorrect ? practice.explanation : `${practice.explanation} La respuesta correcta es ${practice.correctAnswer}.`,
    {
      score: { ...session.score },
      mistakes: [...session.mistakes],
      practice: { active: false },
      contextualHelp: 'Puedes iniciar otra practica con PRACTICE SEGMENTS, PRACTICE SSR_OSI o PRACTICE FARES.',
    },
  );
}

export function runTerminalCommand(session, input) {
  if (!session) {
    throw new Error('Terminal session is required');
  }

  if (session.activePractice) {
    const result = runPracticeAnswer(session, input);
    session.history.push(input);
    session.transcript.push(result);
    return result;
  }

  const parsed = parseTerminalCommand(input);

  if (parsed.type === 'RESET') {
    session.history = [];
    session.transcript = [];
    session.activePractice = null;
    session.score = { correct: 0, total: 0 };
    session.mistakes = [];
    session.lastAvailability = [];
    session.pnr = {
      recordLocator: 'TRAIN1',
      names: [],
      contacts: [],
      segments: [],
      ticketing: null,
      receivedFrom: null,
    };
    return baseResult('RESET', input, ['Sesion simulada reiniciada.'], 'RESET borra historial, puntuacion y errores de practica.');
  }

  if (parsed.type !== 'EMPTY') {
    session.history.push(input);
  }

  let result;

  if (parsed.type === 'HELP') {
    result = buildHelp(input);
  } else if (parsed.type === 'GLOSSARY') {
    const term = parsed.args[0];
    result = baseResult(
      'GLOSSARY',
      input,
      [glossary[term] ?? `No hay definicion para ${term}. Prueba PNR, GDS, SSR, OSI o FARE_RULE.`],
      'El glosario usa definiciones pedagogicas y no sustituye formacion autorizada.',
      { contextualHelp: 'Usa GLOSSARY PNR o GLOSSARY SSR para repasar conceptos frecuentes.' },
    );
  } else if (parsed.type === 'SHOW_SAMPLE_PNR') {
    result = baseResult(
      'SHOW_SAMPLE_PNR',
      input,
      [
        'PNR FICTICIO: DEMO42',
        'Pasajera: Ana Demo',
        'Cliente corporativo: DemoCorp',
        'Segmentos: MAD-AMS 09:10-11:45 / AMS-MAD 18:20-20:55',
        'Contacto: training@example.invalid',
        'SSR ficticio: asistencia WCHR pendiente de confirmar en escenario',
        'OSI ficticio: viaje de formacion interna',
        'Ticketing deadline ficticio: 18:00 del dia de practica',
      ],
      'Este PNR es inventado para aprender anatomia de una reserva sin tocar sistemas reales.',
      { contextualHelp: 'Despues puedes practicar con PRACTICE SSR_OSI para clasificar solicitudes.' },
    );
  } else if (parsed.type === 'SHOW_AVAILABILITY') {
    const [origin, destination, airlineCode] = parsed.args;
    const originName = referenceData.airports[origin]?.city ?? origin;
    const destinationName = referenceData.airports[destination]?.city ?? destination;
    const airline = airlineCode ? (referenceData.airlines[airlineCode]?.name ?? `codigo ${airlineCode}`) : 'varias aerolineas';
    const prefix = airlineCode ?? 'XX';
    result = baseResult(
      'SHOW_AVAILABILITY',
      input,
      [
        `Disponibilidad simulada ${origin}-${destination} (${originName} - ${destinationName})`,
        `Filtro transportista: ${airline}`,
        `1. ${prefix}310 directo ${origin}-${destination} 09:10-11:45 cabina Y tarifa BASIC restrictiva`,
        `2. ${prefix}642 conexion via CDG 10:30-14:50 cabina Y tarifa BASIC economica`,
        `3. ${prefix}884 directo ${origin}-${destination} 16:00-18:35 cabina Y tarifa FLEX con cambios simulados`,
      ],
      'La disponibilidad es simulada. Los codigos pueden ser reales como referencia, pero no hay consulta de inventario real.',
      { contextualHelp: 'Usa SHOW FARE_RULE BASIC o SHOW FARE_RULE FLEX para revisar condiciones simuladas.' },
    );
  } else if (parsed.type === 'SHOW_FARE_RULE') {
    const [fareType] = parsed.args;
    const rules = fareType === 'BASIC'
      ? ['BASIC ficticia: menor precio inicial.', 'Cambios: no permitidos en el ejemplo.', 'Reembolso: no contemplado en el ejemplo.', 'Riesgo: alta restriccion si el plan cambia.']
      : ['FLEX ficticia: precio inicial mayor.', 'Cambios: permitidos con condiciones simuladas.', 'Reembolso: parcial segun escenario ficticio.', 'Riesgo: menor si el viajero necesita flexibilidad.'];
    result = baseResult(
      'SHOW_FARE_RULE',
      input,
      rules,
      'Las reglas son simplificadas y ficticias. No se deben aplicar a tarifas reales.',
      { contextualHelp: 'Usa PRACTICE FARES para elegir entre opciones segun una politica ficticia.' },
    );
  } else if (parsed.type === 'PRACTICE') {
    const practiceName = parsed.args[0];
    const practice = practicePrompts[practiceName];
    session.activePractice = practiceName;
    result = baseResult(
      'PRACTICE',
      input,
      [practice.prompt],
      'Responde solo a la pregunta de practica. La puntuacion se actualiza despues de tu respuesta.',
      {
        practice: { active: true, name: practiceName },
        score: { ...session.score },
        contextualHelp: 'Si te equivocas, el error se guardara en el registro de errores con una explicacion.',
      },
    );
  } else if (parsed.type === 'REFERENCE_AIRLINE') {
    const [code] = parsed.args;
    result = baseResult(
      'REFERENCE_AIRLINE',
      input,
      [`AIRLINE ${code}`, ...formatReference('Aerolinea', code, referenceData.airlines[code])],
      'referencia estatica de codigo real. No consulta disponibilidad, tarifas ni sistemas de aerolinea.',
      { contextualHelp: 'Prueba SHOW AVAILABILITY MAD AMS IB para ver una disponibilidad simulada filtrada por aerolinea.' },
    );
  } else if (parsed.type === 'REFERENCE_AIRPORT') {
    const [code] = parsed.args;
    result = baseResult(
      'REFERENCE_AIRPORT',
      input,
      [`AIRPORT ${code}`, ...formatReference('Aeropuerto', code, referenceData.airports[code])],
      'referencia estatica de aeropuerto. No consulta operaciones, horarios reales ni sistemas aeroportuarios.',
      { contextualHelp: 'Prueba AIRLINE IB o SHOW AVAILABILITY MAD AMS.' },
    );
  } else if (parsed.type === 'REFERENCE_TRAIN') {
    const [code] = parsed.args;
    result = baseResult(
      'REFERENCE_TRAIN',
      input,
      [`TRAIN ${code}`, ...formatReference('Tren', code, referenceData.trains[code])],
      'referencia estatica de tren u operador. No consulta plazas, horarios reales ni inventario ferroviario.',
      { contextualHelp: 'Prueba SHOW TRAINS MAD BCN para ver opciones ferroviarias simuladas.' },
    );
  } else if (parsed.type === 'REFERENCE_HOTEL') {
    const [code] = parsed.args;
    result = baseResult(
      'REFERENCE_HOTEL',
      input,
      [`HOTEL ${code}`, ...formatReference('Hotel', code, referenceData.hotels[code])],
      'referencia estatica de cadena hotelera. No consulta disponibilidad, precios ni reservas reales.',
      { contextualHelp: 'Prueba SHOW HOTELS MAD para ver hoteles simulados.' },
    );
  } else if (parsed.type === 'SHOW_HOTELS') {
    const [cityCode] = parsed.args;
    const city = referenceData.airports[cityCode]?.city ?? cityCode;
    result = baseResult(
      'SHOW_HOTELS',
      input,
      [
        `Hoteles simulados ${cityCode} (${city})`,
        '1. Melia Demo Centro 4* tarifa corporativa simulada desayuno opcional',
        '2. NH Training Prado 4* cancelacion simulada hasta 18:00',
        '3. Hilton Sample Airport 4* tarifa flexible simulada',
      ],
      'Listado hotelero simulado con cadenas reales como referencia. No hay precios, cupos ni reserva real.',
      { contextualHelp: 'Usa HOTEL MELIA o HOTEL NH para ver referencia estatica de cadena.' },
    );
  } else if (parsed.type === 'SHOW_TRAINS') {
    const [origin, destination] = parsed.args;
    result = baseResult(
      'SHOW_TRAINS',
      input,
      [
        `Trenes simulados ${origin}-${destination}`,
        '1. AVE 03112 09:00-11:45 tarifa Basica simulada',
        '2. iryo 06120 12:15-14:55 tarifa Flexible simulada',
        '3. OUIGO 09722 17:30-20:10 tarifa Esencial simulada',
      ],
      'Listado ferroviario simulado con marcas reales como referencia. No consulta horarios, plazas ni precios reales.',
      { contextualHelp: 'Usa TRAIN AVE, TRAIN IRYO o TRAIN OUIGO para ver referencias estaticas.' },
    );
  } else if (parsed.type === 'CRYPTIC_AVAILABILITY') {
    const [date, origin, destination, airlineCode] = parsed.args;
    const options = buildSimulatedAvailability(origin, destination, airlineCode ?? 'XX', date);
    session.lastAvailability = options;
    result = baseResult(
      'CRYPTIC_AVAILABILITY',
      input,
      [
        `AN ${date} ${origin}${destination}${airlineCode ? ` /${airlineCode}` : ''}`,
        ...options.map(formatAvailabilityLine),
      ],
      'Formato críptico de entrenamiento inspirado en consulta de disponibilidad. Los vuelos y plazas son simulados.',
      { contextualHelp: 'Usa SS1Y1 para vender de forma ficticia 1 plaza en clase Y de la linea 1.' },
    );
  } else if (parsed.type === 'CRYPTIC_SELL_SEGMENT') {
    const [quantityText, classCode, lineText] = parsed.args;
    const option = session.lastAvailability.find((candidate) => candidate.line === Number(lineText));
    if (!option) {
      result = baseResult(
        'CRYPTIC_SELL_SEGMENT',
        input,
        ['NO AVAILABILITY LINE IN CONTEXT', 'Ejecuta primero una consulta tipo AN17JUNMADAMS/IB.'],
        'No hay linea de disponibilidad simulada para vender. No se ha creado ningun segmento.',
      );
    } else {
      const pnr = ensureTrainingPnr(session);
      const segment = { ...option, classCode, quantity: Number(quantityText) };
      pnr.segments.push(segment);
      result = baseResult(
        'CRYPTIC_SELL_SEGMENT',
        input,
        [`segmento ${lineText} vendido en PNR ficticio`, `${segment.flight} ${classCode} ${segment.date} ${segment.origin}${segment.destination} HK${segment.quantity} ${segment.departure} ${segment.arrival}`],
        'Venta simulada: crea un segmento HK dentro del PNR local de entrenamiento, sin tocar inventario real.',
        { contextualHelp: 'Añade nombre con NM1GARCIA/ANA MS y contacto con AP MAD 600000000.' },
      );
    }
  } else if (parsed.type === 'CRYPTIC_NAME') {
    const [countText, name] = parsed.args;
    const pnr = ensureTrainingPnr(session);
    for (let index = 0; index < Number(countText); index += 1) {
      pnr.names.push(name);
    }
    result = baseResult(
      'CRYPTIC_NAME',
      input,
      [`NM OK - ${countText} pasajero(s) añadido(s)`, ...pnr.names.map((item, index) => `${index + 1}. ${item}`)],
      'Nombre añadido solo al PNR ficticio local. Usa datos inventados en practicas.',
      { contextualHelp: 'Continua con AP MAD 600000000 para añadir contacto ficticio.' },
    );
  } else if (parsed.type === 'CRYPTIC_CONTACT') {
    const [contact] = parsed.args;
    const pnr = ensureTrainingPnr(session);
    pnr.contacts.push(contact);
    result = baseResult(
      'CRYPTIC_CONTACT',
      input,
      [`AP OK - ${contact}`],
      'Contacto guardado en el PNR ficticio. No uses telefonos, emails ni datos reales de clientes.',
      { contextualHelp: 'Usa TKOK para marcar ticketing ficticio.' },
    );
  } else if (parsed.type === 'CRYPTIC_TICKETING') {
    const pnr = ensureTrainingPnr(session);
    pnr.ticketing = 'TKOK';
    result = baseResult(
      'CRYPTIC_TICKETING',
      input,
      ['TKOK OK - ticketing ficticio marcado'],
      'TKOK queda registrado como marcador de entrenamiento. No emite billete ni crea documento real.',
      { contextualHelp: 'Usa RF ANA para registrar recibido de forma ficticia.' },
    );
  } else if (parsed.type === 'CRYPTIC_RECEIVED_FROM') {
    const [receivedFrom] = parsed.args;
    const pnr = ensureTrainingPnr(session);
    pnr.receivedFrom = receivedFrom;
    result = baseResult(
      'CRYPTIC_RECEIVED_FROM',
      input,
      [`RF OK - ${receivedFrom}`],
      'Recibido de guardado en PNR ficticio. Sirve para practicar documentacion, no para cerrar transacciones reales.',
      { contextualHelp: 'Usa RT para visualizar el PNR ficticio.' },
    );
  } else if (parsed.type === 'CRYPTIC_RETRIEVE_PNR') {
    result = baseResult(
      'CRYPTIC_RETRIEVE_PNR',
      input,
      formatTrainingPnr(session),
      'RT muestra el PNR local de entrenamiento. No existe localizador real ni reserva en ningun sistema.',
      { contextualHelp: 'Usa RESET para limpiar el PNR ficticio y empezar de nuevo.' },
    );
  } else if (parsed.type === 'PROHIBITED') {
    result = baseResult(
      'PROHIBITED',
      input,
      ['Comando bloqueado: no se permiten operaciones transaccionales ni datos de pago en este simulador.'],
      'El entorno de entrenamiento no ejecuta emision, reembolso, reemision ni procesamiento de pagos.',
      { safe: false, status: 'BLOCKED' },
    );
  } else if (parsed.type === 'EMPTY') {
    result = baseResult('EMPTY', input, [parsed.message], 'No se ha ejecutado ningun comando.');
  } else if (parsed.type !== 'UNKNOWN') {
    result = baseResult(
      parsed.type,
      input,
      [`${parsed.type}: comando reconocido, pendiente de implementacion en el simulador de entrenamiento.`],
      'El comando se ha identificado de forma segura, pero todavia no tiene una simulacion ejecutable.',
      { status: 'NOT_IMPLEMENTED' },
    );
  } else {
    result = baseResult(
      'UNKNOWN',
      input,
      [parsed.message],
      'El simulador bloquea comandos no soportados para evitar confundir practica con produccion.',
      { safe: false, contextualHelp: 'Escribe HELP para ver la lista cerrada de comandos seguros.' },
    );
  }

  session.transcript.push(result);
  return result;
}
