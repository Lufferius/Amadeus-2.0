import { getAllWeeks, getLessonById } from './lessonRepository.mjs';
import {
  DISCLAIMER,
  createTerminalSession,
  getAutocompleteSuggestions,
  runTerminalCommand,
} from './terminalSimulator.mjs';
import { executeProfessionalCommand } from './terminal/commandExecutor.mjs';
import { loadTerminalState, saveTerminalState } from './terminal/persistence.mjs';
import { evaluateScenario, scenarios } from './terminal/scenarios.mjs';
import { createProfessionalTerminalSession } from './terminal/sessionState.mjs';

const storageKey = 'amadeus-learning-coach-progress';
const app = document.querySelector('#app');

let state = {
  weeks: [],
  selectedLessonId: null,
  answers: {},
  progress: loadProgress(),
  terminal: null,
  terminalMode: 'guided',
  selectedScenarioId: scenarios[0].id,
  scenarioProgress: {},
};

const restoredTerminal = loadTerminalState(localStorage);
state.terminal = restoredTerminal.session;
state.terminalMode = restoredTerminal.mode;
state.selectedScenarioId = restoredTerminal.selectedScenarioId;
state.scenarioProgress = restoredTerminal.scenarioProgress;

function persistProfessionalTerminal() {
  saveTerminalState(localStorage, {
    session: state.terminal,
    mode: state.terminalMode,
    selectedScenarioId: state.selectedScenarioId,
    scenarioProgress: state.scenarioProgress,
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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

function renderExerciseItem(item) {
  if (item.type === 'terminal') {
    return `
      <li class="terminal-exercise" data-terminal-command="${item.command}">
        <strong>${item.question}</strong>
        <span>${item.expectedAnswer}</span>
        <div class="inline-terminal">
          <div class="inline-terminal-banner">${DISCLAIMER}</div>
          <div class="inline-terminal-output" aria-live="polite">Terminal listo. Ejecuta el comando sugerido o escribe otro comando seguro.</div>
          <form class="inline-terminal-form">
            <span aria-hidden="true">&gt;</span>
            <input value="${item.command}" autocomplete="off" />
            <button class="button secondary" type="submit">Ejecutar</button>
          </form>
        </div>
      </li>
    `;
  }

  return `<li><strong>${item.question}</strong><br><span>${item.expectedAnswer}</span></li>`;
}

function renderExampleItem(item) {
  const terminal = item.simulatedTerminal
    ? `
      <div class="example-terminal">
        <pre>${item.simulatedTerminal.output.join('\n')}</pre>
      </div>
    `
    : '';

  return `<li><strong>${item.title}:</strong> ${item.content}${terminal}</li>`;
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
        <button data-view="terminal" class="${activeView === 'terminal' ? 'active' : ''}">Terminal</button>
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
  shell.querySelector('[data-view="terminal"]').addEventListener('click', () => setView('terminal'));
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
      <div class="lesson-block"><h2>Ejemplos</h2><ul>${lesson.examples.map(renderExampleItem).join('')}</ul></div>
      <div class="lesson-block"><h2>Ejercicios</h2><ul>${lesson.exercises.map(renderExerciseItem).join('')}</ul></div>
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
  attachInlineTerminals();
}

function attachInlineTerminals() {
  document.querySelectorAll('.terminal-exercise').forEach((exercise) => {
    const session = createTerminalSession();
    const form = exercise.querySelector('.inline-terminal-form');
    const input = exercise.querySelector('input');
    const output = exercise.querySelector('.inline-terminal-output');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = runTerminalCommand(session, input.value);
      output.innerHTML = `
        <p class="terminal-command-line">&gt; ${result.input}</p>
        <pre>${result.output.join('\n')}</pre>
        <p>${result.explanation}</p>
      `;
      input.value = session.activePractice ? '' : exercise.dataset.terminalCommand;
      input.focus();
    });
  });
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

function renderTerminal() {
  const page = document.createElement('section');
  page.className = 'page terminal-page';
  page.innerHTML = `
    <header class="page-header">
      <h1>Terminal profesional de entrenamiento</h1>
      <p>Practica disponibilidad, PNR, tarifas y colas con un entorno local completamente ficticio.</p>
    </header>
    <section class="safe-banner">
      <strong>Safe mode activo.</strong> ${DISCLAIMER}
    </section>
    <div class="terminal-toolbar">
      <div class="mode-control" role="group" aria-label="Modo del terminal">
        <button type="button" data-terminal-mode="guided" aria-pressed="${state.terminalMode === 'guided'}">Guiado</button>
        <button type="button" data-terminal-mode="free" aria-pressed="${state.terminalMode === 'free'}">Libre</button>
      </div>
      <button type="button" class="button secondary reset-terminal">Reiniciar sesion</button>
    </div>
    <div class="reset-confirmation" hidden>
      <p>Se borrara el area de trabajo, el historial y el progreso de escenarios de esta sesion.</p>
      <button type="button" class="button confirm-reset">Confirmar reinicio</button>
      <button type="button" class="button secondary cancel-reset">Cancelar</button>
    </div>
    <section class="terminal-layout">
      <div class="terminal-panel">
        <div class="terminal-output" aria-live="polite"></div>
        <form class="terminal-form">
          <label for="terminal-command">Comando</label>
          <div class="terminal-input-row">
            <span aria-hidden="true">&gt;</span>
            <input id="terminal-command" name="command" list="terminal-suggestions" autocomplete="off" placeholder="HELP" />
            <datalist id="terminal-suggestions"></datalist>
            <button class="button" type="submit">Ejecutar</button>
          </div>
        </form>
      </div>
      <aside class="terminal-side">
        <section>
          <h2>Ayuda contextual</h2>
          <p class="contextual-help">Usa HE para consultar la ayuda local.</p>
        </section>
        <section class="scenario-panel" ${state.terminalMode === 'free' ? 'hidden' : ''}>
          <h2>Escenario guiado</h2>
          <label for="scenario-select">Caso</label>
          <select id="scenario-select">${scenarios.map((scenario) => `<option value="${scenario.id}" ${scenario.id === state.selectedScenarioId ? 'selected' : ''}>${scenario.title}</option>`).join('')}</select>
          <p class="scenario-objective"></p>
          <ol class="scenario-steps"></ol>
          <p class="scenario-next"></p>
        </section>
        <section>
          <h2>Estado del PNR</h2>
          <p class="pnr-status"></p>
        </section>
        <section>
          <h2>Historial</h2>
          <ol class="history-list"></ol>
        </section>
        <section>
          <h2>Errores de practica</h2>
          <ul class="mistakes-list"></ul>
        </section>
      </aside>
    </section>
  `;

  renderShell(page, 'terminal');

  const form = document.querySelector('.terminal-form');
  const input = document.querySelector('#terminal-command');
  const datalist = document.querySelector('#terminal-suggestions');
  const professionalSuggestions = [
    'AN17JUNMADAMS/IB', 'MD', 'MU', 'MB', 'MT', 'DO1', 'SS1Y1', 'XE1',
    'NM1GARCIA/ANA MS', 'AP MAD 600000000', 'TKOK', 'RF ANA', 'SR WCHR/P1',
    'OS IB TRAINING PASSENGER', 'RM TRAINING ONLY', 'ER', 'ET', 'IG', 'RT',
    'FXP', 'FXX', 'FQN1', 'TQT', 'QT', 'QS8', 'QN', 'PDN/DEMO CORP', 'HE', 'HE FXP',
  ];

  function updateSuggestions() {
    const prefix = input.value.trim().toUpperCase();
    const suggestions = [...new Set([...professionalSuggestions, ...getAutocompleteSuggestions(input.value)])]
      .filter((suggestion) => !prefix || suggestion.startsWith(prefix));
    datalist.innerHTML = suggestions
      .map((suggestion) => `<option value="${suggestion}"></option>`)
      .join('');
  }

  input.addEventListener('input', updateSuggestions);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      const previous = state.terminal.history.at(-1);
      if (previous) {
        event.preventDefault();
        input.value = previous;
        updateSuggestions();
      }
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) return;
    if (command.toUpperCase() === 'RESET') {
      document.querySelector('.reset-confirmation').hidden = false;
      return;
    }
    const result = executeProfessionalCommand(state.terminal, command);
    state.terminal.history.push(command);
    state.terminal.transcript.push(result);
    const scenario = evaluateScenario(state.selectedScenarioId, state.terminal);
    state.scenarioProgress[state.selectedScenarioId] = {
      completedCount: scenario.completedCount,
      totalSteps: scenario.totalSteps,
      complete: scenario.complete,
    };
    persistProfessionalTerminal();
    input.value = '';
    updateSuggestions();
    renderTerminalState(result);
    input.focus();
  });

  document.querySelectorAll('[data-terminal-mode]').forEach((control) => {
    control.addEventListener('click', () => {
      state.terminalMode = control.dataset.terminalMode;
      persistProfessionalTerminal();
      renderTerminal();
    });
  });

  document.querySelector('#scenario-select').addEventListener('change', (event) => {
    state.selectedScenarioId = event.target.value;
    persistProfessionalTerminal();
    renderTerminalState();
  });

  const resetConfirmation = document.querySelector('.reset-confirmation');
  document.querySelector('.reset-terminal').addEventListener('click', () => { resetConfirmation.hidden = false; });
  document.querySelector('.cancel-reset').addEventListener('click', () => { resetConfirmation.hidden = true; });
  document.querySelector('.confirm-reset').addEventListener('click', () => {
    state.terminal = createProfessionalTerminalSession();
    state.scenarioProgress = {};
    persistProfessionalTerminal();
    renderTerminal();
  });

  updateSuggestions();
  renderTerminalState();
}

function renderTerminalState(latestResult) {
  const output = document.querySelector('.terminal-output');
  const history = document.querySelector('.history-list');
  const mistakes = document.querySelector('.mistakes-list');
  const pnrStatus = document.querySelector('.pnr-status');
  const help = document.querySelector('.contextual-help');
  const scenarioSteps = document.querySelector('.scenario-steps');
  const scenarioObjective = document.querySelector('.scenario-objective');
  const scenarioNext = document.querySelector('.scenario-next');

  if (!output || !history || !mistakes || !pnrStatus || !help) {
    return;
  }

  const visibleTranscript = state.terminal.transcript.length ? state.terminal.transcript : (latestResult ? [latestResult] : []);

  output.innerHTML = visibleTranscript.length
    ? visibleTranscript.map((entry) => `
      <article class="terminal-entry">
        <p class="terminal-command-line">&gt; ${escapeHtml(entry.input)}</p>
        <pre>${escapeHtml(Array.isArray(entry.output) ? entry.output.join('\n') : entry.output)}</pre>
        <p>${escapeHtml(entry.explanation)}</p>
      </article>
    `).join('')
    : `<article class="terminal-entry"><pre>${DISCLAIMER}\nEscribe HELP para ver comandos seguros.</pre></article>`;

  history.innerHTML = state.terminal.history.length
    ? state.terminal.history.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Sin comandos todavia.</li>';

  mistakes.innerHTML = state.terminal.mistakes.length
    ? state.terminal.mistakes.map((item) => `<li><strong>${escapeHtml(item.practice)}:</strong> ${escapeHtml(item.input)}. ${escapeHtml(item.explanation)}</li>`).join('')
    : '<li>Sin errores registrados.</li>';

  pnrStatus.textContent = `${state.terminal.pnr.status} · ${state.terminal.pnr.locator ?? 'sin localizador'} · ${state.terminal.pnr.segments.length} segmento(s)`;
  help.textContent = latestResult?.contextualHelp ?? latestResult?.explanation ?? 'Usa HE para consultar la ayuda local.';
  const scenario = scenarios.find((item) => item.id === state.selectedScenarioId);
  const evaluation = evaluateScenario(state.selectedScenarioId, state.terminal);
  if (scenarioSteps && scenarioObjective && scenarioNext && scenario) {
    scenarioObjective.textContent = scenario.objective;
    scenarioSteps.innerHTML = evaluation.steps.map((step) => `<li class="${step.complete ? 'done' : ''}">${step.complete ? 'Completado' : 'Pendiente'}: ${escapeHtml(step.title)}</li>`).join('');
    scenarioNext.textContent = evaluation.complete
      ? 'Escenario completado.'
      : `Siguiente: ${evaluation.currentStep.hint}`;
  }
  output.scrollTop = output.scrollHeight;
}

function render(view = 'dashboard') {
  if (view === 'lesson') {
    renderLesson();
    return;
  }

  if (view === 'terminal') {
    renderTerminal();
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
