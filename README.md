# Frost Music Lab

An adaptive music study application for **Music Theory IV**, **Aural Skills IV**, and **Class Piano IV Proficiency**. Frost Music Lab combines ear training, set theory analysis, 12-tone matrix speed runs, sight-singing with live pitch detection, and a Web Audio piano synthesizer into a single integrated exam-preparation platform.

## Features

- **Music Theory** — Deterministic set theory (prime form, interval vector, Z-relation), 12-tone matrix generation, scale/mode builder, chord harmony analysis
- **Aural Skills** — Autocorrelation microphone pitch detection for sight-singing, interval and chord identification drills
- **Piano Proficiency** — Web Audio synthesizer with Web MIDI input support, technique exercises
- **Spaced Repetition Engine** — Adaptive mastery tracking, Home/Road study modes
- **Mock Exam Analytics** — Comprehensive performance dashboard with streak tracking
- **Knowledge Base** — Reference library for music theory concepts

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Running Tests

Unit tests are written with [Vitest](https://vitest.dev):

```bash
npx vitest run
```

To run a specific test file:

```bash
npx vitest run tests/musicTheory.test.ts
npx vitest run tests/audio.test.ts
```

## Tech Stack

- [Next.js](https://nextjs.org) — React framework
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Tone.js](https://tonejs.github.io) — Web Audio synthesis
- [VexFlow](https://www.vexflow.com) — Music notation rendering
- [Vitest](https://vitest.dev) — Unit testing
