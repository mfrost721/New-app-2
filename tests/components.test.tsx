import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyboardVisualizer from '../components/KeyboardVisualizer';
import PitchClassClock from '../components/PitchClassClock';
import MatrixGrid from '../components/MatrixGrid';
import ScoreViewer from '../components/ScoreViewer';
import LayoutWrapper from '../components/LayoutWrapper';
import TheoryAnswerInput from '../components/TheoryAnswerInput';
import TheoryFeedback from '../components/TheoryFeedback';
import TheoryDrillPanel from '../components/TheoryDrillPanel';
import AuralDrillPanel from '../components/AuralDrillPanel';
import DictationPanel from '../components/DictationPanel';
import SightSingingStudio from '../components/SightSingingStudio';
import PianoExercisePicker from '../components/PianoExercisePicker';
import SelfRubricPanel from '../components/SelfRubricPanel';
import MidiPerformancePanel from '../components/MidiPerformancePanel';
import { CURRICULUM_EXERCISES } from '../lib/music/pianoCurriculum';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Component Rendering & Interactive Behavior', () => {
  describe('KeyboardVisualizer', () => {
    it('renders the requested number of piano keys and active highlight states', () => {
      render(
        <KeyboardVisualizer
          startMidi={60}
          numKeys={12}
          activeMidis={[60, 64, 67]}
          labelMode="note"
        />
      );

      const keys = screen.getAllByRole('button');
      expect(keys.length).toBe(12);

      // C4 is key 60, should have aria-pressed="true"
      const cKey = screen.getByLabelText(/MIDI 60/i);
      expect(cKey.getAttribute('aria-pressed')).toBe('true');

      // C#4 is key 61, not in activeMidis -> aria-pressed="false"
      const csKey = screen.getByLabelText(/MIDI 61/i);
      expect(csKey.getAttribute('aria-pressed')).toBe('false');
    });

    it('triggers onNoteClick callback when interactive key is clicked', () => {
      const handleNoteClick = vi.fn();
      render(
        <KeyboardVisualizer
          startMidi={60}
          numKeys={12}
          onNoteClick={handleNoteClick}
          interactive={true}
        />
      );

      const cKey = screen.getByLabelText(/MIDI 60/i);
      fireEvent.click(cKey);

      expect(handleNoteClick).toHaveBeenCalledWith(60);
    });

    it('displays solfege and scale degree labels accurately', () => {
      const { rerender } = render(
        <KeyboardVisualizer startMidi={60} numKeys={1} labelMode="solfege" />
      );
      expect(screen.getByText('Do')).toBeDefined();

      rerender(<KeyboardVisualizer startMidi={60} numKeys={1} labelMode="scaleDegree" />);
      expect(screen.getByText('1')).toBeDefined();
    });
  });

  describe('PitchClassClock', () => {
    it('renders 12 node buttons and highlights selected pitch classes with accessible SVG attributes', () => {
      const handleToggle = vi.fn();
      render(
        <PitchClassClock
          selectedPcs={[0, 4, 7]}
          onTogglePc={handleToggle}
          showNoteNames={true}
        />
      );

      screen.getByRole('group', { name: /Interactive Pitch-Class Clock Visualizer/i });

      const nodes = screen.getAllByRole('button');
      expect(nodes.length).toBe(12);

      const pc0Node = screen.getByRole('button', { name: /Toggle pitch class 0/i });
      fireEvent.click(pc0Node);
      expect(handleToggle).toHaveBeenCalledWith(0);
    });
  });

  describe('MatrixGrid', () => {
    it('renders 12x12 matrix for valid P0 row in non-interactive display mode', () => {
      const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
      render(<MatrixGrid p0Row={p0Row} showNotes={true} interactive={false} />);

      expect(screen.getByText('P \\ I')).toBeDefined();
      expect(screen.getByText('I0')).toBeDefined();
      expect(screen.getByText('P0')).toBeDefined();
    });

    it('renders user input fields in interactive mode and responds to changes', () => {
      const p0Row = [0, 11, 7, 8, 2, 1, 9, 10, 4, 3, 5, 6];
      const userMatrix = Array.from({ length: 12 }, () => Array(12).fill(undefined));
      const handleCellChange = vi.fn();

      render(
        <MatrixGrid
          p0Row={p0Row}
          userMatrix={userMatrix}
          onCellChange={handleCellChange}
          interactive={true}
        />
      );

      const cellInput = screen.getByLabelText('Matrix cell row 1 column 1');
      fireEvent.change(cellInput, { target: { value: '5' } });

      expect(handleCellChange).toHaveBeenCalledWith(0, 0, 5);
    });
  });

  describe('ScoreViewer', () => {
    it('renders score viewer header, notes, and annotations', () => {
      const handleNoteClick = vi.fn();
      render(
        <ScoreViewer
          title="Analysis Excerpt"
          clef="treble"
          timeSignature={[4, 4]}
          notes={[
            { pitch: 'C4', duration: 'quarter', annotation: 'Root' },
            { pitch: 'E4', duration: 'quarter' },
          ]}
          annotations={[{ measure: 1, label: 'Tonic Harmony' }]}
          onNoteClick={handleNoteClick}
        />
      );

      expect(screen.getByText('Analysis Excerpt')).toBeDefined();
      expect(screen.getByText('TREBLE CLEF | 4/4')).toBeDefined();
      expect(screen.getByText('Root')).toBeDefined();
      expect(screen.getByText('m.1: Tonic Harmony')).toBeDefined();

      const noteBtn = screen.getByLabelText(/Note C4, quarter, annotation Root/i);
      fireEvent.click(noteBtn);
      expect(handleNoteClick).toHaveBeenCalledWith(0);
    });
  });

  describe('LayoutWrapper', () => {
    it('renders navigation with accessible label and marks active page with aria-current', () => {
      render(
        <LayoutWrapper>
          <div>Test Content</div>
        </LayoutWrapper>
      );

      const nav = screen.getByRole('navigation', { name: 'Main Navigation' });
      expect(nav).toBeDefined();

      const activeLink = screen.getByRole('link', { name: /Dashboard/i });
      expect(activeLink.getAttribute('aria-current')).toBe('page');

      const inactiveLink = screen.getByRole('link', { name: /Theory IV/i });
      expect(inactiveLink.getAttribute('aria-current')).toBeNull();
    });
  });

  describe('Theory Extracted Components', () => {
    it('TheoryAnswerInput handles multiple choice option clicks and text input submissions', () => {
      const handleChange = vi.fn();
      const handleSubmit = vi.fn();

      // Options mode
      const { rerender } = render(
        <TheoryAnswerInput
          options={['Major 3rd', 'Minor 3rd', 'Perfect 5th']}
          value=""
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      );

      const optBtn = screen.getByText('Major 3rd');
      fireEvent.click(optBtn);
      expect(handleChange).toHaveBeenCalledWith('Major 3rd');
      expect(handleSubmit).toHaveBeenCalledWith('Major 3rd');

      // Text mode
      rerender(
        <TheoryAnswerInput
          value="C E G"
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtn);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('TheoryFeedback renders validation results and controls', () => {
      const handleNext = vi.fn();
      const handleRetry = vi.fn();

      render(
        <TheoryFeedback
          validationResult={{
            isCorrect: false,
            explanation: 'Incorrect answer provided.',
            userAnswer: 'wrong',
            expectedAnswer: 'correct',
          }}
          onNextQuestion={handleNext}
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Incorrect')).toBeDefined();
      expect(screen.getByText('Incorrect answer provided.')).toBeDefined();

      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalled();

      const nextBtn = screen.getByRole('button', { name: /Next Question/i });
      fireEvent.click(nextBtn);
      expect(handleNext).toHaveBeenCalled();
    });

    it('TheoryDrillPanel renders question prompt and difficulty controls', () => {
      const handleSelectCategory = vi.fn();
      const handleSelectDifficulty = vi.fn();
      const handleNewSeed = vi.fn();
      const handleSubmitAnswer = vi.fn();
      const handleNextQuestion = vi.fn();
      const handleRetry = vi.fn();

      render(
        <TheoryDrillPanel
          drillCategory="tonal"
          onSelectCategory={handleSelectCategory}
          drillDifficulty={1}
          onSelectDifficulty={handleSelectDifficulty}
          seedInput={42}
          onNewSeed={handleNewSeed}
          currentQuestion={{
            id: 'test_q',
            skillId: 't1',
            topic: 'Intervals',
            category: 'tonal',
            difficulty: 1,
            prompt: 'Identify the interval C4 to E4.',
            options: ['Major 3rd', 'Minor 3rd'],
            inputType: 'spelling_text',
            correctAnswer: 'Major 3rd',
            spellingSensitive: false,
            explanation: 'C4 to E4 is a major third.',
          }}
          userDrillInput=""
          onUserInputChange={vi.fn()}
          onSubmitAnswer={handleSubmitAnswer}
          validationResult={null}
          onNextQuestion={handleNextQuestion}
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Identify the interval C4 to E4.')).toBeDefined();

      const diff2Btn = screen.getByRole('button', { name: '2' });
      fireEvent.click(diff2Btn);
      expect(handleSelectDifficulty).toHaveBeenCalledWith(2);
    });
  });

  describe('Aural Extracted Components', () => {
    it('AuralDrillPanel renders solfege ladder for noteInKey mode and chord functions for chordsAnd64 mode', () => {
      const handleSelectDegree = vi.fn();
      const handleSelectFunction = vi.fn();

      const { rerender } = render(
        <AuralDrillPanel
          activeTab="noteInKey"
          onPlayCadence={vi.fn()}
          onSelectDegree={handleSelectDegree}
          onPlayCadential64={vi.fn()}
          onSelectFunction={handleSelectFunction}
        />
      );

      const doBtn = screen.getByRole('button', { name: /Do \(1\)/i });
      fireEvent.click(doBtn);
      expect(handleSelectDegree).toHaveBeenCalledWith(0, 'Do (1)');

      rerender(
        <AuralDrillPanel
          activeTab="chordsAnd64"
          onPlayCadence={vi.fn()}
          onSelectDegree={handleSelectDegree}
          onPlayCadential64={vi.fn()}
          onSelectFunction={handleSelectFunction}
        />
      );

      const cadentialBtn = screen.getByRole('button', { name: /^Cadential 6\/4$/i });
      fireEvent.click(cadentialBtn);
      expect(handleSelectFunction).toHaveBeenCalledWith('cadential', 'Cadential 6/4');
    });

    it('DictationPanel renders score viewer and audio controls', () => {
      const handlePlay = vi.fn();
      const handleSubmit = vi.fn();

      render(<DictationPanel onPlayMelody={handlePlay} onSubmitDictation={handleSubmit} />);

      expect(screen.getByText('Melodic Dictation Prompt (4 Measures)')).toBeDefined();

      const playBtn = screen.getByRole('button', { name: /Play Melody Audio/i });
      fireEvent.click(playBtn);
      expect(handlePlay).toHaveBeenCalled();

      const submitBtn = screen.getByRole('button', { name: /Submit Dictation/i });
      fireEvent.click(submitBtn);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('SightSingingStudio renders target note and recording toggle', () => {
      const handleSuccess = vi.fn();
      const handleError = vi.fn();

      render(
        <SightSingingStudio
          targetMidi={64}
          onSuccess={handleSuccess}
          onErrorFeedback={handleError}
        />
      );

      expect(screen.getByText(/Live Microphone Sight-Singing Studio/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Start Recording \(5s\)/i })).toBeDefined();
    });
  });

  describe('Piano Extracted Components', () => {
    it('PianoExercisePicker renders level drills and category filters', () => {
      const handleSelectExercise = vi.fn();
      const handleSelectCategory = vi.fn();

      render(
        <PianoExercisePicker
          selectedLevel="Class Piano IV"
          onSelectLevel={vi.fn()}
          selectedCategory="all"
          onSelectCategory={handleSelectCategory}
          filteredExercises={CURRICULUM_EXERCISES.slice(0, 3)}
          selectedExerciseId={CURRICULUM_EXERCISES[0].id}
          onSelectExercise={handleSelectExercise}
          userStore={null}
          customKey="C"
          onCustomKeyChange={vi.fn()}
          customScaleType="Major"
          onCustomScaleTypeChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Class Piano IV Modules/i)).toBeDefined();

      const exItem = screen.getByText(CURRICULUM_EXERCISES[0].title);
      fireEvent.click(exItem);
      expect(handleSelectExercise).toHaveBeenCalledWith(CURRICULUM_EXERCISES[0].id);
    });

    it('SelfRubricPanel renders sliders and computes rubric score', () => {
      const handleEvaluate = vi.fn();
      const handleCommit = vi.fn();

      render(
        <SelfRubricPanel
          rubricAccuracy={25}
          onRubricAccuracyChange={vi.fn()}
          rubricTempo={20}
          onRubricTempoChange={vi.fn()}
          rubricTechnique={20}
          onRubricTechniqueChange={vi.fn()}
          rubricHarmony={20}
          onRubricHarmonyChange={vi.fn()}
          rubricResult={{
            totalScore: 85,
            gradeLabel: 'High Distinction',
            categories: [
              { name: 'Note Accuracy', score: 25, maxPoints: 25, comments: 'Good' },
              { name: 'Tempo & Rhythm', score: 20, maxPoints: 25, comments: 'Good' },
            ],
            feedback: ['Excellent pitch accuracy'],
          }}
          onEvaluateRubric={handleEvaluate}
          onCommitRubric={handleCommit}
        />
      );

      expect(screen.getByText(/Transparent Exam Rubric Certification/i)).toBeDefined();

      const evalBtn = screen.getByRole('button', { name: /Compute Rubric Score/i });
      fireEvent.click(evalBtn);
      expect(handleEvaluate).toHaveBeenCalled();

      const certBtn = screen.getByRole('button', { name: /Certify Rubric Grade/i });
      fireEvent.click(certBtn);
      expect(handleCommit).toHaveBeenCalledWith(85, true);
    });

    it('MidiPerformancePanel renders exercise header, keyboard, and rubric panel', () => {
      render(
        <MidiPerformancePanel
          currentExercise={CURRICULUM_EXERCISES[0]}
          playedEvents={[]}
          directResult={null}
          onNoteClick={vi.fn()}
          onClearBuffer={vi.fn()}
          previewCountdown={null}
          onStartPreviewTimer={vi.fn()}
          onCommitDirectAttempt={vi.fn()}
          rubricProps={{
            rubricAccuracy: 25,
            onRubricAccuracyChange: vi.fn(),
            rubricTempo: 20,
            onRubricTempoChange: vi.fn(),
            rubricTechnique: 20,
            onRubricTechniqueChange: vi.fn(),
            rubricHarmony: 20,
            onRubricHarmonyChange: vi.fn(),
            rubricResult: null,
            onEvaluateRubric: vi.fn(),
            onCommitRubric: vi.fn(),
          }}
          skillItem={undefined}
          pianoStreak={5}
        />
      );

      expect(screen.getAllByText(CURRICULUM_EXERCISES[0].title).length).toBeGreaterThan(0);
      expect(screen.getByText(/Interactive Piano Keyboard/i)).toBeDefined();
    });
  });
});
