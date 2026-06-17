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

  const availabilityMatch = normalized.match(/^SHOW\s+AVAILABILITY\s+([A-Z]{3})\s+([A-Z]{3})$/);
  if (availabilityMatch) {
    return { type: 'SHOW_AVAILABILITY', safe: true, args: [availabilityMatch[1], availabilityMatch[2]] };
  }

  const fareRuleMatch = normalized.match(/^SHOW\s+FARE_RULE\s+(BASIC|FLEX)$/);
  if (fareRuleMatch) {
    return { type: 'SHOW_FARE_RULE', safe: true, args: [fareRuleMatch[1]] };
  }

  const practiceMatch = normalized.match(/^PRACTICE\s+(SEGMENTS|SSR_OSI|FARES)$/);
  if (practiceMatch) {
    return { type: 'PRACTICE', safe: true, args: [practiceMatch[1]] };
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
    const [origin, destination] = parsed.args;
    result = baseResult(
      'SHOW_AVAILABILITY',
      input,
      [
        `Disponibilidad ficticia ${origin}-${destination}`,
        '1. Directo DEMO101 09:10-11:45 tarifa BASIC restrictiva',
        '2. Conexion DEMO220/DEMO221 10:30-14:50 tarifa BASIC economica',
        '3. Directo DEMO305 16:00-18:35 tarifa FLEX con cambios simulados',
      ],
      'La disponibilidad es inventada. Sirve para comparar horario, conexion, restriccion y flexibilidad.',
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
