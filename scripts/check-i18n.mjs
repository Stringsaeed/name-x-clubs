// Fails when (1) `lingui extract --clean` would change the committed catalogs, or
// (2) a non-source locale has untranslated (empty msgstr) entries.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const sourceLocale = 'en';
const locales = ['en', 'ar'];
const file = (locale) => `src/locales/${locale}/messages.po`;
// POT-Creation-Date changes on every extraction; it is not a content change.
const normalize = (text) => text.replace(/^"POT-Creation-Date:.*\n/m, '');

const before = Object.fromEntries(locales.map((l) => [l, readFileSync(file(l), 'utf8')]));
const run = spawnSync('npx', ['lingui', 'extract', '--clean'], { stdio: 'pipe', encoding: 'utf8' });
if (run.status !== 0) {
  process.stderr.write(run.stdout + run.stderr);
  process.exit(run.status ?? 1);
}

const problems = [];
for (const locale of locales) {
  const after = readFileSync(file(locale), 'utf8');
  if (normalize(after) !== normalize(before[locale])) {
    problems.push(
      `${file(locale)} is out of date: run "npm run i18n:extract" and commit the result.`,
    );
  } else {
    writeFileSync(file(locale), before[locale]); // keep the committed date header
  }
  if (locale === sourceLocale) {
    continue;
  }
  const missing = after
    .split(/\n{2,}/)
    .filter((entry) => /^msgid "(?!")/m.test(entry))
    .filter((entry) => {
      const lines = entry.split('\n');
      return lines.some(
        (line, i) => /^msgstr(\[\d+\])? ""$/.test(line) && !lines[i + 1]?.startsWith('"'),
      );
    })
    .map((entry) => /^msgid (".*")/m.exec(entry)?.[1]);
  for (const id of missing) {
    problems.push(`${locale}: missing translation for ${id}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('i18n catalogs are up to date and complete.');
