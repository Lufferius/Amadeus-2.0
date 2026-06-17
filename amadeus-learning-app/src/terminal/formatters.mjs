function formatRow(row) {
  const stopText = row.stops === 0 ? 'NONSTOP' : `${row.stops} STOP`;
  return `${String(row.line).padStart(3, ' ')} ${row.flight.padEnd(7, ' ')} ${row.classes.padEnd(20, ' ')} ${row.departure}-${row.arrival} ${stopText}`;
}

export function formatAvailabilityPage(availability) {
  const { query, rows, offset, pageSize } = availability;
  const maxOffset = Math.max(0, rows.length - pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = offset === maxOffset ? pageCount : Math.floor(offset / pageSize) + 1;
  const visibleRows = rows.slice(offset, offset + pageSize);

  return [
    `AVAILABILITY ${query.date} ${query.origin}-${query.destination}${query.airlineCode ? ` /${query.airlineCode}` : ''}`,
    'SIMULATED AVAILABILITY - NO LIVE INVENTORY',
    ...visibleRows.map(formatRow),
    `PAGE ${page}/${pageCount}`,
  ].join('\n');
}

export function formatAvailabilityDetail(row) {
  const stops = row.stops === 0
    ? 'STOPS: NONSTOP'
    : `STOPS: ${row.stops}${row.via ? ` VIA ${row.via}` : ''}`;

  return [
    `FLIGHT ${row.flight}`,
    `ROUTE ${row.origin}-${row.destination} ${row.date}`,
    `TIMES ${row.departure}-${row.arrival}`,
    `CLASSES ${row.classes}`,
    `EQUIPMENT ${row.equipment}`,
    `DURATION ${row.duration}`,
    stops,
    'TRAINING / SIMULATED - NO LIVE INVENTORY',
  ].join('\n');
}
