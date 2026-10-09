/** One-off: regenerate ONLY Learners/Gallery_testLab_Sample.html with the real panel. */
import * as fs from 'fs';
import * as path from 'path';
import { MOCK_JSON_DATA } from '../data/mockJsonData';
import { buildTestLabHtml } from '../utils/testLabHtmlGenerator';

const OUT = path.join(process.cwd(), 'Learners');

const LEARNER: any = {
  id: 'learner-gallery',
  name: 'Learner',
  cefrLevel: 'B1',
  l1Language: 'Arabic',
  targetLanguage: 'English',
  translationLanguage: 'Arabic',
  readAloudVoice: 'Microsoft',
  avatar: '',
  personalInfo: { name: 'Learner', age: 0, nativeLanguage: 'Arabic', targetLanguage: 'English' },
};

const mock = JSON.parse((MOCK_JSON_DATA as any).testLab);
const html = buildTestLabHtml(mock, LEARNER);
fs.writeFileSync(path.join(OUT, 'Gallery_testLab_Sample.html'), html);
console.log('✓ Gallery_testLab_Sample.html', `${(html.length / 1024).toFixed(0)} KB`);