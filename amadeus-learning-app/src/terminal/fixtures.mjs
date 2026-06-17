const PUBLIC_AIRLINE_CODES = ['IB', 'KL', 'LH', 'AF', 'BA', 'TP', 'UX', 'AZ', 'SK', 'LX'];
const EQUIPMENT = ['320', '321', '32N', '738', 'E90'];
const CLASSES = ['J4 C4 D2 Y9 B9 M7', 'J2 C2 D1 Y9 B7 M4', 'J6 C4 D3 Y9 B9 M9'];

function hashText(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clock(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
}

function durationText(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
}

function buildAvailabilityRows({ date, origin, destination, airlineCode }) {
  const seed = hashText(`${date}:${origin}:${destination}:${airlineCode ?? ''}`);

  return Array.from({ length: 10 }, (_, index) => {
    const airline = airlineCode ?? PUBLIC_AIRLINE_CODES[(seed + index) % PUBLIC_AIRLINE_CODES.length];
    const departureMinutes = 360 + index * 73 + (seed % 29);
    const durationMinutes = 105 + ((seed >>> (index % 16)) % 91);
    const stops = index === 7 ? 1 : 0;
    const row = {
      line: index + 1,
      airline,
      flight: `${airline}${String(1100 + ((seed + index * 137) % 7800)).padStart(4, '0')}`,
      date,
      origin,
      destination,
      departure: clock(departureMinutes),
      arrival: clock(departureMinutes + durationMinutes + stops * 45),
      classes: CLASSES[(seed + index) % CLASSES.length],
      stops,
      equipment: EQUIPMENT[(seed + index) % EQUIPMENT.length],
      duration: durationText(durationMinutes + stops * 45),
      simulated: true,
    };

    if (stops) row.via = 'FRA';
    return row;
  });
}

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

const MAD_AMS_AVAILABILITY = deepFreeze(buildAvailabilityRows({
  date: '17JUN',
  origin: 'MAD',
  destination: 'AMS',
  airlineCode: 'IB',
}));

export function generateAvailabilityRows(query) {
  if (query.date === '17JUN'
    && query.origin === 'MAD'
    && query.destination === 'AMS'
    && query.airlineCode === 'IB') {
    return MAD_AMS_AVAILABILITY.map((row) => ({ ...row }));
  }

  return buildAvailabilityRows(query);
}
