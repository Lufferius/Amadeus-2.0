export const WEEK_FILES = [
  'week-01.json',
  'week-02.json',
  'week-03.json',
  'week-04.json',
  'week-05.json',
  'week-06.json',
];

async function loadJsonInBrowser(fileName) {
  const response = await fetch(`./data/weeks/${fileName}`);

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileName}`);
  }

  return response.json();
}

async function loadJsonInNode(fileName) {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const content = await readFile(join(root, 'data', 'weeks', fileName), 'utf8');

  return JSON.parse(content);
}

async function loadWeek(fileName) {
  if (typeof window === 'undefined') {
    return loadJsonInNode(fileName);
  }

  return loadJsonInBrowser(fileName);
}

export async function getAllWeeks() {
  const weeks = await Promise.all(WEEK_FILES.map(loadWeek));

  return weeks.sort((a, b) => a.week - b.week);
}

export async function getLessonById(lessonId) {
  const weeks = await getAllWeeks();

  for (const week of weeks) {
    const lesson = week.lessons.find((candidate) => candidate.id === lessonId);

    if (lesson) {
      return { ...lesson, week };
    }
  }

  return undefined;
}
