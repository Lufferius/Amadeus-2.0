function hasSuccessfulResult(session, type) {
  return session.transcript.some((entry) => entry?.type === type && entry?.status === 'OK');
}

export const scenarios = [
  {
    id: 'basic-one-way-pnr',
    title: 'PNR basico de ida',
    objective: 'Construir y guardar un PNR aereo ficticio completo.',
    steps: [
      { id: 'availability', title: 'Consultar disponibilidad', hint: 'Consulta una ruta con AN.', complete: (session) => Boolean(session.availability?.rows?.length) },
      { id: 'segment', title: 'Seleccionar un segmento', hint: 'Vende una opcion ficticia con SS.', complete: (session) => session.pnr.segments.length >= 1 },
      {
        id: 'required-elements',
        title: 'Completar elementos obligatorios',
        hint: 'Anade nombre, contacto, ticketing y recibido de.',
        complete: (session) => Boolean(session.pnr.names.length && session.pnr.contacts.length && session.pnr.ticketing && session.pnr.receivedFrom),
      },
      { id: 'commit', title: 'Validar y guardar', hint: 'Finaliza el PNR ficticio con ER.', complete: (session) => Boolean(session.pnr.locator && session.records[session.pnr.locator]) },
    ],
  },
  {
    id: 'ssr-osi-quality',
    title: 'Calidad SSR y OSI',
    objective: 'Distinguir solicitudes especiales de informacion operativa.',
    steps: [
      { id: 'ssr', title: 'Registrar un SSR', hint: 'Anade una solicitud especial ficticia.', complete: (session) => session.pnr.ssrs.length >= 1 },
      { id: 'osi', title: 'Registrar un OSI', hint: 'Anade informacion ficticia para un transportista.', complete: (session) => session.pnr.osis.length >= 1 },
      { id: 'quality-review', title: 'Revisar clasificacion', hint: 'Comprueba que hay un SSR y un OSI separados.', complete: (session) => session.pnr.ssrs.length >= 1 && session.pnr.osis.length >= 1 },
    ],
  },
  {
    id: 'pricing-comparison',
    title: 'Comparacion de pricing',
    objective: 'Diferenciar cotizacion informativa, tarifa almacenada y reglas.',
    steps: [
      { id: 'informative-fare', title: 'Cotizacion informativa', hint: 'Obtiene pricing sin guardarlo.', complete: (session) => hasSuccessfulResult(session, 'FARE_PRICE_INFORMATIVE') },
      { id: 'stored-fare', title: 'Tarifa almacenada', hint: 'Guarda una tarifa ficticia en el PNR.', complete: (session) => Boolean(session.pnr.storedFare) },
      { id: 'fare-rules', title: 'Revisar reglas', hint: 'Consulta las reglas ficticias de la tarifa.', complete: (session) => hasSuccessfulResult(session, 'FARE_RULE_DETAIL') },
    ],
  },
];

export function getScenario(id) {
  return scenarios.find((scenario) => scenario.id === id) ?? null;
}

export function evaluateScenario(id, session) {
  const scenario = getScenario(id);
  if (!scenario) {
    return { errorCode: 'SCENARIO_NOT_FOUND', complete: false, completedCount: 0, totalSteps: 0, currentStep: null, steps: [] };
  }
  const steps = scenario.steps.map((step) => ({
    id: step.id,
    title: step.title,
    hint: step.hint,
    complete: Boolean(step.complete(session)),
  }));
  const completedCount = steps.filter((step) => step.complete).length;
  return {
    scenarioId: scenario.id,
    complete: completedCount === steps.length,
    completedCount,
    totalSteps: steps.length,
    currentStep: steps.find((step) => !step.complete) ?? null,
    steps,
  };
}

