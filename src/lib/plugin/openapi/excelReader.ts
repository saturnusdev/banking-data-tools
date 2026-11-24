export interface WorkbookData {
	sheetNames: string[];
	/** Full grid (array of rows) per sheet, empty cells normalised to ''. */
	sheets: Record<string, any[][]>;
}

/**
 * Stop reading after this many consecutive empty rows/columns. Once the
 * streak of blanks exceeds the threshold, everything from the start of that
 * blank block onward is dropped (only the data before it is kept).
 */
export const MAX_EMPTY_STREAK = 5;

/** A row/column is empty when every cell is blank/whitespace. */
function isEmptyRow(row: any[]) {
	return !row || row.every((cell) => String(cell ?? '').trim() === '');
}

/**
 * Keep only rows before the first blank block longer than `maxEmpty`.
 * Returns the original array when no such block exists.
 */
export function truncateEmptyRows(aoa: any[][], maxEmpty = MAX_EMPTY_STREAK) {
	let emptyStreak = 0;
	let cutIndex = aoa.length;

	for (let i = 0; i < aoa.length; i++) {
		if (isEmptyRow(aoa[i])) {
			emptyStreak++;
			if (emptyStreak > maxEmpty) {
				cutIndex = i - maxEmpty;
				break;
			}
		} else {
			emptyStreak = 0;
		}
	}

	return aoa.slice(0, cutIndex);
}

/**
 * Normalise every row to a common width, then keep only columns before the
 * first blank block longer than `maxEmpty`.
 */
export function truncateEmptyColumns(aoa: any[][], maxEmpty = MAX_EMPTY_STREAK) {
	const maxCols = aoa.reduce((max, row) => Math.max(max, row.length), 0);
	if (maxCols === 0) return aoa.map(() => []);

	// Pad all rows to a uniform width so columns can be scanned reliably.
	const padded = aoa.map((row) => {
		const copy = row.slice();
		while (copy.length < maxCols) copy.push('');
		return copy;
	});

	let emptyStreak = 0;
	let cutCol = maxCols;

	for (let c = 0; c < maxCols; c++) {
		const columnEmpty = padded.every((row) => String(row[c] ?? '').trim() === '');
		if (columnEmpty) {
			emptyStreak++;
			if (emptyStreak > maxEmpty) {
				cutCol = c - maxEmpty;
				break;
			}
		} else {
			emptyStreak = 0;
		}
	}

	return padded.map((row) => row.slice(0, cutCol));
}

/**
 * Read a workbook into a plain structure. `XLSX` is passed in so the
 * heavy dependency stays lazy-loaded by the caller. Blank rows/columns
 * beyond `MAX_EMPTY_STREAK` consecutive blanks are trimmed.
 */
export function readWorkbook(
	XLSX: any,
	binaryData: any,
	maxEmpty = MAX_EMPTY_STREAK
): WorkbookData {
	const wb = XLSX.read(binaryData, { type: 'binary' });
	const sheetNames: string[] = wb.SheetNames.slice();
	const sheets: Record<string, any[][]> = {};

	for (const name of sheetNames) {
		const ws = wb.Sheets[name];
		const aoa = XLSX.utils.sheet_to_json(ws, {
			header: 1,
			defval: '',
			blankrows: true
		});

		const normalised = (aoa || []).map((row: any) =>
			Array.isArray(row)
				? row.map((cell) => (cell === undefined || cell === null ? '' : cell))
				: []
		);

		// Trim blank padding: stop after more than `maxEmpty` empty rows/columns.
		const trimmedRows = truncateEmptyRows(normalised, maxEmpty);
		sheets[name] = truncateEmptyColumns(trimmedRows, maxEmpty);
	}

	return { sheetNames, sheets };
}

/** Safely read a cell value from a row. */
export function cellAt(row: any[], index: number | null | undefined) {
	if (index === null || index === undefined) return '';
	const value = row?.[index];
	return value === undefined || value === null ? '' : value;
}
