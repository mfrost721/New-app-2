# Frost Music Lab — University Music Examination Preparation System

An adaptive study, ear-training, theory-analysis, sight-singing, and piano-proficiency application designed specifically to prepare students to pass three university music examinations:

1. **Music Theory IV** (Set theory, 12-tone serialism, mode/scale construction, large formal analysis, 20th-century rhythm)
2. **Aural Skills IV** (Solfege, 7th chords, 6/4 chord functions, secondary dominants, melodic/rhythmic dictation, microphone sight-singing)
3. **Class Piano IV Proficiency** (2-octave scales & arpeggios @ 100bpm, melody harmonization, transposition, Happy Birthday project, sight-reading exam simulator)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Local Setup

```bash
# Install dependencies cleanly
npm ci

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

```bash
# Run unit tests
npm test

# Run type check
npx tsc --noEmit

# Run Linter
npm run lint

# Build production bundle
npm run build
```

---

## 🛠 Features & Capabilities

- **Deterministic Music Engines**: Precise pitch-class set calculations (normal order, prime form, interval-class vectors `<ic1..ic6>`), 12-tone matrix generation ($P_n, I_n, R_n, RI_n$), and scale/chord spelling.
- **Sight-Singing Studio**: Real-time microphone audio autocorrelation pitch detection with cents deviation display.
- **Piano Performance Lab**: Hardware Web MIDI keyboard support for real-time note input and self-certified technique gauntlets.
- **Adaptive Spaced Repetition**: EWMA-weighted mastery scoring, response latency tracking, and "Next Best 20 Minutes" practice prescriptions.
- **Road Mode Toggle**: Mobile-friendly streak protection that adapts practice recommendations when traveling without access to a piano keyboard.
- **Error Analytics & Knowledge Base**: Micro-lessons linked to practice drills, error pattern logs, and full JSON data export.
