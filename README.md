# Frost Music Lab — University Music Examination Preparation System

**Live Deployment**: [https://frost-music-lab.vercel.app](https://frost-music-lab.vercel.app)

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

# Merge Gate Requirement (All checks must pass before merging)
npm test && npx tsc --noEmit && npm run lint && npm run build
```

---

## 🗺 Exam Coverage Map

| Skill ID | Course | Topic / Objective |
| --- | --- | --- |
| `t1` | **Theory IV** | Pitch-Class Sets & Prime Form |
| `t2` | **Theory IV** | Interval-Class Vectors |
| `t3` | **Theory IV** | Twelve-Tone Matrix & Transformations |
| `t4` | **Theory IV** | Modes & Symmetrical Scales |
| `t5` | **Theory IV** | Score Analysis & Formal Structures |
| `t6` | **Theory IV** | 20th Century Rhythm & Mixed Meter |
| `a1` | **Aural Skills IV** | Scale-Degree Recognition & Solfege |
| `a2` | **Aural Skills IV** | Seventh-Chord Quality & Inversions |
| `a3` | **Aural Skills IV** | Second-Inversion (6/4) Functions |
| `a4` | **Aural Skills IV** | Secondary Dominants by Ear |
| `a5` | **Aural Skills IV** | Non-Harmonic Tone Aural ID |
| `a6` | **Aural Skills IV** | Melodic Dictation |
| `a7` | **Aural Skills IV** | Sight Singing Accuracy |
| `p3_scale_c_maj` | **Class Piano III** | C Major Scale (2 Octaves) |
| `p3_scale_g_maj` | **Class Piano III** | G Major Scale (2 Octaves) |
| `p3_scale_d_maj` | **Class Piano III** | D Major Scale (2 Octaves) |
| `p3_scale_a_min_harm` | **Class Piano III** | A Harmonic Minor Scale |
| `p3_scale_e_min_mel` | **Class Piano III** | E Melodic Minor Scale |
| `p3_arp_c_maj` | **Class Piano III** | C Major Tonic Arpeggio |
| `p3_cadence_c` | **Class Piano III** | C Major Primary Cadence |
| `p4_scale_eb_maj` | **Class Piano IV** | Eb Major Scale (100bpm) |
| `p4_scale_fs_min_harm` | **Class Piano IV** | F# Harmonic Minor Scale (100bpm) |
| `p4_scale_ab_maj` | **Class Piano IV** | Ab Major Scale (100bpm) |
| `p4_scale_cs_min_mel` | **Class Piano IV** | C# Melodic Minor Scale (100bpm) |
| `p4_arp_d_dim7` | **Class Piano IV** | D Diminished 7th & Resolution |
| `p4_harm_trans_g_to_a` | **Class Piano IV** | Melody Harmonization & Transposition |
| `p4_sight_reading_lvl3` | **Class Piano IV** | Level III Sight-Reading Exam |
| `p4_project_happy_birthday` | **Class Piano IV** | Happy Birthday Project |

---

## 🛠 Features & Capabilities

- **Deterministic Music Engines**: Precise pitch-class set calculations (normal order, prime form, interval-class vectors `<ic1..ic6>`), 12-tone matrix generation ($P_n, I_n, R_n, RI_n$), and scale/chord spelling.
- **Sight-Singing Studio**: Real-time microphone audio autocorrelation pitch detection with cents deviation display.
- **Piano Performance Lab**: Hardware Web MIDI keyboard support for real-time note input and self-certified technique gauntlets.
- **Adaptive Spaced Repetition**: EWMA-weighted mastery scoring, response latency tracking, and "Next Best 20 Minutes" practice prescriptions.
- **Road Mode Toggle**: Mobile-friendly streak protection that adapts practice recommendations when traveling without access to a piano keyboard.
- **Error Analytics & Knowledge Base**: Micro-lessons linked to practice drills, error pattern logs, and full JSON data export.
