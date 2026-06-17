import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommand } from '../src/terminal/commandParser.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const weeksDir = join(root, 'data', 'weeks');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertArray(value, message) {
  assert(Array.isArray(value), message);
}

function assertText(value, message) {
  assert(typeof value === 'string' && value.trim().length > 0, message);
}

function validateTrainingCommand(command, context) {
  const parsed = parseCommand(command);
  assert(
    parsed.safe === true && !['UNKNOWN', 'PROHIBITED', 'EMPTY'].includes(parsed.type),
    `${context}: command ${command} must be supported and safe`,
  );
  return parsed;
}

function assertQuiz(quiz, lessonId) {
  assertArray(quiz, `${lessonId}: quiz must be an array`);
  assert(quiz.length >= 3, `${lessonId}: quiz must include at least 3 questions`);

  for (const question of quiz) {
    assertText(question.id, `${lessonId}: quiz id is required`);
    assert(question.type === 'multiple-choice', `${lessonId}: quiz type must be multiple-choice`);
    assertText(question.question, `${lessonId}: quiz question text is required`);
    assertArray(question.options, `${lessonId}: quiz options must be an array`);
    assert(question.options.length >= 3, `${lessonId}: quiz must include at least 3 options`);
    assert(Number.isInteger(question.correctAnswer), `${lessonId}: quiz correctAnswer is required`);
    assert(
      question.correctAnswer >= 0 && question.correctAnswer < question.options.length,
      `${lessonId}: quiz correctAnswer must point to an option`,
    );
    assertText(question.explanation, `${lessonId}: quiz explanation is required`);
  }
}

function assertLesson(lesson, expectedPrefix) {
  assertText(lesson.id, `${expectedPrefix}: lesson id is required`);
  assert(lesson.id === expectedPrefix, `${lesson.id}: lesson id must be ${expectedPrefix}`);
  assert(Number.isInteger(lesson.week), `${lesson.id}: week is required`);
  assert(Number.isInteger(lesson.day), `${lesson.id}: day is required`);
  assertText(lesson.title, `${lesson.id}: title is required`);
  assert(Number.isInteger(lesson.estimatedMinutes), `${lesson.id}: estimatedMinutes is required`);
  assert(lesson.estimatedMinutes >= 30 && lesson.estimatedMinutes <= 45, `${lesson.id}: estimatedMinutes should follow the lesson format`);
  assertText(lesson.objective, `${lesson.id}: objective is required`);
  assertArray(lesson.explanation, `${lesson.id}: explanation must be an array`);
  assert(lesson.explanation.length >= 2, `${lesson.id}: explanation must include at least 2 paragraphs`);
  lesson.explanation.forEach((paragraph) => assertText(paragraph, `${lesson.id}: explanation paragraph is required`));
  assertArray(lesson.keyConcepts, `${lesson.id}: keyConcepts must be an array`);
  assert(lesson.keyConcepts.length >= 1, `${lesson.id}: keyConcepts must include at least 1 item`);
  lesson.keyConcepts.forEach((concept) => {
    assertText(concept.term, `${lesson.id}: key concept term is required`);
    assertText(concept.definition, `${lesson.id}: key concept definition is required`);
  });
  assertArray(lesson.examples, `${lesson.id}: examples must be an array`);
  assert(lesson.examples.length >= 2, `${lesson.id}: examples must include at least 2 items`);
  lesson.examples.forEach((example) => {
    assertText(example.title, `${lesson.id}: example title is required`);
    assertText(example.content, `${lesson.id}: example content is required`);
    assert(example.simulatedTerminal, `${lesson.id}: example simulatedTerminal is required`);
    assertText(example.simulatedTerminal.command, `${lesson.id}: example simulated terminal command is required`);
    assertArray(example.simulatedTerminal.output, `${lesson.id}: example simulated terminal output must be an array`);
    assert(example.simulatedTerminal.output.length >= 2, `${lesson.id}: example simulated terminal output must include at least 2 lines`);
    assert(example.simulatedTerminal.output[0] === `> ${example.simulatedTerminal.command}`, `${lesson.id}: example output must start with the exact command`);
    assert(!example.simulatedTerminal.output.join('\n').includes('Training simulator only'), `${lesson.id}: example output should not include the generic terminal disclaimer`);
    assertText(example.simulatedTerminal.explanation, `${lesson.id}: example simulated terminal explanation is required`);
    validateTrainingCommand(example.simulatedTerminal.command, `${lesson.id}: example`);
    const exampleText = `${lesson.title} ${example.title} ${example.content}`.toLowerCase();
    if (exampleText.includes('disponibilidad') || exampleText.includes('madrid') || exampleText.includes('ámsterdam') || exampleText.includes('amsterdam')) {
      assert(
        example.simulatedTerminal.command.startsWith('SHOW AVAILABILITY') || example.simulatedTerminal.command.startsWith('AN'),
        `${lesson.id}: availability examples must show availability output`,
      );
    }
    if (exampleText.includes('pnr')) {
      assert(
        example.simulatedTerminal.command === 'SHOW SAMPLE_PNR' ||
          example.simulatedTerminal.command === 'RT' ||
          example.simulatedTerminal.command.startsWith('NM') ||
          example.simulatedTerminal.command.startsWith('AP '),
        `${lesson.id}: PNR examples must show sample PNR output`,
      );
    }
    if ((exampleText.includes('tarifa') || exampleText.includes('regla')) && !exampleText.includes('pnr')) {
      assert(example.simulatedTerminal.command.startsWith('SHOW FARE_RULE'), `${lesson.id}: fare examples must show fare rule output`);
    }
  });
  assertArray(lesson.exercises, `${lesson.id}: exercises must be an array`);
  assert(lesson.exercises.length >= 2, `${lesson.id}: exercises must include at least 2 items`);
  assert(
    lesson.exercises.some((exercise) => exercise.type === 'terminal'),
    `${lesson.id}: every lesson must include a safe terminal exercise`,
  );
  lesson.exercises.forEach((exercise) => {
    assertText(exercise.id, `${lesson.id}: exercise id is required`);
    assert(['open', 'terminal'].includes(exercise.type), `${lesson.id}: exercise type must be open or terminal`);
    assertText(exercise.question, `${lesson.id}: exercise question is required`);
    assertText(exercise.expectedAnswer, `${lesson.id}: exercise expectedAnswer is required`);
    assertArray(exercise.correctionCriteria, `${lesson.id}: exercise correctionCriteria must be an array`);
    if (exercise.type === 'terminal') {
      assertText(exercise.command, `${lesson.id}: terminal exercise command is required`);
      assert(!exercise.question.toLowerCase().includes('abre la pagina terminal'), `${lesson.id}: terminal exercise should be embedded, not point to another page`);
      assert(!exercise.question.toLowerCase().includes('abre la página terminal'), `${lesson.id}: terminal exercise should be embedded, not point to another page`);
      validateTrainingCommand(exercise.command, `${lesson.id}: terminal exercise`);
    }
  });
  assertQuiz(lesson.quiz, lesson.id);
  assertArray(lesson.summary, `${lesson.id}: summary must be an array`);
  assert(lesson.summary.length >= 2, `${lesson.id}: summary must include at least 2 items`);
  lesson.summary.forEach((item) => assertText(item, `${lesson.id}: summary item is required`));
  assertText(lesson.safetyNote, `${lesson.id}: safetyNote is required`);
  const lessonText = JSON.stringify(lesson).toLowerCase();
  assert(!lessonText.includes('formación oficial'), `${lesson.id}: must not claim official training`);
  assert(!lessonText.includes('training oficial'), `${lesson.id}: must not claim official training`);
}

export function testCurriculumWeeksAreStructured() {
  const files = readdirSync(weeksDir).filter((file) => /^week-\d{2}\.json$/.test(file)).sort();
  assert(files.length === 6, `Expected 6 week files, found ${files.length}`);

  files.forEach((file, index) => {
    const expectedWeek = index + 1;
    const week = readJson(join(weeksDir, file));
    assert(week.week === expectedWeek, `${file}: expected week ${expectedWeek}`);
    assertText(week.title, `${file}: title is required`);
    assertText(week.objective, `${file}: objective is required`);
    assertArray(week.lessons, `${file}: lessons must be an array`);
    assert(week.lessons.length === 5, `${file}: expected 5 lessons`);
    week.lessons.forEach((lesson, lessonIndex) => {
      assertLesson(lesson, `week-${String(expectedWeek).padStart(2, '0')}-day-${String(lessonIndex + 1).padStart(2, '0')}`);
      assert(lesson.week === expectedWeek, `${lesson.id}: lesson week must match parent week`);
      assert(lesson.day === lessonIndex + 1, `${lesson.id}: lesson day must match position`);
    });
  });
}

export function testCurriculumCommandValidatorRejectsUnsafeAndUnknownOperations() {
  for (const command of ['TTP', 'TRF 123-4567890123', 'UNSUPPORTED LIVE COMMAND']) {
    let rejected = false;
    try {
      validateTrainingCommand(command, 'synthetic-test');
    } catch {
      rejected = true;
    }
    assert(rejected, `${command}: curriculum validator should reject unsafe or unknown commands`);
  }
  validateTrainingCommand('AN17JUNMADAMS/IB', 'synthetic-test');
  validateTrainingCommand('FXP', 'synthetic-test');
}
