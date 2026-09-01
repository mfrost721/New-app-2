/**
 * Formal Analysis Engine
 * Data models and concepts for Theme & Variations, Rondo, Sonata-Allegro Form,
 * and Large-Scale Formal & Post-Tonal Analysis.
 */

export type FormType =
  | 'Sonata-Allegro'
  | 'Rondo (5-Part)'
  | 'Rondo (7-Part / Sonata-Rondo)'
  | 'Theme and Variations'
  | 'Ternary (ABA)'
  | 'Binary (AB / Rounded Binary)';

export interface FormSection {
  name: string;
  description: string;
  typicalKeyRelation?: string;
  functions: string[];
}

export interface SonataFormStructure {
  exposition: {
    primaryThemeGroup: string;
    transition: string;
    secondaryThemeGroup: string;
    closingTheme: string;
  };
  development: {
    core: string;
    retransition: string;
  };
  recapitulation: {
    primaryThemeGroup: string;
    transition: string;
    secondaryThemeGroup: string;
    closingTheme: string;
  };
  coda?: string;
}

export const SONATA_FORM_EXPLANATIONS: Record<string, string> = {
  'Exposition': 'Introduces the principal thematic material in the tonic key, transitions to secondary key area (Dominant in major, Relative Major in minor), and presents the secondary theme group.',
  'Development': 'Develops motifs from exposition through thematic fragmentation, sequence, rapid modulations, and builds tension until the retransition on the dominant pedal.',
  'Recapitulation': 'Restates all primary and secondary themes from the exposition, but resolves key conflict by retaining the secondary theme in the TONIC key.',
  'Transition / Bridge': 'Modulatory section between primary and secondary themes that destabilizes the tonic key and establishes the secondary key area.',
  'Retransition': 'End of development section, typically emphasizing a dominant pedal to prepare for the return of the tonic and primary theme in the recapitulation.',
  'Coda': 'Optional closing section after the recapitulation that provides a decisive resolution to the entire movement.',
};

export const RONDO_FORM_SCHEMES: Record<string, string[]> = {
  '5-Part Rondo': ['A', 'B', 'A', 'C', 'A'],
  '7-Part / Sonata-Rondo': ['A', 'B', 'A', 'C', 'A', 'B', 'A'],
};

export interface FormalQuestionData {
  id: string;
  formType: FormType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const FORMAL_ANALYSIS_DATABASE: FormalQuestionData[] = [
  {
    id: 'form_1',
    formType: 'Sonata-Allegro',
    prompt: 'In a classical Sonata-Allegro form in C major, what key is the Secondary Theme Group expected to be in during the RECAPITULATION?',
    options: ['G major (Dominant)', 'C major (Tonic)', 'A minor (Relative Minor)', 'F major (Subdominant)'],
    correctAnswer: 'C major (Tonic)',
    explanation: 'In the Recapitulation, the structural key conflict is resolved: the Secondary Theme is transposed to the TONIC key (C major).',
  },
  {
    id: 'form_2',
    formType: 'Sonata-Allegro',
    prompt: 'What section of Sonata-Allegro form is characterized by a dominant pedal tone preparing the return of the tonic theme?',
    options: ['Exposition Transition', 'Development Retransition', 'Closing Zone', 'Coda'],
    correctAnswer: 'Development Retransition',
    explanation: 'The Retransition at the end of the Development section frequently prolongs V (dominant pedal) to create strong expectation for the tonic return in the Recapitulation.',
  },
  {
    id: 'form_3',
    formType: 'Rondo (5-Part)',
    prompt: 'What is the standard sectional scheme of a 5-part Classical Rondo form?',
    options: ['A-B-A-C-A', 'A-B-C-D-A', 'A-B-A-B-A', 'A-B-C-B-A'],
    correctAnswer: 'A-B-A-C-A',
    explanation: '5-part Rondo alternates the main refrain A with contrasting episodes B and C (A-B-A-C-A).',
  },
  {
    id: 'form_4',
    formType: 'Theme and Variations',
    prompt: 'In Classical Theme & Variations form, which element usually remains constant or recognizable across variations?',
    options: ['Harmonic progression or phrase structure', 'Instrumentation and register', 'Meter and tempo', 'Dynamic level'],
    correctAnswer: 'Harmonic progression or phrase structure',
    explanation: 'While ornamentation, rhythm, meter, and mode change across variations, the underlying harmonic framework and phrase structure of the theme remain intact.',
  },
];
