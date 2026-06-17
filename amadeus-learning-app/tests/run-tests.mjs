import * as curriculumData from './curriculum-data.test.mjs';
import * as lessonLoader from './lesson-loader.test.mjs';
import * as terminalParser from './terminal-parser.test.mjs';
import * as terminalPnrFlow from './terminal-pnr-flow.test.mjs';

const suites = [curriculumData, lessonLoader, terminalParser, terminalPnrFlow];
let passed = 0;
let failed = 0;

for (const suite of suites) {
  for (const [name, test] of Object.entries(suite)) {
    if (!name.startsWith('test')) {
      continue;
    }

    try {
      await test();
      passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error.message);
    }
  }
}

console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
