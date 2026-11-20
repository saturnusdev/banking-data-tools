import { parseYaml } from './yaml';

export interface LintIssue {
	level: 'error' | 'warning' | 'info';
	message: string;
	line?: number;
	column?: number;
}

// Best-effort duplicate key detection. YAML allows duplicate keys (last wins),
// but they are almost always a mistake, so we flag them.
function findDuplicateKeys(text: string): string[] {
	const duplicates = new Set<string>();
	const seen = new Map<number, Set<string>>();
	const lines = text.split('\n');

	for (const raw of lines) {
		if (/^\s*#/.test(raw) || /^\s*$/.test(raw) || /^\s*-/.test(raw)) continue;
		const indent = raw.match(/^\s*/)?.[0].length ?? 0;
		const match = raw.trim().match(/^([^:#]+):/);
		if (!match) continue;
		const key = match[1].trim();
		const levelSet = seen.get(indent) ?? new Set<string>();
		if (levelSet.has(key)) {
			duplicates.add(key);
		} else {
			levelSet.add(key);
			seen.set(indent, levelSet);
		}
	}
	return [...duplicates];
}

export function lintYaml(text: string): LintIssue[] {
	const issues: LintIssue[] = [];
	const lines = text.split('\n');

	// Syntax errors first
	try {
		parseYaml(text);
	} catch (e: any) {
		const msg = e?.message || String(e);
		const line =
			Number((msg.match(/line (\d+)/) || [])[1] || (msg.match(/\((\d+):(\d+)\)/) || [])[1]) ||
			undefined;
		const column =
			Number((msg.match(/column (\d+)/) || [])[1] || (msg.match(/\((\d+):(\d+)\)/) || [])[2]) ||
			undefined;
		issues.push({ level: 'error', message: msg, line, column });
	}

	// Style issues
	lines.forEach((line, idx) => {
		const lineNo = idx + 1;
		if (/^\t+/.test(line)) {
			issues.push({
				level: 'warning',
				message: 'Tab used for indentation; YAML requires spaces',
				line: lineNo
			});
		}
		if (/\s+$/.test(line) && !/^\s*$/.test(line)) {
			issues.push({ level: 'warning', message: 'Trailing whitespace', line: lineNo });
		}
		if (/^\s+/.test(line) && /:\S/.test(line.replace(/^\s+/, ''))) {
			issues.push({ level: 'warning', message: 'Missing space after colon', line: lineNo });
		}
	});

	if (!text || !text.trim()) {
		issues.push({ level: 'info', message: 'Document is empty' });
	} else {
		issues.push({ level: 'info', message: `${lines.length} line(s) scanned` });
	}

	// Duplicate keys (only if the document parses)
	try {
		parseYaml(text);
		findDuplicateKeys(text).forEach((key) => {
			issues.push({ level: 'error', message: `Duplicate key detected: "${key}"` });
		});
	} catch {
		// syntax error already reported above
	}

	return issues;
}
