import { getAllWeeks, getLessonById } from '../src/lessonRepository.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function testLessonRepositoryLoadsWeeksFromJson() {
  const weeks = await getAllWeeks();

  assert(weeks.length === 6, `Expected 6 weeks, found ${weeks.length}`);
  assert(weeks[0].lessons.length === 5, 'Week 1 should include 5 JSON lessons');
  assert(weeks[0].lessons[0].title.includes('GDS'), 'Expected Week 1 Lesson 1 to come from JSON curriculum data');
  assert(Array.isArray(weeks[0].lessons[0].keyConcepts), 'Expected lessons to follow the documented keyConcepts format');
}

export async function testLessonRepositoryFindsLessonById() {
  const lesson = await getLessonById('week-04-day-04');

  assert(lesson.title.includes('regla de tarifa'), 'Expected to find the simulated fare rule lesson');
  assert(lesson.safetyNote.includes('simulada'), 'Expected lesson safety note to preserve training-only framing');
}
