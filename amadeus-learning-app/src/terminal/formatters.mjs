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

export function formatPnr(pnr) {
  const header = pnr.locator
    ? `RP/TRAINING ${pnr.locator} STATUS ${pnr.status}`
    : `ACTIVE TRAINING PNR STATUS ${pnr.status}`;
  const lines = [header];

  if (pnr.names.length === 0) lines.push('NO NAMES');
  else pnr.names.forEach((name, index) => lines.push(`NM ${index + 1}. ${name}`));

  if (pnr.segments.length === 0) lines.push('NO SEGMENTS');
  else {
    pnr.segments.forEach((segment, index) => {
      lines.push(
        ` ${index + 1} ${segment.flight} ${segment.classCode} ${segment.date} ${segment.origin}${segment.destination} ${segment.status}${segment.quantity} ${segment.departure} ${segment.arrival}`,
      );
    });
  }

  pnr.contacts.forEach((contact) => lines.push(`AP ${contact}`));
  if (pnr.ticketing) lines.push(`TK ${pnr.ticketing}`);
  pnr.ssrs.forEach((ssr) => lines.push(`SR ${ssr}`));
  pnr.osis.forEach((osi) => lines.push(`OS ${osi.carrier} ${osi.text}`));
  pnr.remarks.forEach((remark) => lines.push(`RM ${remark}`));
  if (pnr.receivedFrom) lines.push(`RF ${pnr.receivedFrom}`);
  if (pnr.storedFare) lines.push(`FARE ${pnr.storedFare.reference ?? 'STORED TRAINING FARE'}`);
  lines.push('TRAINING RECORD - NO REAL BOOKING OR TICKET');
  return lines.join('\n');
}
