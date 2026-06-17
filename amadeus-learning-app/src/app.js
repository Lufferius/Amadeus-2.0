import { getAllWeeks, getLessonById } from './lessonRepository.mjs';

const storageKey = 'amadeus-learning-coach-progress';
const app = document.querySelector('#app');

let state = {
  weeks: [],
  selectedLessonId: null,
  answers: {},
  progress: loadProgress(),
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? { completedLessons: [], quizScores: {} };
  } catch {
    return { completedLessons: [], quizScores: {} };
  }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(state.progress));
}

function lessonCount() {
  return state.weeks.reduce((total, week) => total + week.lessons.length, 0);
}

function completedCount() {
  return state.progress.completedLessons.length;
}

function setView(view, lessonId) {
  state.selectedLessonId = lessonId ?? state.selectedLessonId;
  render(view);
}

function button(label, onClick, className = 'button') {
  const node = document.createElement('button');
  node.className = className;
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', onClick);
  return node;
}

function renderShell(content, activeView = 'dashboard') {
  app.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.innerHTML = `
    <aside class="sidebar">
      <div>
        <p class="brand">Amadeus Learning Coach</p>
        <p class="tagline">Entrenamiento seguro para Travel Consultants</p>
      </div>
      <nav class="nav" aria-label="Principal">
        <button data-view="dashboard" class="${activeView === 'dashboard' ? 'active' : ''}">Curso</button>
        <button data-view="lesson" class="${activeView === 'lesson' ? 'active' : ''}">Lección</button>
      </nav>
      <div class="progress-box">
        <span>${completedCount()} de ${lessonCount()} lecciones</span>
        <div class="meter"><i style="width:${lessonCount() ? (completedCount() / lessonCount()) * 100 : 0}%"></i></div>
      </div>
    </aside>
    <main class="content"></main>
  `;

  shell.querySelector('[data-view="dashboard"]').addEventListener('click', () => setView('dashboard'));
  shell.querySelector('[data-view="lesson"]').addEventListener('click', () => setView('lesson'));
  shell.querySelector('.content').append(content);
  app.append(shell);
}

function renderDashboard() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <header class="page-header">
      <h1>Curso de 6 semanas</h1>
      <p>Aprende conceptos de GDS con casos ficticios, lectura guiada y límites claros de seguridad.</p>
    </header>
    <div class="week-grid"></div>
  `;

  const grid = page.querySelector('.week-grid');
  state.weeks.forEach((week) => {
    const card = document.createElement('article');
    card.className = 'week-card';
    card.innerHTML = `
      <div class="week-number">Semana ${week.week}</div>
      <h2>${week.title}</h2>
      <p>${week.objective}</p>
      <ul></ul>
    `;

    const list = card.querySelector('ul');
    week.lessons.forEach((lesson) => {
      const item = document.createElement('li');
      const done = state.progress.completedLessons.includes(lesson.id);
      item.innerHTML = `<span>${done ? 'Completada' : 'Pendiente'}</span><button type="button">${lesson.title}</button>`;
      item.querySelector('button').addEventListener('click', () => setView('lesson', lesson.id));
      list.append(item);
    });

    grid.append(card);
  });

  renderShell(page, 'dashboard');
}

function renderLesson() {
  const firstLessonId = state.weeks[0]?.lessons[0]?.id;
  const lessonId = state.selectedLessonId ?? firstLessonId;
  const lesson = state.weeks.flatMap((week) => week.lessons.map((item) => ({ ...item, week }))).find((item) => item.id === lessonId);

  if (!lesson) {
    renderDashboard();
    return;
  }

  const page = document.createElement('section');
  page.className = 'page lesson-page';
  page.innerHTML = `
    <header class="page-header">
      <p class="section-label">Semana ${lesson.week.week}</p>
      <h1>${lesson.title}</h1>
      <p>${lesson.objective}</p>
    </header>
    <section class="lesson-block">
      <h2>Explicación</h2>
      ${lesson.explanation.map((paragraph) => `<p>${paragraph}</p>`).join('')}
    </section>
    <section class="lesson-block">
      <h2>Conceptos clave</h2>
      <dl class="concept-list">${lesson.keyConcepts.map((concept) => `<div><dt>${concept.term}</dt><dd>${concept.definition}</dd></div>`).join('')}</dl>
    </section>
    <section class="lesson-columns">
      <div class="lesson-block"><h2>Ejemplos</h2><ul>${lesson.examples.map((item) => `<li><strong>${item.title}:</strong> ${item.content}</li>`).join('')}</ul></div>
      <div class="lesson-block"><h2>Ejercicios</h2><ul>${lesson.exercises.map((item) => `<li><strong>${item.question}</strong><br><span>${item.expectedAnswer}</span></li>`).join('')}</ul></div>
    </section>
    <section class="lesson-block quiz"><h2>Quiz</h2></section>
    <section class="lesson-block safety"><h2>Resumen</h2><ul>${lesson.summary.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Nota de seguridad:</strong> ${lesson.safetyNote}</p></section>
  `;

  const quiz = page.querySelector('.quiz');
  lesson.quiz.forEach((question, questionIndex) => {
    const fieldset = document.createElement('fieldset');
    fieldset.innerHTML = `<legend>${question.question}</legend>`;
    question.options.forEach((option, optionIndex) => {
      const id = `${lesson.id}-${questionIndex}-${optionIndex}`;
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.innerHTML = `<input id="${id}" type="radio" name="${lesson.id}-${questionIndex}" value="${optionIndex}"> ${option}`;
      fieldset.append(label);
    });
    quiz.append(fieldset);
  });

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(
    button('Corregir quiz', () => gradeLesson(lesson, page)),
    button('Marcar lección completada', () => completeLesson(lesson.id), 'button secondary'),
  );
  quiz.append(actions);

  const result = document.createElement('p');
  result.className = 'quiz-result';
  quiz.append(result);

  renderShell(page, 'lesson');
}

function gradeLesson(lesson, page) {
  let score = 0;

  lesson.quiz.forEach((question, questionIndex) => {
    const selected = page.querySelector(`input[name="${lesson.id}-${questionIndex}"]:checked`);
    if (selected && Number(selected.value) === question.correctAnswer) {
      score += 1;
    }
  });

  state.progress.quizScores[lesson.id] = score;
  if (score === lesson.quiz.length && !state.progress.completedLessons.includes(lesson.id)) {
    state.progress.completedLessons.push(lesson.id);
  }
  saveProgress();

  const criteria = lesson.exercises.flatMap((exercise) => exercise.correctionCriteria).slice(0, 3).join(' ');
  page.querySelector('.quiz-result').textContent = `Resultado: ${score} de ${lesson.quiz.length}. ${criteria}`;
  renderShell(page, 'lesson');
}

function completeLesson(lessonId) {
  if (!state.progress.completedLessons.includes(lessonId)) {
    state.progress.completedLessons.push(lessonId);
    saveProgress();
  }
  renderLesson();
}

function render(view = 'dashboard') {
  if (view === 'lesson') {
    renderLesson();
    return;
  }

  renderDashboard();
}

async function start() {
  state.weeks = await getAllWeeks();
  const urlLesson = new URLSearchParams(window.location.search).get('lesson');
  const lesson = urlLesson ? await getLessonById(urlLesson) : null;
  state.selectedLessonId = lesson?.id ?? state.weeks[0]?.lessons[0]?.id ?? null;
  render('dashboard');
}

start().catch((error) => {
  app.innerHTML = `<main class="fatal"><h1>No se pudo iniciar la app</h1><p>${error.message}</p></main>`;
});
