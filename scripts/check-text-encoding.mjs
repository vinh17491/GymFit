#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

const excludedDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '__pycache__',
  'logs',
  'tmp',
  'temp',
  'uploads',
  '.next',
]);

const generatedDirectories = new Set(['frontend/dist', 'backend/dist']);

const binaryExtensions = new Set([
  '.7z', '.avi', '.bmp', '.class', '.dll', '.doc', '.docx', '.eot', '.exe',
  '.gif', '.ico', '.jar', '.jpeg', '.jpg', '.mov', '.mp3', '.mp4', '.otf',
  '.pdf', '.png', '.pyc', '.so', '.tar', '.ttf', '.wav', '.webm', '.webp',
  '.woff', '.woff2', '.xls', '.xlsx', '.zip',
]);

const lockFileNames = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

const knownTextExtensions = new Set([
  '.cjs', '.css', '.csv', '.env', '.example', '.html', '.ini', '.java', '.js',
  '.json', '.jsx', '.md', '.mjs', '.properties', '.py', '.scss', '.sql', '.svg',
  '.toml', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yaml', '.yml',
]);

const knownTextNames = new Set([
  '.editorconfig', '.gitattributes', '.gitignore', 'Dockerfile', 'Makefile',
  'README', 'README.md', 'LICENSE', 'CONTRIBUTING.md',
]);

// These are deliberately specific. In particular, a normal Vietnamese letter
// such as â, ă, ơ, ư, đ, ê, or ô must not be treated as an error by itself.
const fromCodePoints = (...codePoints) => String.fromCodePoint(...codePoints);

// Keep detector signatures encoded as code points so the detector does not
// report its own examples. The resulting runtime strings are the exact
// high-confidence sequences described by the recovery task.
const mojibakeSignatures = [
  [fromCodePoints(0x00c3, 0x0192), 'double-encoded-mojibake'],
  [fromCodePoints(0x00c3, 0x201a, 0x00c2, 0x00b7), 'mojibake-punctuation'],
  [fromCodePoints(0x00c3, 0x201a, 0x00c2, 0x00a0), 'mojibake-punctuation'],
  [fromCodePoints(0x00c3, 0x201a, 0x00c2, 0x00a9), 'mojibake-punctuation'],
  [fromCodePoints(0x00c3, 0x201a, 0x00c2, 0x00ae), 'mojibake-punctuation'],
  [fromCodePoints(0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac), 'mojibake-punctuation'],
  [fromCodePoints(0x00c3, 0x00a2, 0x00e2, 0x20ac, 0x0161), 'mojibake-currency'],
  [fromCodePoints(0x00c3, 0x00a2, 0x00e2, 0x2020), 'mojibake-arrow'],
  [fromCodePoints(0x00c3, 0x201e), 'mojibake-vietnamese'],
  [fromCodePoints(0x00c3, 0x2020), 'mojibake-vietnamese'],
  [fromCodePoints(0x00c3, 0x00a1, 0x00c2, 0x00ba), 'mojibake-vietnamese'],
  [fromCodePoints(0x00c3, 0x00a1, 0x00c2, 0x00bb), 'mojibake-vietnamese'],
  [fromCodePoints(0x00c3, 0x00f0, 0x00c5), 'mojibake-emoji'],
  [fromCodePoints(0x00c3, 0x00af, 0x00c2, 0x00bf, 0x00c2, 0x00bd), 'mojibake-replacement-character'],
  [fromCodePoints(0x00c2, 0x00b7), 'mojibake-punctuation'],
  [fromCodePoints(0x00c2, 0x00a0), 'mojibake-punctuation'],
  [fromCodePoints(0x00c2, 0x00a9), 'mojibake-punctuation'],
  [fromCodePoints(0x00c2, 0x00ae), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x201d), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x201c), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x00a6), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x0153), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x009d), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x2122), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x20ac, 0x02dc), 'mojibake-punctuation'],
  [fromCodePoints(0x00e2, 0x201a, 0x00ab), 'mojibake-currency'],
  [fromCodePoints(0x00e2, 0x2020, 0x2019), 'mojibake-arrow'],
  [fromCodePoints(0x00e2, 0x20ac), 'mojibake-sequence'],
  [fromCodePoints(0x00e2, 0x201a), 'mojibake-sequence'],
  [fromCodePoints(0x00c4), 'mojibake-vietnamese'],
  [fromCodePoints(0x00c6), 'mojibake-vietnamese'],
  [fromCodePoints(0x00e1, 0x00ba), 'mojibake-vietnamese'],
  [fromCodePoints(0x00e1, 0x00bb), 'mojibake-vietnamese'],
  [fromCodePoints(0x00f0, 0x0178), 'mojibake-emoji'],
  [fromCodePoints(0x00ef, 0x00bf, 0x00bd), 'mojibake-replacement-character'],
];

const zeroWidthCharacters = new Map([
  ['\u200B', 'U+200B ZERO WIDTH SPACE'],
  ['\u200C', 'U+200C ZERO WIDTH NON-JOINER'],
  ['\u200D', 'U+200D ZERO WIDTH JOINER'],
  ['\u2060', 'U+2060 WORD JOINER'],
  ['\u2066', 'U+2066 LEFT-TO-RIGHT ISOLATE'],
  ['\u2067', 'U+2067 RIGHT-TO-LEFT ISOLATE'],
  ['\u2068', 'U+2068 FIRST STRONG ISOLATE'],
  ['\u2069', 'U+2069 POP DIRECTIONAL ISOLATE'],
]);

function parseArguments(argv) {
  const options = {
    includeGenerated: false,
    allowlistPath: path.join(repositoryRoot, 'scripts', 'text-encoding-allowlist.json'),
    jsonPath: null,
    markdownPath: null,
    quiet: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--include-generated') {
      options.includeGenerated = true;
    } else if (argument === '--no-allowlist') {
      options.allowlistPath = null;
    } else if (argument === '--quiet') {
      options.quiet = true;
    } else if (argument === '--json' || argument.startsWith('--json=')) {
      const inlinePath = argument.includes('=') ? argument.slice(argument.indexOf('=') + 1) : null;
      const value = inlinePath || argv[++index];
      options.jsonPath = value && !value.startsWith('--') ? value : '-';
      if (!inlinePath && value?.startsWith('--')) index -= 1;
    } else if (argument === '--markdown' || argument.startsWith('--markdown=')) {
      const inlinePath = argument.includes('=') ? argument.slice(argument.indexOf('=') + 1) : null;
      const value = inlinePath || argv[++index];
      if (!value || value.startsWith('--')) {
        throw new Error('--markdown requires a file path');
      }
      options.markdownPath = value;
    } else if (argument === '--allowlist' || argument.startsWith('--allowlist=')) {
      const inlinePath = argument.includes('=') ? argument.slice(argument.indexOf('=') + 1) : null;
      const value = inlinePath || argv[++index];
      if (!value || value.startsWith('--')) {
        throw new Error('--allowlist requires a file path');
      }
      options.allowlistPath = value;
    } else if (argument === '--help' || argument === '-h') {
      console.log([
        'Usage: node scripts/check-text-encoding.mjs [options]',
        '',
        'Options:',
        '  --json [path]             write a deterministic JSON report (stdout when omitted)',
        '  --markdown <path>         write a Markdown report',
        '  --allowlist <path>        use a documented allowlist JSON file',
        '  --no-allowlist            disable allowlist matching',
        '  --include-generated       include generated dist output',
        '  --quiet                   suppress human-readable findings',
      ].join('\n'));
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

function resolveFromRepository(value) {
  if (!value || value === '-') return value;
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

function normalizedPath(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join('/');
}

function isWithinGeneratedDirectory(relativePath) {
  return [...generatedDirectories].some((directory) => relativePath === directory || relativePath.startsWith(`${directory}/`));
}

function isExcludedGeneratedReport(relativePath) {
  if (!relativePath.startsWith('docs/encoding/')) return false;
  return [
    'ENCODING_FINDINGS_BASELINE.md',
    'encoding-findings-baseline.json',
    'API_TEXT_RUNTIME_AUDIT.md',
    'DATABASE_UNICODE_SCHEMA_AUDIT.md',
    'DATABASE_MOJIBAKE_FINDINGS.md',
    'PROJECT_TEXT_ENCODING_FINAL_HANDOVER.md',
    'PROJECT_TEXT_ENCODING_TEST_MATRIX.md',
  ].includes(path.posix.basename(relativePath));
}

function shouldSkipDirectory(relativePath, directoryName, includeGenerated) {
  const normalized = relativePath.split(path.sep).join('/');
  const includeKnownGeneratedDirectory = includeGenerated
    && directoryName === 'dist'
    && isWithinGeneratedDirectory(normalized);
  if (excludedDirectories.has(directoryName) && !includeKnownGeneratedDirectory) return true;
  if (!includeGenerated && isWithinGeneratedDirectory(normalized)) return true;
  return false;
}

function shouldSkipFile(relativePath, fileName, includeGenerated) {
  const normalized = relativePath.split(path.sep).join('/');
  const extension = path.extname(fileName).toLowerCase();
  if (!includeGenerated && isWithinGeneratedDirectory(normalized)) return true;
  if (isExcludedGeneratedReport(normalized)) return true;
  if (binaryExtensions.has(extension)) return true;
  if (lockFileNames.has(fileName)) return true;
  if (fileName.endsWith('.log') || fileName.endsWith('.tmp')) return true;
  if (fileName === '.env' || fileName.startsWith('.env.') && !fileName.endsWith('.example')) return true;
  return false;
}

function isTextFile(filePath, buffer) {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();
  if (knownTextExtensions.has(extension) || knownTextNames.has(fileName)) return true;
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function collectFiles(directory, includeGenerated, files = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(repositoryRoot, absolutePath);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(relativePath, entry.name, includeGenerated)) {
        collectFiles(absolutePath, includeGenerated, files);
      }
      continue;
    }
    if (!entry.isFile() || shouldSkipFile(relativePath, entry.name, includeGenerated)) continue;
    files.push(absolutePath);
  }
  return files;
}

function findAll(text, signature) {
  const matches = [];
  let fromIndex = 0;
  while (fromIndex < text.length) {
    const index = text.indexOf(signature, fromIndex);
    if (index === -1) break;
    matches.push(index);
    fromIndex = index + Math.max(signature.length, 1);
  }
  return matches;
}

function lineAndColumn(text, offset) {
  const lineNumber = text.slice(0, offset).split('\n').length;
  const lastNewline = text.lastIndexOf('\n', offset - 1);
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const rawLine = text.slice(lineStart, text.indexOf('\n', offset) === -1 ? text.length : text.indexOf('\n', offset));
  const column = Array.from(text.slice(lineStart, offset)).length + 1;
  return { lineNumber, column, rawLine: rawLine.replace(/\r$/, '') };
}

function contextForLine(line, column) {
  const maxLength = 160;
  if (line.length <= maxLength) return line;
  const zeroBased = Math.max(0, column - 1);
  const start = Math.max(0, Math.min(zeroBased - 60, line.length - maxLength));
  return `${start > 0 ? '…' : ''}${line.slice(start, start + maxLength)}${start + maxLength < line.length ? '…' : ''}`;
}

function makeFinding(relativePath, text, offset, signature, category, severity = 'HIGH') {
  const { lineNumber, column, rawLine } = lineAndColumn(text, offset);
  return {
    path: relativePath,
    line: lineNumber,
    column,
    signature,
    context: contextForLine(rawLine, column),
    severity,
    category,
  };
}

function scanText(relativePath, text) {
  const findings = [];
  const byLocation = new Map();
  const add = (finding, priority = finding.signature.length) => {
    const key = `${finding.line}:${finding.column}`;
    const previous = byLocation.get(key);
    if (!previous || priority > previous.priority) {
      byLocation.set(key, { finding, priority });
    }
  };

  for (const [signature, category] of mojibakeSignatures) {
    for (const offset of findAll(text, signature)) {
      add(makeFinding(relativePath, text, offset, signature, category));
    }
  }

  // A standalone U+00C3 is a valid Vietnamese letter in words such as ĐÃ.
  // Treat it as mojibake only when its next code point looks like a decoded
  // byte (or the known truncated-example punctuation), never merely because
  // U+00C3 exists in a Unicode string.
  const c3 = fromCodePoints(0x00c3);
  for (const offset of findAll(text, c3)) {
    const nextCodePoint = text.codePointAt(offset + c3.length);
    const previousCodePoint = text.codePointAt(Math.max(0, offset - 1));
    const decodedByteLike = nextCodePoint >= 0x80 && nextCodePoint <= 0xbf;
    const truncatedExample = nextCodePoint === 0x2e && previousCodePoint >= 0x41 && previousCodePoint <= 0x7a;
    if (decodedByteLike || truncatedExample) {
      add(makeFinding(relativePath, text, offset, c3, 'mojibake-sequence'));
    }
  }

  for (let offset = 0; offset < text.length; offset += 1) {
    const character = text[offset];
    const codePoint = text.codePointAt(offset);
    if (codePoint >= 0x80 && codePoint <= 0x9f) {
      add(makeFinding(relativePath, text, offset, `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`, 'c1-control'), 100);
    }
    if (codePoint === 0xfffd) {
      add(makeFinding(relativePath, text, offset, 'U+FFFD REPLACEMENT CHARACTER', 'replacement-character'), 100);
    }
    const zeroWidthName = zeroWidthCharacters.get(character);
    if (zeroWidthName && offset > 0) {
      add(makeFinding(relativePath, text, offset, zeroWidthName, 'zero-width-character'), 100);
    }
    if (codePoint > 0xffff) offset += 1;
  }

  if (text.includes('\ufeff', 1)) {
    for (const offset of findAll(text, '\ufeff')) {
      if (offset > 0) add(makeFinding(relativePath, text, offset, 'U+FEFF BOM inside text', 'bom-in-text'), 100);
    }
  }

  for (const { finding } of byLocation.values()) findings.push(finding);
  return findings.sort((left, right) => left.line - right.line || left.column - right.column || left.signature.localeCompare(right.signature));
}

function loadAllowlist(allowlistPath) {
  if (!allowlistPath || !fs.existsSync(allowlistPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.entries || [];
}

function matchesAllowlist(finding, entries) {
  return entries.find((entry) => {
    if (entry.path !== finding.path) return false;
    if (entry.category && entry.category !== finding.category) return false;
    if (entry.signature && entry.signature !== finding.signature) return false;
    if (entry.lineRanges?.length) {
      return entry.lineRanges.some(([start, end]) => finding.line >= start && finding.line <= end);
    }
    if (entry.lines?.length) return entry.lines.includes(finding.line);
    return true;
  }) || null;
}

function classifyPath(relativePath) {
  if (relativePath.startsWith('frontend/src/')) return 'frontend-source';
  if (relativePath.startsWith('frontend/public/')) return 'frontend-public';
  if (relativePath === 'frontend/index.html') return 'frontend-entry';
  if (relativePath.startsWith('backend/src/')) return 'backend-source';
  if (relativePath.startsWith('backend/')) return 'backend-static';
  if (relativePath.startsWith('db/')) return 'sql';
  if (relativePath.startsWith('docs/archive/')) return 'historical-archive';
  if (relativePath.startsWith('docs/')) return 'docs';
  if (relativePath.startsWith('frontend/dist/') || relativePath.startsWith('backend/dist/')) return 'generated';
  return 'root-config';
}

function scanRepository(options) {
  const files = collectFiles(repositoryRoot, options.includeGenerated).sort((left, right) => normalizedPath(left).localeCompare(normalizedPath(right)));
  const allowlistEntries = loadAllowlist(options.allowlistPath);
  const findings = [];
  const skippedInvalidUtf8 = [];
  let filesScanned = 0;

  for (const filePath of files) {
    const buffer = fs.readFileSync(filePath);
    if (!isTextFile(filePath, buffer)) continue;
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      skippedInvalidUtf8.push(normalizedPath(filePath));
      continue;
    }
    filesScanned += 1;
    const relativePath = normalizedPath(filePath);
    const fileFindings = scanText(relativePath, text).map((finding) => {
      const allowedBy = matchesAllowlist(finding, allowlistEntries);
      return {
        ...finding,
        scope: classifyPath(relativePath),
        allowlisted: Boolean(allowedBy),
        allowlistReason: allowedBy?.reason || null,
      };
    });
    findings.push(...fileFindings);
  }

  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column || left.signature.localeCompare(right.signature));
  const highFindings = findings.filter((finding) => finding.severity === 'HIGH');
  const unresolved = highFindings.filter((finding) => !finding.allowlisted);
  const byScope = {};
  for (const finding of findings) byScope[finding.scope] = (byScope[finding.scope] || 0) + 1;

  return {
    scanner: 'check-text-encoding',
    version: 1,
    options: { includeGenerated: options.includeGenerated },
    filesScanned,
    invalidUtf8Files: skippedInvalidUtf8,
    findings,
    summary: {
      totalFindings: findings.length,
      highSeverity: highFindings.length,
      allowlistedHighSeverity: highFindings.filter((finding) => finding.allowlisted).length,
      unresolvedHighSeverity: unresolved.length,
      byScope,
    },
  };
}

function markdownEscape(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function markdownReport(report, allowlistPath) {
  const lines = [
    '# Encoding Findings Report',
    '',
    `- Files scanned: ${report.filesScanned}`,
    `- Total findings: ${report.summary.totalFindings}`,
    `- HIGH severity: ${report.summary.highSeverity}`,
    `- Allowlisted HIGH: ${report.summary.allowlistedHighSeverity}`,
    `- Unresolved HIGH: ${report.summary.unresolvedHighSeverity}`,
    `- Generated output included: ${report.options.includeGenerated ? 'yes' : 'no'}`,
    `- Allowlist: ${allowlistPath ? normalizedPath(allowlistPath) : 'disabled'}`,
    '',
    '## Findings',
    '',
    '| Path | Line | Column | Signature | Severity | Category | Allowlisted | Context |',
    '| --- | ---: | ---: | --- | --- | --- | --- | --- |',
  ];
  if (!report.findings.length) lines.push('| *(none)* |  |  |  |  |  |  |  |');
  for (const finding of report.findings) {
    lines.push(`| ${markdownEscape(finding.path)} | ${finding.line} | ${finding.column} | \`${markdownEscape(finding.signature)}\` | ${finding.severity} | ${finding.category} | ${finding.allowlisted ? 'yes' : 'no'} | ${markdownEscape(finding.context)} |`);
  }
  return `${lines.join('\n')}\n`;
}

function writeReport(filePath, content) {
  if (filePath === '-') {
    process.stdout.write(content);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function printHumanReport(report) {
  console.log(`Encoding scan: ${report.filesScanned} text files, ${report.summary.totalFindings} findings, ${report.summary.unresolvedHighSeverity} unresolved HIGH.`);
  for (const finding of report.findings.filter((item) => !item.allowlisted)) {
    console.log(`${finding.severity} ${finding.path}:${finding.line}:${finding.column} [${finding.category}] ${finding.signature}`);
    console.log(`  ${finding.context}`);
  }
  for (const filePath of report.invalidUtf8Files) {
    console.log(`HIGH ${filePath}: invalid UTF-8 byte sequence`);
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  options.jsonPath = resolveFromRepository(options.jsonPath);
  options.markdownPath = resolveFromRepository(options.markdownPath);
  options.allowlistPath = resolveFromRepository(options.allowlistPath);
  const report = scanRepository(options);

  if (options.jsonPath) {
    writeReport(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.markdownPath) {
    writeReport(options.markdownPath, markdownReport(report, options.allowlistPath));
  }
  if (!options.quiet && options.jsonPath !== '-') printHumanReport(report);
  if (options.jsonPath === '-') process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  process.exitCode = report.summary.unresolvedHighSeverity > 0 || report.invalidUtf8Files.length > 0 ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
