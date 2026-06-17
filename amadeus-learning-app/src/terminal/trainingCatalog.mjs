function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const fare = Object.freeze({
  reference: 'TST1',
  fareBasis: 'YTRN',
  baseCents: 18400,
  taxCents: 4760,
  totalCents: 23160,
  currency: 'EUR',
  ruleNumber: 1,
  simulated: true,
});

const queues = Object.freeze({
  8: Object.freeze([
    Object.freeze({ locator: 'TRN101', reason: 'SCHEDULE CHANGE REVIEW', priority: 'NORMAL' }),
    Object.freeze({ locator: 'TRN102', reason: 'TICKETING DEADLINE REVIEW', priority: 'HIGH' }),
  ]),
});

const profiles = Object.freeze({
  'DEMO CORP': Object.freeze({
    name: 'DEMO CORP',
    policy: 'LOWEST LOGICAL FARE WITH FLEXIBILITY REVIEW',
    preferred: 'IB / TRAINING REFERENCE ONLY',
    contact: 'training@example.invalid',
  }),
});

const help = Object.freeze({
  NM: 'NM adds a fictional passenger name to the local training PNR.',
  SR: 'SR adds a simulated special service request without contacting an airline.',
  FXP: 'FXP stores a fictional fare in the local training PNR; it never issues a ticket.',
  FXX: 'FXX displays informational fictional pricing without storing it.',
  ER: 'ER validates and saves a local training PNR, then displays it again.',
});

export function getTrainingFare() {
  return { ...fare };
}

export function getQueue(number) {
  return queues[number] ? clone(queues[number]) : null;
}

export function getQueueTotals() {
  return Object.entries(queues).map(([number, items]) => ({ number: Number(number), count: items.length }));
}

export function getTrainingProfile(name) {
  return profiles[name] ? { ...profiles[name] } : null;
}

export function getHelpTopic(topic) {
  return help[topic] ?? null;
}

export function listHelpTopics() {
  return Object.keys(help);
}
