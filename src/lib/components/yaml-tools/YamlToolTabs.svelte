<script lang="ts">
	import { onMount } from 'svelte';
	import SafeIcon from '#lib/SafeIcon.svelte';
	import MonacoField from '../json-tools/MonacoField.svelte';
	import GitHubDiff from '../json-tools/GitHubDiff.svelte';
	import { YAML_TOOLS, type YamlToolId } from '#lib/yaml/tools';
	import { parseYaml, dumpYaml, yamlToJson, jsonToYaml, sortKeysDeep } from '#lib/yaml/yaml';
	import { validateYaml, summarize, type ValidationResult, type Summary } from '#lib/yaml/validate';
	import { lintYaml, type LintIssue } from '#lib/yaml/lint';
	import { deepMerge, type MergeArrayMode } from '#lib/yaml/merge';
	import { extractKeyValues, type KeyValueEntry } from '#lib/yaml/keyvalues';
	import { filterYaml, type FilterMode } from '#lib/yaml/filter';
	import { jsonToCsv, csvToJson } from '#lib/json/convert';
	import { jsonToXml, xmlToJson } from '#lib/json/xml';

	type ConvertMode = 'yaml-to-x' | 'x-to-yaml';
	type ConvertFormat = 'json' | 'csv' | 'xml';
	type FormatMode = 'pretty' | 'minify';

	let activeTab = $state<YamlToolId>('validate');

	// Validate
	let validateInput = $state(
		'name: John Doe\nage: 30\nactive: true\ntags:\n  - admin\n  - dev\naddress:\n  city: Jakarta\n  zip: "12345"'
	);
	let validateResult = $state<ValidationResult | null>(null);
	let validateSummary = $state<Summary | null>(null);

	// Lint
	let lintInput = $state('name: John Doe\nage: 30\n\tbad: tab-indented\ndupe: 1\ndupe: 2\n');
	let lintIssues = $state<LintIssue[]>([]);

	// Convert
	let convertInput = $state('name: John Doe\nage: 30\ntags:\n  - admin\n  - dev');
	let convertMode = $state<ConvertMode>('yaml-to-x');
	let convertFormat = $state<ConvertFormat>('json');

	// Format
	let formatInput = $state('name: John Doe\nage: 30\nactive: true\nitems:\n  - a\n  - b');
	let formatMode = $state<FormatMode>('pretty');
	let formatIndent = $state(2);
	let formatLineWidth = $state(100);
	let formatSortKeys = $state(false);

	// Merge
	let mergeBase = $state('server:\n  host: localhost\n  port: 8080\n  timeout: 30');
	let mergeOverride = $state('server:\n  port: 9090\n  tls: true\nfeatures:\n  - auth');
	let mergeArrayMode = $state<MergeArrayMode>('replace');

	// Diff
	let diffOriginal = $state('name: Alice\nrole: admin\nactive: true');
	let diffModified = $state('name: Alice\nrole: viewer\nactive: true\nlastLogin: "2024-01-15"');
	let diffOutOriginal = $state('');
	let diffOutModified = $state('');

	// Keys
	let keysInput = $state(
		'user:\n  name: John\n  profile:\n    email: john@example.com\n    age: 30\n  roles:\n    - admin\n    - dev'
	);
	let keysSearch = $state('');
	let keysAll = $state<KeyValueEntry[]>([]);
	let keysEntries = $derived(
		keysSearch.trim()
			? keysAll.filter(
					(e) =>
						e.path.toLowerCase().includes(keysSearch.trim().toLowerCase()) ||
						e.key.toLowerCase().includes(keysSearch.trim().toLowerCase())
				)
			: keysAll
	);

	// Filter
	let filterInput = $state(
		'users:\n  - name: Alice\n    role: admin\n  - name: Bob\n    role: viewer\nsettings:\n  debug: true\n  theme: dark'
	);
	let filterMode = $state<FilterMode>('keep-key');
	let filterTarget = $state('');

	let output = $state('');
	let error = $state('');
	let meta = $state('');

	let outputLang = $derived(
		activeTab === 'convert'
			? convertMode === 'yaml-to-x'
				? convertFormat === 'json'
					? 'json'
					: 'plaintext'
				: 'yaml'
			: activeTab === 'validate' || activeTab === 'lint' || activeTab === 'keys'
				? 'plaintext'
				: 'yaml'
	);

	let convertInLang = $derived(
		convertMode === 'x-to-yaml' ? (convertFormat === 'json' ? 'json' : 'plaintext') : 'yaml'
	);

	let activeLabel = $derived(YAML_TOOLS.find((t) => t.id === activeTab)?.label ?? '');

	function setResult(text: string, metaText = '') {
		output = text;
		error = '';
		meta = metaText;
	}

	function setErr(msg: string) {
		error = msg;
		output = '';
		meta = '';
	}

	// --- Validate ---
	function runValidate() {
		const result = validateYaml(validateInput);
		validateResult = result;
		if (result.valid) {
			validateSummary = summarize(result.data);
			output = JSON.stringify(result.data, null, 2);
			meta = `Valid YAML — ${validateSummary.objects} object(s), ${validateSummary.arrays} array(s), ${validateSummary.scalars} scalar(s), depth ${validateSummary.maxDepth}`;
		} else {
			validateSummary = null;
			output = '';
			meta = '';
		}
		error = '';
	}

	// --- Lint ---
	function runLint() {
		lintIssues = lintYaml(lintInput);
		error = '';
		output = JSON.stringify(lintIssues, null, 2);
		const errors = lintIssues.filter((i) => i.level === 'error').length;
		const warnings = lintIssues.filter((i) => i.level === 'warning').length;
		meta = `${lintIssues.length} issue(s): ${errors} error(s), ${warnings} warning(s)`;
	}

	// --- Convert ---
	function runConvert() {
		try {
			if (convertMode === 'yaml-to-x') {
				if (convertFormat === 'json') setResult(yamlToJson(convertInput));
				else if (convertFormat === 'csv') setResult(jsonToCsv(yamlToJson(convertInput)));
				else setResult(jsonToXml(yamlToJson(convertInput)));
			} else {
				if (convertFormat === 'json') setResult(jsonToYaml(convertInput));
				else if (convertFormat === 'csv') setResult(jsonToYaml(csvToJson(convertInput)));
				else setResult(jsonToYaml(xmlToJson(convertInput)));
			}
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	// --- Format (Minify / Pretty) ---
	function runFormat() {
		try {
			const data = parseYaml(formatInput);
			const dumped = dumpYaml(data, {
				indent: formatIndent,
				lineWidth: formatMode === 'minify' ? -1 : formatLineWidth,
				flowLevel: formatMode === 'minify' ? 0 : -1,
				sortKeys: formatSortKeys
			});
			setResult(
				dumped,
				formatMode === 'minify' ? 'Minified (flow style)' : 'Pretty-printed (block style)'
			);
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	// --- Merge ---
	function runMerge() {
		try {
			const base = parseYaml(mergeBase);
			const override = parseYaml(mergeOverride);
			const merged = deepMerge(base, override, mergeArrayMode);
			setResult(
				dumpYaml(merged),
				`Merged (arrays: ${mergeArrayMode === 'concat' ? 'concat' : 'replace'})`
			);
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	// --- Diff ---
	function runDiff() {
		try {
			const a = sortKeysDeep(parseYaml(diffOriginal));
			const b = sortKeysDeep(parseYaml(diffModified));
			diffOutOriginal = dumpYaml(a);
			diffOutModified = dumpYaml(b);
			output = '';
			error = '';
			meta = 'Comparison complete — GitHub-style diff (green = added, red = removed).';
		} catch (e: any) {
			diffOutOriginal = '';
			diffOutModified = '';
			setErr(e.message || String(e));
		}
	}

	function swapDiff() {
		const t = diffOriginal;
		diffOriginal = diffModified;
		diffModified = t;
		diffOutOriginal = '';
		diffOutModified = '';
	}

	// --- Keys ---
	function runKeys() {
		try {
			const data = parseYaml(keysInput);
			keysAll = extractKeyValues(data, '');
			output = JSON.stringify(keysAll, null, 2);
			error = '';
			meta = `${keysAll.length} key/value entr${keysAll.length === 1 ? 'y' : 'ies'} extracted`;
		} catch (e: any) {
			keysAll = [];
			setErr(e.message || String(e));
		}
	}

	// --- Filter ---
	function runFilter() {
		try {
			const data = parseYaml(filterInput);
			const filtered = filterYaml(data, filterMode, filterTarget);
			setResult(dumpYaml(filtered), `Filter applied (${filterMode.replace('-', ' ')})`);
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function selectTab(id: YamlToolId) {
		activeTab = id;
		clearOutput();
	}

	function runActive() {
		if (activeTab === 'validate') runValidate();
		else if (activeTab === 'lint') runLint();
		else if (activeTab === 'convert') runConvert();
		else if (activeTab === 'format') runFormat();
		else if (activeTab === 'merge') runMerge();
		else if (activeTab === 'diff') runDiff();
		else if (activeTab === 'keys') runKeys();
		else if (activeTab === 'filter') runFilter();
	}

	function clearOutput() {
		output = '';
		error = '';
		meta = '';
	}

	function copyOutput() {
		const text = activeTab === 'diff' ? diffOutModified : output;
		navigator.clipboard?.writeText(text);
	}

	function downloadOutput() {
		const text = activeTab === 'diff' ? diffOutModified : output;
		if (!text) return;
		const ext =
			activeTab === 'convert' && convertMode === 'yaml-to-x' && convertFormat === 'json'
				? 'json'
				: 'yaml';
		const blob = new Blob([text], { type: 'application/octet-stream' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `yaml-tools-output.${ext}`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	// Alt+1..8 switches tool, Ctrl/Cmd+Enter runs the active tool.
	function onGlobalKey(e: KeyboardEvent) {
		if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-8]$/.test(e.key)) {
			const n = Number(e.key);
			if (n >= 1 && n <= YAML_TOOLS.length) {
				e.preventDefault();
				selectTab(YAML_TOOLS[n - 1].id);
			}
		} else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			e.preventDefault();
			runActive();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onGlobalKey);
		return () => window.removeEventListener('keydown', onGlobalKey);
	});
</script>

<div class="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl">
	<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
		<div class="flex items-center space-x-3">
			<div class="rounded-full bg-white/20 p-3">
				<SafeIcon iconName="mdi-light:view-dashboard" customClass="h-8 w-8 text-white" />
			</div>
			<div>
				<h2 class="text-xl font-bold text-white">YAML Tools</h2>
				<p class="mt-1 text-sm text-white/80">
					Validate, lint, convert, format, merge, diff, and filter YAML documents
				</p>
			</div>
		</div>
	</div>
	<div class="flex items-center justify-between gap-2 bg-slate-800 px-2 py-1.5">
		<div class="flex flex-wrap items-center gap-0.5">
			{#each YAML_TOOLS as tool}
				<button
					type="button"
					title="{tool.label} (Alt+{tool.shortcut}) — {tool.description}"
					aria-label={tool.label}
					onclick={() => selectTab(tool.id)}
					class="rounded p-1.5 transition-colors {activeTab === tool.id
						? 'bg-emerald-500 text-white'
						: 'text-gray-400 hover:bg-slate-700 hover:text-white'}"
				>
					<SafeIcon iconName={tool.icon} customClass="h-5 w-5" />
				</button>
			{/each}
		</div>
		<div class="flex items-center gap-1">
			<button
				type="button"
				title="Run {activeLabel} (Ctrl+Enter)"
				onclick={runActive}
				class="flex cursor-pointer items-center gap-1.5 rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
			>
				<SafeIcon iconName="mdi:play" customClass="h-4 w-4" />
				<span>{activeLabel}</span>
			</button>
			<button
				type="button"
				title="Copy output"
				aria-label="Copy output"
				onclick={copyOutput}
				class="rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-700 hover:text-white"
			>
				<SafeIcon iconName="mdi:content-copy" customClass="h-5 w-5" />
			</button>
			<button
				type="button"
				title="Download output"
				aria-label="Download output"
				onclick={downloadOutput}
				class="rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-700 hover:text-white"
			>
				<SafeIcon iconName="mdi:download" customClass="h-5 w-5" />
			</button>
			<button
				type="button"
				title="Clear output"
				aria-label="Clear output"
				onclick={clearOutput}
				class="rounded p-1.5 text-gray-400 transition-colors hover:bg-slate-700 hover:text-white"
			>
				<SafeIcon iconName="mdi:delete" customClass="h-5 w-5" />
			</button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
		<div>
			{#if activeTab === 'validate'}
				<div class="mb-2 text-sm font-medium text-gray-600">YAML Input</div>
				<MonacoField bind:value={validateInput} language="yaml" height="16rem" />
			{:else if activeTab === 'lint'}
				<div class="mb-2 text-sm font-medium text-gray-600">YAML Input</div>
				<MonacoField bind:value={lintInput} language="yaml" height="16rem" />
			{:else if activeTab === 'convert'}
				<div class="mb-2 flex flex-wrap gap-2">
					<label class="flex items-center gap-1 text-sm text-gray-600">
						<input type="radio" bind:group={convertMode} value="yaml-to-x" /> YAML → Format
					</label>
					<label class="flex items-center gap-1 text-sm text-gray-600">
						<input type="radio" bind:group={convertMode} value="x-to-yaml" /> Format → YAML
					</label>
				</div>
				<div class="mb-2 flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => (convertFormat = 'json')}
						class="rounded border px-3 py-1 text-sm {convertFormat === 'json'
							? 'border-emerald-400 bg-emerald-100 text-emerald-700'
							: 'border-gray-300 text-gray-600'}"
					>
						JSON
					</button>
					<button
						type="button"
						onclick={() => (convertFormat = 'csv')}
						class="rounded border px-3 py-1 text-sm {convertFormat === 'csv'
							? 'border-emerald-400 bg-emerald-100 text-emerald-700'
							: 'border-gray-300 text-gray-600'}"
					>
						CSV
					</button>
					<button
						type="button"
						onclick={() => (convertFormat = 'xml')}
						class="rounded border px-3 py-1 text-sm {convertFormat === 'xml'
							? 'border-emerald-400 bg-emerald-100 text-emerald-700'
							: 'border-gray-300 text-gray-600'}"
					>
						XML
					</button>
				</div>
				<MonacoField bind:value={convertInput} language={convertInLang} height="14rem" />
			{:else if activeTab === 'format'}
				<div class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
					<label class="flex items-center gap-1">
						<input type="radio" bind:group={formatMode} value="pretty" /> Pretty
					</label>
					<label class="flex items-center gap-1">
						<input type="radio" bind:group={formatMode} value="minify" /> Minify
					</label>
					{#if formatMode === 'pretty'}
						<label class="flex items-center gap-1">
							Indent
							<select
								bind:value={formatIndent}
								class="rounded border border-gray-300 px-2 py-1 text-sm"
							>
								<option value={2}>2</option>
								<option value={4}>4</option>
							</select>
						</label>
						<label class="flex items-center gap-1">
							Line width
							<input
								type="number"
								bind:value={formatLineWidth}
								min="40"
								class="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
							/>
						</label>
						<label class="flex items-center gap-1">
							<input type="checkbox" bind:checked={formatSortKeys} /> Sort keys
						</label>
					{/if}
				</div>
				<MonacoField bind:value={formatInput} language="yaml" height="14rem" />
			{:else if activeTab === 'merge'}
				<div class="mb-2 flex items-center gap-2 text-sm text-gray-600">
					<span>Array merge:</span>
					<select
						bind:value={mergeArrayMode}
						class="rounded border border-gray-300 px-2 py-1 text-sm"
					>
						<option value="replace">Replace</option>
						<option value="concat">Concatenate</option>
					</select>
				</div>
				<div class="mb-3">
					<div class="mb-1 text-sm font-medium text-gray-600">Base YAML</div>
					<MonacoField bind:value={mergeBase} language="yaml" height="12rem" />
				</div>
				<div>
					<div class="mb-1 text-sm font-medium text-gray-600">Override YAML</div>
					<MonacoField bind:value={mergeOverride} language="yaml" height="12rem" />
				</div>
			{:else if activeTab === 'diff'}
				<div class="mb-2 flex gap-2">
					<button
						type="button"
						onclick={runDiff}
						class="flex items-center gap-1 rounded bg-emerald-500 px-3 py-1 text-sm text-white hover:bg-emerald-600"
					>
						<SafeIcon iconName="mdi:compare" customClass="h-4 w-4" />
						Compare
					</button>
					<button
						type="button"
						onclick={swapDiff}
						class="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
					>
						<SafeIcon iconName="mdi:swap-horizontal" customClass="h-4 w-4" />
						Swap
					</button>
				</div>
				<div class="mb-3">
					<div class="mb-1 text-sm font-medium text-gray-600">Original YAML</div>
					<MonacoField bind:value={diffOriginal} language="yaml" height="10rem" />
				</div>
				<div>
					<div class="mb-1 text-sm font-medium text-gray-600">Modified YAML</div>
					<MonacoField bind:value={diffModified} language="yaml" height="10rem" />
				</div>
			{:else if activeTab === 'keys'}
				<div class="mb-2 flex items-center gap-2 text-sm text-gray-600">
					<span class="shrink-0">Search:</span>
					<input
						bind:value={keysSearch}
						placeholder="Filter by path or key..."
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
					/>
				</div>
				<MonacoField bind:value={keysInput} language="yaml" height="14rem" />
			{:else if activeTab === 'filter'}
				<div class="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
					<select bind:value={filterMode} class="rounded border border-gray-300 px-2 py-1 text-sm">
						<option value="keep-key">Keep by key name</option>
						<option value="remove-key">Remove by key name</option>
						<option value="keep-path">Keep by path</option>
						<option value="remove-path">Remove by path</option>
					</select>
					<input
						bind:value={filterTarget}
						placeholder="e.g. debug or settings.theme"
						class="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
					/>
				</div>
				<MonacoField bind:value={filterInput} language="yaml" height="14rem" />
			{/if}
		</div>

		<div>
			<div class="mb-2">
				<span class="text-sm font-medium text-gray-600">Output</span>
			</div>
			{#if activeTab === 'validate'}
				{#if validateResult}
					{#if validateResult.valid}
						<div
							class="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
						>
							<SafeIcon iconName="mdi:check-circle" customClass="h-5 w-5 text-emerald-600" />
							<span class="text-sm font-medium text-emerald-700">Valid YAML</span>
						</div>
						{#if validateSummary}
							<div class="mb-2 flex flex-wrap gap-2 text-xs">
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Objects: {validateSummary.objects}</span
								>
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Arrays: {validateSummary.arrays}</span
								>
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Scalars: {validateSummary.scalars}</span
								>
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Keys: {validateSummary.keys}</span
								>
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Max depth: {validateSummary.maxDepth}</span
								>
								<span class="rounded bg-gray-100 px-2 py-1 text-gray-600"
									>Size: {validateSummary.sizeBytes} bytes</span
								>
							</div>
						{/if}
						<MonacoField value={output} readonly language="json" height="16rem" />
					{:else}
						<div
							class="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
						>
							<SafeIcon
								iconName="mdi:alert-circle"
								customClass="h-5 w-5 text-red-600 shrink-0 mt-0.5"
							/>
							<div>
								<div class="text-sm font-medium text-red-700">Invalid YAML</div>
								<div class="mt-0.5 text-xs text-red-600">
									{validateResult.error}
									{#if validateResult.line}
										( line {validateResult.line}
										{#if validateResult.column}, column {validateResult.column}{/if} )
									{/if}
								</div>
							</div>
						</div>
					{/if}
				{:else}
					<div class="px-4 py-8 text-center text-sm text-gray-400">
						Click Validate to check the YAML document.
					</div>
				{/if}
			{:else if activeTab === 'lint'}
				{#if lintIssues.length > 0}
					<div
						class="max-h-[20rem] overflow-auto overflow-hidden rounded-lg border border-gray-200"
					>
						{#each lintIssues as issue}
							<div
								class="flex items-start gap-2 border-b border-gray-100 px-3 py-1.5 text-xs {issue.level ===
								'error'
									? 'bg-red-50'
									: issue.level === 'warning'
										? 'bg-amber-50'
										: 'bg-gray-50'}"
							>
								<span
									class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase {issue.level ===
									'error'
										? 'bg-red-100 text-red-700'
										: issue.level === 'warning'
											? 'bg-amber-100 text-amber-700'
											: 'bg-gray-200 text-gray-600'}"
								>
									{issue.level}
								</span>
								<span class="text-gray-700">
									{issue.message}
									{#if issue.line}<span class="text-gray-400">
											(line {issue.line}{#if issue.column}, col {issue.column}{/if})</span
										>{/if}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="px-4 py-8 text-center text-sm text-gray-400">
						Click Lint to analyze the YAML document.
					</div>
				{/if}
			{:else if activeTab === 'diff'}
				<GitHubDiff oldText={diffOutOriginal} newText={diffOutModified} unitLabel="YAML" />
			{:else if activeTab === 'keys'}
				{#if keysEntries.length > 0}
					<div
						class="max-h-[20rem] overflow-auto overflow-hidden rounded-lg border border-gray-200"
					>
						<table class="w-full text-xs">
							<thead class="sticky top-0 bg-slate-800 text-gray-200">
								<tr>
									<th class="px-3 py-1.5 text-left font-medium">Path</th>
									<th class="px-3 py-1.5 text-left font-medium">Key</th>
									<th class="px-3 py-1.5 text-left font-medium">Type</th>
									<th class="px-3 py-1.5 text-left font-medium">Value</th>
								</tr>
							</thead>
							<tbody>
								{#each keysEntries as entry}
									<tr class="border-b border-gray-100 align-top hover:bg-gray-50">
										<td class="px-3 py-1.5 font-mono text-gray-600">{entry.path}</td>
										<td class="px-3 py-1.5 font-medium text-gray-700">{entry.key}</td>
										<td class="px-3 py-1.5 text-gray-500">{entry.type}</td>
										<td class="px-3 py-1.5 font-mono break-all text-gray-600">{entry.value}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="px-4 py-8 text-center text-sm text-gray-400">
						Click Run to extract key/value pairs.
					</div>
				{/if}
			{:else}
				<MonacoField value={output} readonly language={outputLang} height="20rem" />
			{/if}
			{#if meta && activeTab !== 'validate' && activeTab !== 'lint' && activeTab !== 'keys'}
				<div class="mt-1 text-xs text-gray-500">{meta}</div>
			{/if}
			{#if error}
				<div class="mt-1 text-xs text-red-600">{error}</div>
			{/if}
		</div>
	</div>

	<div class="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
		Add a new tool by registering it in <code class="text-emerald-600">src/lib/yaml/tools.ts</code>
		and adding a case in <code class="text-emerald-600">YamlToolTabs.svelte</code>. Shortcuts:
		Alt+1..8 switch tools, Ctrl/Cmd+Enter runs.
	</div>
</div>
