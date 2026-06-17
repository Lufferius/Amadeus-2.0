import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function assertQuiz(quiz, lessonId) {
  assertArray(quiz, `${lessonId}: quiz must be an array`);
  assert(quiz.length >= 2, `${lessonId}: quiz must include at least 2 questions`);

  for (const question of quiz) {
    assertText(question.question, `${lessonId}: quiz question text is required`);
    assertArray(question.options, `${lessonId}: quiz options must be an array`);
    assert(question.options.length >= 3, `${lessonId}: quiz must include at least 3 options`);
    assert(Number.isInteger(question.correctOptionIndex), `${lessonId}: quiz correctOptionIndex is required`);
    assert(
      question.correctOptionIndex >= 0 && question.correctOptionIndex < question.options.length,
      `${lessonId}: quiz correctOptionIndex must point to an option`,
    );
  }
}

function assertLesson(lesson, expectedPrefix) {
  assertText(lesson.id, `${expectedPrefix}: lesson id is required`);
  assert(lesson.id.startsWith(expectedPrefix), `${lesson.id}: lesson id must start with ${expectedPrefix}`);
  assertText(lesson.title, `${lesson.id}: title is required`);
  assert(Number.isInteger(lesson.estimatedMinutes), `${lesson.id}: estimatedMinutes is required`);
  assert(lesson.estimatedMinutes >= 8 && lesson.estimatedMinutes <= 30, `${lesson.id}: estimatedMinutes looks unrealistic`);
  assertText(lesson.objective, `${lesson.id}: objective is required`);
  assertText(lesson.explanation, `${lesson.id}: explanation is required`);
  assertArray(lesson.examples, `${lesson.id}: examples must be an array`);
  assert(lesson.examples.length >= 2, `${lesson.id}: examples must include at least 2 items`);
  assertArray(lesson.exercises, `${lesson.id}: exercises must be an array`);
  assert(lesson.exercises.length >= 2, `${lesson.id}: exercises must include at least 2 items`);
  assertQuiz(lesson.quiz, lesson.id);
  assertText(lesson.correctionCriteria, `${lesson.id}: correctionCriteria is required`);
  assertText(lesson.summary, `${lesson.id}: summary is required`);
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
      assertLesson(lesson, `w${String(expectedWeek).padStart(2, '0')}-l${String(lessonIndex + 1).padStart(2, '0')}`);
    });
  });
}
