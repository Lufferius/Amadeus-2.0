# Terminal simulator spec

## Purpose

Create a safe Amadeus-like training terminal for beginners.

The terminal teaches concepts and simulated workflows.

It must never connect to real Amadeus or any real booking system.

## Disclaimer

Every terminal screen should show:

"Training simulator only. Not connected to Amadeus or any real booking system."

## Supported fake commands for MVP

### HELP

Shows available simulator commands.

### GLOSSARY <TERM>

Example:
GLOSSARY PNR

Returns a beginner-friendly definition.

### SHOW SAMPLE_PNR

Displays a fictional PNR-like record with:
- fictional passenger
- fictional flights
- fictional contact
- fictional remarks
- fictional SSR
- fictional OSI
- fictional ticketing deadline

### SHOW AVAILABILITY <ORIGIN> <DESTINATION>

Example:
SHOW AVAILABILITY MAD AMS

Returns fictional availability with several options:
- direct flight
- connecting flight
- cheaper restrictive fare
- more flexible fare

### SHOW FARE_RULE <TYPE>

Examples:
SHOW FARE_RULE BASIC
SHOW FARE_RULE FLEX

Returns simplified fare rules.

### PRACTICE SEGMENTS

Shows itineraries and asks the learner to count segments.

### PRACTICE SSR_OSI

Shows requests and asks the learner to classify as SSR, OSI, remark, or policy issue.

### PRACTICE FARES

Shows fare options and asks the learner to choose based on policy and risk.

### RESET

Clears the simulated terminal session.

## Important

Do not implement real Amadeus cryptic commands in the MVP.

The goal is conceptual learning first.

Later, a separate mode can introduce real-looking command patterns only if clearly labelled as non-authoritative simulation and verified against official training materials.

## Fake sample data

Use fictional passenger names:
- Ana Demo
- Carlos Example
- Maria Training
- John Sample

Use fictional corporate clients:
- ACME Travel Training
- DemoCorp

Do not use real customer data.

## Feedback style

When the learner makes a mistake:
1. Say clearly what is wrong.
2. Explain why it matters.
3. Give the better answer.
4. Mention risk if relevant.

Example:
"Incorrect. This is not OSI; it is likely SSR because the airline may need to process or confirm the request. Treating it only as information could mean the passenger does not receive the service."
