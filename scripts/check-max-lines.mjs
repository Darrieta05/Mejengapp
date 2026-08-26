import { readFile } from 'node:fs/promises';
import { glob } from 'glob';

const MAX_LINES = 400;
const files = await glob('src/**/*.{ts,css,html}', {
  ignore: ['**/*.d.ts']
});

const offenders = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/).length;
  if (lines > MAX_LINES) {
    offenders.push({ file, lines });
  }
}

if (offenders.length > 0) {
  console.error('Line-limit check failed. Files over 400 lines:');
  for (const offender of offenders) {
    console.error(`- ${offender.file}: ${offender.lines}`);
  }
  process.exit(1);
}

console.log(`Line-limit check passed for ${files.length} files.`);
