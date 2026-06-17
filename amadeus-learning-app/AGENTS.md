# AGENTS.md

## Project

Build an educational web app to help a beginner Travel Consultant learn Amadeus GDS concepts safely.

The app is for a beginner learner working in corporate travel. The learner has little or no Amadeus experience.

The app must teach gradually, from basic travel concepts to controlled simulations.

## Core goal

Create a 6-week guided learning program with:
- daily lessons
- simple explanations
- micro-exercises
- quizzes
- progress tracking
- a safe Amadeus-like terminal simulator
- glossary
- strict feedback
- no real booking capability

## Critical safety rules

This app must NOT connect to real Amadeus, real GDS systems, airlines, ticketing systems, corporate booking tools, payment systems, or production APIs.

The terminal is only a simulator.

The app must not claim that simulated commands are guaranteed to work in real Amadeus.

The app must warn the user that real Amadeus commands, PNR handling, ticketing, reissues, refunds, voids, EMDs, queues, and fare rules must be verified with official training, internal SOPs, supervisor guidance, or authorized documentation.

Never implement functionality that can modify real PNRs, issue tickets, cancel bookings, process refunds, or perform exchanges.

## Teaching philosophy

Do not start with complex real-life cases.

Teach in this order:
1. Basic travel and GDS vocabulary.
2. PNR vs ticket.
3. Segments and itineraries.
4. Required information before searching.
5. PNR anatomy.
6. SSR vs OSI.
7. Seats, baggage, special services.
8. Fares and fare rules.
9. Corporate travel policy.
10. Ticketing deadlines.
11. Changes before and after ticketing.
12. Refund, void, reissue, no-show.
13. Queues and schedule changes.
14. Controlled simulations.

Use short explanations, examples, exercises, and strict corrections.

The student should not use terminal simulations before understanding the concepts.

## App features

Minimum product:
- dashboard with 6-week curriculum
- daily lesson screen
- glossary screen
- quiz screen
- progress tracking
- terminal simulator screen
- feedback after exercises
- safe-mode warnings

Nice to have:
- spaced repetition flashcards
- mistakes log
- daily streak
- final assessment
- teacher mode
- ability to add custom lessons later

## Terminal simulator

The terminal must simulate an Amadeus-like command line for learning only.

It should support fake commands for:
- help
- showing sample availability
- showing sample PNR
- showing fare rule examples
- showing glossary definitions
- practice mode

Use clearly fictional sample data.

Do not use real customer data.

Do not use real passenger data.

Do not use real corporate account data.

Do not use production-like workflows that could be mistaken for official Amadeus training.

Every terminal screen should show a small disclaimer:
"Training simulator only. Not connected to Amadeus or any real booking system."

## Content source

Use docs/curriculum.md as the source of truth for the 6-week program.

Use data/weeks/*.json for structured lesson content.

Use data/glossary.json for glossary terms.

## Style

Language: Spanish from Spain, neutral and clear.

Tone: direct, rigorous, practical.

Avoid fluff.

Explain mistakes clearly.

Always give the better alternative and why it is better.

## Done when

The app runs locally.

The user can:
- open the curriculum
- complete lessons
- answer quizzes
- see corrections
- use a fake terminal simulator
- track progress

Include basic tests where appropriate.
