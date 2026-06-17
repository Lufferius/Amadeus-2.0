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
  return input.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function createTerminalSession() {
  return {
    history: [],
    transcript: [],
    activePractice: null,
    score: { correct: 0, total: 0 },
    mistakes: [],
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
  const normalized = normalize(input);

  if (!normalized) {
    return {
      type: 'EMPTY',
      safe: true,
      args: [],
      message: 'Escribe HELP para ver comandos disponibles del simulador.',
    };
  }

  if (normalized === 'HELP') {
    return { type: 'HELP', safe: true, args: [] };
  }

  if (normalized === 'RESET') {
    return { type: 'RESET', safe: true, args: [] };
  }

  const glossaryMatch = normalized.match(/^GLOSSARY\s+([A-Z_]+)$/);
  if (glossaryMatch) {
    return { type: 'GLOSSARY', safe: true, args: [glossaryMatch[1]] };
  }

  if (normalized === 'SHOW SAMPLE_PNR') {
    return { type: 'SHOW_SAMPLE_PNR', safe: true, args: [] };
  }

  const availabilityMatch = normalized.match(/^SHOW\s+AVAILABILITY\s+([A-Z]{3})\s+([A-Z]{3})(?:\s+([A-Z0-9]{2}))?$/);
  if (availabilityMatch) {
    return { type: 'SHOW_AVAILABILITY', safe: true, args: [availabilityMatch[1], availabilityMatch[2], availabilityMatch[3]] };
  }

  const fareRuleMatch = normalized.match(/^SHOW\s+FARE_RULE\s+(BASIC|FLEX)$/);
  if (fareRuleMatch) {
    return { type: 'SHOW_FARE_RULE', safe: true, args: [fareRuleMatch[1]] };
  }

  const practiceMatch = normalized.match(/^PRACTICE\s+(SEGMENTS|SSR_OSI|FARES)$/);
  if (practiceMatch) {
    return { type: 'PRACTICE', safe: true, args: [practiceMatch[1]] };
  }

  const airlineMatch = normalized.match(/^AIRLINE\s+([A-Z0-9]{2})$/);
  if (airlineMatch) {
    return { type: 'REFERENCE_AIRLINE', safe: true, args: [airlineMatch[1]] };
  }

  const airportMatch = normalized.match(/^AIRPORT\s+([A-Z]{3})$/);
  if (airportMatch) {
    return { type: 'REFERENCE_AIRPORT', safe: true, args: [airportMatch[1]] };
  }

  const trainMatch = normalized.match(/^TRAIN\s+([A-Z0-9_]+)$/);
  if (trainMatch) {
    return { type: 'REFERENCE_TRAIN', safe: true, args: [trainMatch[1]] };
  }

  const hotelMatch = normalized.match(/^HOTEL\s+([A-Z0-9_]+)$/);
  if (hotelMatch) {
    return { type: 'REFERENCE_HOTEL', safe: true, args: [hotelMatch[1]] };
  }

  const hotelsMatch = normalized.match(/^SHOW\s+HOTELS\s+([A-Z]{3})$/);
  if (hotelsMatch) {
    return { type: 'SHOW_HOTELS', safe: true, args: [hotelsMatch[1]] };
  }

  const trainsMatch = normalized.match(/^SHOW\s+TRAINS\s+([A-Z]{3})\s+([A-Z]{3})$/);
  if (trainsMatch) {
    return { type: 'SHOW_TRAINS', safe: true, args: [trainsMatch[1], trainsMatch[2]] };
  }

  return {
    type: 'UNKNOWN',
    safe: false,
    args: [normalized],
    message: 'Comando no permitido en este simulador. Usa HELP: no hay conexion real ni operaciones de produccion.',
  };
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
  } else if (parsed.type === 'EMPTY') {
    result = baseResult('EMPTY', input, [parsed.message], 'No se ha ejecutado ningun comando.');
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
