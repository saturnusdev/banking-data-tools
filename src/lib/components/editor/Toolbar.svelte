<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { filterByKey } from '$lib/json/filter';
	import SafeIcon from '$lib/SafeIcon.svelte';
	// import { registerJsonSchema } from '$lib/plugin/monaco/schema';
	// import { schemas } from '$lib/json/schemas';

	export let editor: any;
	const dispatch = createEventDispatcher();

	let filterKey = '';
	let filterValue = '';
	let schemaKey = '';

	async function beautify() {
		editor.getAction('editor.action.formatDocument').run();
	}

	async function applyFilter() {
		const original = editor.getValue();
		const parsed = JSON.parse(original);
		const result = filterByKey(parsed, filterKey, filterValue || undefined);

		dispatch('showDiff', {
			original,
			modified: JSON.stringify(result, null, 2)
		});
	}

	async function applySchema() {
		// if (!schemaKey) return;
		// await registerJsonSchema(`schema://${schemaKey}`, schemas[schemaKey]);
	}

	function validateJSON(input: string) {
		if (!input.trim()) {
			return { valid: false, error: 'Empty input' };
		}
		try {
			JSON.parse(input);
			return { valid: true, error: null };
		} catch (e: any) {
			return { valid: false, error: e.message };
		}
	}

	function escapeInsideStrings(json: string) {
		return json.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) =>
			match.replace(/\n/g, '\\n').replace(/\t/g, '\\t')
		);
	}

	function fixUnterminatedStrings(json: string) {
		const lines = json.split('\n');

		return lines
			.map((line) => {
				let quoteCount = 0;
				let escaped = false;

				for (const ch of line) {
					if (escaped) {
						escaped = false;
						continue;
					}

					if (ch === '\\') {
						escaped = true;
						continue;
					}

					if (ch === '"') quoteCount++;
				}

				// odd number of quotes -> missing closing quote
				if (quoteCount % 2 !== 0) {
					// if line ends with comma -> insert quote before comma
					if (line.trimEnd().endsWith(',')) {
						return line.replace(/,\s*$/, '",');
					}

					// if line ends with } ] -> insert before end
					if (/[}\]]\s*$/.test(line)) {
						return line.replace(/([}\]])\s*$/, '"$1');
					}

					// otherwise append quote
					return line + '"';
				}

				return line;
			})
			.join('\n');
	}

	function removeJSONComments(input: string) {
		let result = '';
		let inString = false;
		let escaped = false;

		for (let i = 0; i < input.length; i++) {
			const ch = input[i];
			const next = input[i + 1];

			// handle string state
			if (inString) {
				result += ch;

				if (escaped) {
					escaped = false;
					continue;
				}

				if (ch === '\\') {
					escaped = true;
					continue;
				}

				if (ch === '"') {
					inString = false;
				}

				continue;
			}

			// enter string
			if (ch === '"') {
				inString = true;
				result += ch;
				continue;
			}

			// single-line comment
			if (ch === '/' && next === '/') {
				i += 2;

				while (i < input.length && input[i] !== '\n') {
					i++;
				}

				result += '\n';
				continue;
			}

			// multi-line comment
			if (ch === '/' && next === '*') {
				i += 2;

				while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) {
					i++;
				}

				i++; // skip /
				continue;
			}

			result += ch;
		}

		return result;
	}

	function repairJSON(input: string) {
		if (!input?.trim()) {
			dispatch('showError', 'Empty input');
			return input;
		}

		let repaired = input.trim();
		const causes: string[] = [];

		const addCause = (msg: string) => {
			if (!causes.includes(msg)) causes.push(msg);
		};

		// 1) Smart quotes
		if (/[\u2018\u2019\u201C\u201D]/.test(repaired)) {
			repaired = repaired.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
			addCause('Smart quotes replaced');
		}

		// 2) Normalize line endings
		repaired = repaired.replace(/\r\n/g, '\n');

		// 3) Remove BOM
		if (repaired.charCodeAt(0) === 0xfeff) {
			repaired = repaired.slice(1);
			addCause('Removed BOM');
		}

		// 4) Single quotes → double quotes
		if (/'/.test(repaired)) {
			repaired = repaired.replace(/'/g, '"');
			addCause('Single quotes converted');
		}

		// 5) Missing quotes around keys
		// { name: 1 } -> { "name": 1 }
		if (/[{,]\s*[A-Za-z_$][\w$-]*\s*:/.test(repaired)) {
			repaired = repaired.replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3');
			addCause('Missing key quotes fixed');
		}

		// 6) Missing quotes around string values
		// "name": john -> "name":"john"
		repaired = repaired.replace(
			/(:\s*)([A-Za-z_$][\w$.-]*)(\s*[,}\]])/g,
			(match, p1, value, p3) => {
				if (value === 'true' || value === 'false' || value === 'null' || !isNaN(Number(value))) {
					return match;
				}

				addCause('Missing value quotes fixed');
				return `${p1}"${value}"${p3}`;
			}
		);

		// 7) Remove trailing commas
		if (/,\s*[}\]]/.test(repaired)) {
			repaired = repaired.replace(/,\s*([}\]])/g, '$1');
			addCause('Trailing commas removed');
		}

		repaired = fixUnterminatedStrings(repaired);

		const withoutComments = removeJSONComments(repaired);

		if (withoutComments !== repaired) {
			repaired = withoutComments;
			addCause('Comments removed');
		}

		// 8) Missing commas between object/array boundaries
		if (/([}\]0-9"])\s+([{["])/.test(repaired)) {
			repaired = repaired.replace(/([}\]0-9"])\s+(?=[{["])/g, '$1,');
			addCause('Missing commas inserted');
		}

		// 9) Missing colon after key
		// "name" "john" -> "name":"john"
		if (/"[^"]+"\s+(?=["{\[\d\-tfn])/.test(repaired)) {
			repaired = repaired.replace(/"([^"]+)"\s+(?=["{\[\d\-tfn])/g, '"$1": ');
			addCause('Missing colons inserted');
		}

		// 10) Escape newline/tab inside strings
		let beforeEscape = repaired;

		// repaired = repaired.replace(/\n/g, '\\n');
		// repaired = repaired.replace(/\t/g, '\\t');

		repaired = escapeInsideStrings(repaired);

		if (beforeEscape !== repaired) {
			addCause('Escaped newline/tab');
		}

		// 11) Fix invalid escape sequences
		// \q -> \\q
		const beforeInvalidEscape = repaired;

		repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');

		if (beforeInvalidEscape !== repaired) {
			addCause('Invalid escape fixed');
		}

		// 12) Fix broken unicode \u12 -> \u0012
		repaired = repaired.replace(
			/\\u([0-9A-Fa-f]{1,3})(?![0-9A-Fa-f])/g,
			(_, hex) => '\\u' + hex.padStart(4, '0')
		);

		// 13) Double slash normalization
		repaired = repaired.replace(/\\\\+/g, '\\\\');

		// 14) Add opening brace if missing
		if (
			!repaired.startsWith('{') &&
			!repaired.startsWith('[') &&
			/^\s*"[^"]+"\s*:/.test(repaired)
		) {
			repaired = `{${repaired}}`;
			addCause('Added opening brace');
		}

		// 15) Add opening bracket if array-like
		if (!repaired.startsWith('[') && repaired.startsWith('{') && repaired.endsWith('},{')) {
			repaired = `[${repaired}]`;
			addCause('Added opening bracket');
		}

		// 16) Balance braces/brackets
		const count = (re: RegExp) => (repaired.match(re) || []).length;

		const openBrace = count(/{/g);
		const closeBrace = count(/}/g);

		const openBracket = count(/\[/g);
		const closeBracket = count(/]/g);

		if (closeBrace < openBrace) {
			repaired += '}'.repeat(openBrace - closeBrace);
			addCause('Added missing closing brace');
		}

		if (closeBracket < openBracket) {
			repaired += ']'.repeat(openBracket - closeBracket);
			addCause('Added missing closing bracket');
		}

		// 17) Unquote primitives
		repaired = repaired
			.replace(/"(true|false)"/g, '$1')
			.replace(/"(null)"/g, '$1')
			.replace(/"(-?\d+(\.\d+)?)"/g, '$1');

		// 18) Double encoded JSON
		try {
			const parsed = JSON.parse(repaired);

			if (typeof parsed === 'string') {
				try {
					const nested = JSON.parse(parsed);
					repaired = JSON.stringify(nested, null, 2);
					addCause('Double-encoded JSON repaired');
				} catch {
					repaired = JSON.stringify(parsed, null, 2);
				}
			} else {
				repaired = JSON.stringify(parsed, null, 2);
			}
		} catch {
			// continue
		}

		// final validation
		try {
			const parsed = JSON.parse(repaired);

			dispatch('showSuccess', `JSON repaired successfully (${causes.length} fixes)`);

			console.log('Repair causes:', causes);

			return JSON.stringify(parsed, null, 2);
		} catch (e) {
			dispatch('showError', 'Unable to fully repair JSON');
			return aggressiveJSONRepair(repaired);
		}
	}

	function aggressiveJSONRepair(input: string) {
		let repaired = input.trim();
		const causes: string[] = [];

		const addCause = (msg: string) => {
			if (!causes.includes(msg)) causes.push(msg);
		};

		// Remove junk before first { or [
		const firstBrace = repaired.search(/[{\[]/);
		if (firstBrace > 0) {
			repaired = repaired.slice(firstBrace);
			addCause('Removed leading junk');
		}

		// Remove junk after last } or ]
		const lastBrace = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'));

		if (lastBrace >= 0 && lastBrace < repaired.length - 1) {
			repaired = repaired.slice(0, lastBrace + 1);
			addCause('Removed trailing junk');
		}

		// Fix duplicate commas
		if (/,+/.test(repaired)) {
			repaired = repaired.replace(/,{2,}/g, ',');
			addCause('Duplicate commas fixed');
		}

		// Fix duplicate colons
		if (/::+/.test(repaired)) {
			repaired = repaired.replace(/:{2,}/g, ':');
			addCause('Duplicate colons fixed');
		}

		// Fix commas before comma
		repaired = repaired.replace(/,\s*,/g, ',');

		// Missing comma between literals:
		// "a":1 "b":2
		repaired = repaired.replace(/([}\]"0-9a-zA-Z])\s+(?=")/g, '$1,');
		addCause('Inserted missing commas');

		// Missing comma after object
		// } {
		repaired = repaired.replace(/}\s*{/g, '},{');
		repaired = repaired.replace(/]\s*{/g, '],{');
		repaired = repaired.replace(/}\s*\[/g, '},[');
		repaired = repaired.replace(/]\s*\[/g, '],[');

		// balance braces
		const count = (re: RegExp) => (repaired.match(re) || []).length;

		const ob = count(/{/g);
		const cb = count(/}/g);

		const oa = count(/\[/g);
		const ca = count(/]/g);

		if (cb < ob) {
			repaired += '}'.repeat(ob - cb);
			addCause('Closed missing braces');
		}

		if (ca < oa) {
			repaired += ']'.repeat(oa - ca);
			addCause('Closed missing brackets');
		}

		// recursively decode JSON-stringified JSON
		try {
			let parsed: any = JSON.parse(repaired);

			let depth = 0;

			while (typeof parsed === 'string' && depth < 5) {
				try {
					parsed = JSON.parse(parsed);
					addCause('Decoded nested JSON string');
				} catch {
					break;
				}
				depth++;
			}

			repaired = JSON.stringify(parsed, null, 2);

			dispatch('showSuccess', `JSON repaired with advanced fixes (${causes.length})`);

			console.log(causes);

			return repaired;
		} catch (e: any) {
			dispatch('showError', 'Could not repair JSON: ' + e.message);

			return input;
		}
	}

	function validateCurrentJSON() {
		const input = editor.getValue();
		const result = validateJSON(input);

		if (result.valid) {
			dispatch('showSuccess', 'Valid JSON!');
		} else {
			dispatch('showError', 'Invalid JSON: ' + result.error);
		}
	}

	function repairCurrentJSON() {
		const input = editor.getValue();
		const repaired = repairJSON(input);

		// Update the editor with repaired content
		if (repaired !== input) {
			editor.setValue(repaired);
			dispatch('contentChanged', repaired);
		}
	}
</script>

<div class="flex gap-2 border-b border-gray-200 bg-gray-100 p-2 text-sm">
	<input
		class="rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
		placeholder="Filter key"
		bind:value={filterKey}
	/>
	<input
		class="rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
		placeholder="Value"
		bind:value={filterValue}
	/>
	<button
		class="cursor-pointer rounded bg-blue-500 px-3 py-1 text-white transition-colors hover:bg-blue-600"
		on:click={applyFilter}>Filter</button
	>

	<select
		class="rounded border border-gray-300 bg-white px-2 py-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
		bind:value={schemaKey}
		on:change={applySchema}
	>
		<option value="">Schema</option>
		<option value="user">User</option>
		<option value="order">Order</option>
	</select>

	<div class="mx-1 border-l border-gray-300"></div>

	<button
		class="cursor-pointer rounded bg-green-500 px-3 py-1 text-white transition-colors hover:bg-green-600"
		on:click={validateCurrentJSON}
		title="Validate JSON"
	>
		<span class="relative z-10 flex items-center justify-center space-x-2">
			<SafeIcon iconName="mdi-light:check-circle" customClass="h-4 w-4" />
			<span>Validate JSON</span>
		</span>
	</button>
	<button
		class="cursor-pointer rounded bg-orange-500 px-3 py-1 text-white transition-colors hover:bg-orange-600"
		on:click={repairCurrentJSON}
		title="Repair JSON"
	>
		Repair
	</button>
	<button
		class="cursor-pointer rounded bg-purple-500 px-3 py-1 text-white transition-colors hover:bg-purple-600"
		on:click={beautify}
		title="Format JSON"
	>
		Format
	</button>
</div>
