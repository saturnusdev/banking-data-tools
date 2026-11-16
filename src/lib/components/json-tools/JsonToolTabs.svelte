<script lang="ts">
	import { jsonToYaml, yamlToJson, jsonToCsv, csvToJson } from '#lib/json/convert';
	import { jsonToXml, xmlToJson } from '#lib/json/xml';
	import { queryJsonPath } from '#lib/json/jsonpath';
	import { generateSchema, generateMock } from '#lib/json/schema';
	import { cleanJson } from '#lib/json/clean';
	import { paginateArray } from '#lib/json/paginate';
	import SafeIcon from '#lib/SafeIcon.svelte';

	type Tab = 'convert' | 'minify' | 'query' | 'schema' | 'mock' | 'paginate' | 'clean';

	const tabs: { id: Tab; label: string; icon: string }[] = [
		{ id: 'convert', label: 'Convert', icon: 'mdi-light:swap-horizontal' },
		{ id: 'minify', label: 'Minify', icon: 'mdi-light:compress' },
		{ id: 'query', label: 'JSONPath', icon: 'mdi-light:magnify' },
		{ id: 'schema', label: 'Schema', icon: 'mdi-light:file-code' },
		{ id: 'mock', label: 'Mock', icon: 'mdi-light:auto-fix' },
		{ id: 'paginate', label: 'Paginate', icon: 'mdi-light:page-next' },
		{ id: 'clean', label: 'Clean', icon: 'mdi-light:broom' }
	];

	let activeTab = $state<Tab>('convert');
	let output = $state('');
	let error = $state('');

	// Convert
	let convertInput = $state('{\n  "name": "John Doe",\n  "age": 30,\n  "tags": ["admin", "dev"]\n}');
	let convertFormat = $state<'yaml' | 'csv' | 'xml'>('yaml');
	let convertMode = $state<'json-to-x' | 'x-to-json'>('json-to-x');

	// Minify
	let minifyInput = $state('{\n  "name": "John Doe",\n  "age": 30\n}');
	let minifyIndent = $state(0);

	// Query
	let queryInput = $state('{\n  "users": [\n    { "name": "Alice", "age": 30 },\n    { "name": "Bob", "age": 25 }\n  ]\n}');
	let queryPath = $state('$.users[?(@.age > 26)].name');

	// Schema
	let schemaInput = $state('{\n  "name": "John Doe",\n  "age": 30,\n  "active": true,\n  "tags": ["a", "b"]\n}');

	// Mock
	let mockInput = $state('{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "integer" },\n    "email": { "type": "string", "format": "email" }\n  }\n}');

	// Paginate
	let paginateInput = $state('[\n  { "id": 1, "name": "Item 1" },\n  { "id": 2, "name": "Item 2" }\n]');
	let paginatePage = $state(1);
	let paginatePageSize = $state(10);

	// Clean
	let cleanInput = $state('{\n  "a": 1,\n  "b": null,\n  "c": "",\n  "d": [],\n  "e": { "x": null }\n}');
	let cleanOpts = $state({
		removeNulls: true,
		removeEmptyObjects: true,
		removeEmptyArrays: true,
		removeEmptyStrings: true,
		sortKeys: false,
		dedupeArrays: false,
		trimStrings: false
	});

	let meta = $state('');

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

	function runConvert() {
		try {
			if (convertMode === 'json-to-x') {
				if (convertFormat === 'yaml') setResult(jsonToYaml(convertInput));
				else if (convertFormat === 'csv') setResult(jsonToCsv(convertInput));
				else setResult(jsonToXml(convertInput));
			} else {
				if (convertFormat === 'yaml') setResult(yamlToJson(convertInput));
				else if (convertFormat === 'csv') setResult(csvToJson(convertInput));
				else setResult(xmlToJson(convertInput));
			}
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runMinify() {
		try {
			const parsed = JSON.parse(minifyInput);
			setResult(JSON.stringify(parsed, null, minifyIndent || undefined));
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runQuery() {
		try {
			const data = JSON.parse(queryInput);
			const results = queryJsonPath(data, queryPath);
			setResult(JSON.stringify(results, null, 2));
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runSchema() {
		try {
			const data = JSON.parse(schemaInput);
			setResult(JSON.stringify(generateSchema(data), null, 2));
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runMock() {
		try {
			const schema = JSON.parse(mockInput);
			setResult(JSON.stringify(generateMock(schema), null, 2));
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runPaginate() {
		try {
			const data = JSON.parse(paginateInput);
			const r = paginateArray(data, paginatePage, paginatePageSize);
			paginatePage = r.page;
			setResult(JSON.stringify(r.items, null, 2), `Page ${r.page}/${r.totalPages} — ${r.total} items (page size ${r.pageSize})`);
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function runClean() {
		try {
			const data = JSON.parse(cleanInput);
			setResult(JSON.stringify(cleanJson(data, cleanOpts), null, 2));
		} catch (e: any) {
			setErr(e.message || String(e));
		}
	}

	function copyOutput() {
		navigator.clipboard?.writeText(output);
	}
</script>

<div class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
	<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
		<div class="flex items-center space-x-3">
			<div class="rounded-full bg-white/20 p-3">
				<SafeIcon iconName="mdi-light:view-dashboard" customClass="h-8 w-8 text-white" />
			</div>
			<div>
				<h2 class="text-xl font-bold text-white">JSON Tools</h2>
				<p class="text-white/80 text-sm mt-1">Convert, minify, query, and generate JSON data</p>
			</div>
		</div>
	</div>
	<div class="flex flex-wrap gap-1 bg-gray-50 border-b border-gray-200 p-2">
		{#each tabs as tab}
			<button
				type="button"
				onclick={() => {
					activeTab = tab.id;
					output = '';
					error = '';
					meta = '';
				}}
				class="px-3 py-1 text-sm font-medium rounded cursor-pointer transition-colors {activeTab === tab.id
					? 'bg-emerald-500 text-white'
					: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
		<div>
			{#if activeTab === 'convert'}
				<div class="mb-2 flex gap-2">
					<label class="flex items-center gap-1 text-sm text-gray-600">
						<input type="radio" bind:group={convertMode} value="json-to-x" /> JSON → Format
					</label>
					<label class="flex items-center gap-1 text-sm text-gray-600">
						<input type="radio" bind:group={convertMode} value="x-to-json" /> Format → JSON
					</label>
				</div>
				<div class="mb-2 flex gap-2">
					<button
						type="button"
						onclick={() => (convertFormat = 'yaml')}
						class="px-3 py-1 text-sm rounded border {convertFormat === 'yaml' ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'border-gray-300 text-gray-600'}"
					>
						YAML
					</button>
					<button
						type="button"
						onclick={() => (convertFormat = 'csv')}
						class="px-3 py-1 text-sm rounded border {convertFormat === 'csv' ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'border-gray-300 text-gray-600'}"
					>
						CSV
					</button>
					<button
						type="button"
						onclick={() => (convertFormat = 'xml')}
						class="px-3 py-1 text-sm rounded border {convertFormat === 'xml' ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'border-gray-300 text-gray-600'}"
					>
						XML
					</button>
				</div>
				<textarea
					bind:value={convertInput}
					class="w-full h-56 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runConvert}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Convert
				</button>
			{:else if activeTab === 'minify'}
				<div class="mb-2 flex items-center gap-2 text-sm text-gray-600">
					<label>Indent:</label>
					<select bind:value={minifyIndent} class="border border-gray-300 rounded px-2 py-1 text-sm">
						<option value={0}>0 (minify)</option>
						<option value={2}>2</option>
						<option value={4}>4</option>
					</select>
				</div>
				<textarea
					bind:value={minifyInput}
					class="w-full h-64 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runMinify}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Minify / Format
				</button>
			{:else if activeTab === 'query'}
				<input
					bind:value={queryPath}
					placeholder="JSONPath expression, e.g. $.users[?(@.age > 26)].name"
					class="mb-2 w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
				/>
				<textarea
					bind:value={queryInput}
					class="w-full h-56 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runQuery}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Run Query
				</button>
			{:else if activeTab === 'schema'}
				<textarea
					bind:value={schemaInput}
					class="w-full h-64 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runSchema}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Generate Schema
				</button>
			{:else if activeTab === 'mock'}
				<textarea
					bind:value={mockInput}
					class="w-full h-64 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runMock}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Generate Mock
				</button>
			{:else if activeTab === 'paginate'}
				<div class="mb-2 flex gap-3 text-sm text-gray-600">
					<label class="flex items-center gap-1">
						Page
						<input type="number" bind:value={paginatePage} min="1" class="w-16 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
					</label>
					<label class="flex items-center gap-1">
						Page Size
						<input type="number" bind:value={paginatePageSize} min="1" class="w-16 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
					</label>
				</div>
				<textarea
					bind:value={paginateInput}
					class="w-full h-56 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runPaginate}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Paginate
				</button>
			{:else if activeTab === 'clean'}
				<div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
					<label><input type="checkbox" bind:checked={cleanOpts.removeNulls} /> Remove nulls</label>
					<label><input type="checkbox" bind:checked={cleanOpts.removeEmptyObjects} /> Remove empty objects</label>
					<label><input type="checkbox" bind:checked={cleanOpts.removeEmptyArrays} /> Remove empty arrays</label>
					<label><input type="checkbox" bind:checked={cleanOpts.removeEmptyStrings} /> Remove empty strings</label>
					<label><input type="checkbox" bind:checked={cleanOpts.sortKeys} /> Sort keys</label>
					<label><input type="checkbox" bind:checked={cleanOpts.dedupeArrays} /> Dedupe arrays</label>
					<label><input type="checkbox" bind:checked={cleanOpts.trimStrings} /> Trim strings</label>
				</div>
				<textarea
					bind:value={cleanInput}
					class="w-full h-56 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
					spellcheck="false"
				></textarea>
				<button
					type="button"
					onclick={runClean}
					class="mt-2 px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-emerald-500 text-white transition-all hover:bg-emerald-600"
				>
					Clean
				</button>
			{/if}
		</div>

		<div>
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-gray-600">Output</span>
				<button
					type="button"
					onclick={copyOutput}
					class="px-3 py-1 text-sm rounded cursor-pointer border border-gray-300 text-gray-600 hover:bg-gray-100"
				>
					Copy
				</button>
			</div>
			<textarea
				bind:value={output}
				readonly
				class="w-full h-80 font-mono text-sm p-3 border border-gray-200 rounded-lg bg-gray-50"
				placeholder="Output appears here"
				spellcheck="false"
			></textarea>
			{#if meta}
				<div class="text-xs text-gray-500 mt-1">{meta}</div>
			{/if}
			{#if error}
				<div class="text-xs text-red-600 mt-1">{error}</div>
			{/if}
		</div>
	</div>
</div>
