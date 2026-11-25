<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		validateXml,
		xmlToJson,
		jsonToXml,
		formatXml,
		minifyXml,
		escapeXml,
		unescapeXml,
		xmlToCsv,
		xmlToFixedWidth,
		fixedWidthToXml,
		type XmlField,
		type XmlValidationResult
	} from '#lib/xml/xml';
	import { buildXmlTree, type XmlTreeNode } from '#lib/xml/tree';
	import MonacoField from '#lib/components/json-tools/MonacoField.svelte';
	import GitHubDiff from '#lib/components/json-tools/GitHubDiff.svelte';
	import XmlTree from './XmlTree.svelte';
	import { confirmOnLeave } from '#lib/navigation-guard';

	type Tab = 'format' | 'validate' | 'convert' | 'fixed' | 'csv' | 'escape' | 'diff' | 'tree';

	const tabs: { id: Tab; label: string; icon: string }[] = [
		{ id: 'format', label: 'Format / Minify', icon: 'mdi:format-align-left' },
		{ id: 'validate', label: 'Validate', icon: 'mdi:check-decagram-outline' },
		{ id: 'convert', label: 'XML ↔ JSON', icon: 'mdi:swap-horizontal' },
		{ id: 'fixed', label: 'XML ↔ Fixed-Width', icon: 'mdi:view-column-outline' },
		{ id: 'csv', label: 'XML → CSV', icon: 'mdi:table' },
		{ id: 'escape', label: 'Escape / Unescape', icon: 'mdi:code-tags' },
		{ id: 'diff', label: 'Diff', icon: 'mdi:compare' },
		{ id: 'tree', label: 'Tree View', icon: 'mdi:file-tree-outline' }
	];

	let activeTab = $state('format');
	let output = $state('');
	let error = $state('');
	let success = $state('');

	const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<records>
  <record>
    <id>001</id>
    <name>John Doe</name>
    <amount>1500.00</amount>
  </record>
  <record>
    <id>002</id>
    <name>Jane Smith</name>
    <amount>2750.50</amount>
  </record>
</records>`;

	const sampleXmlModified = `<?xml version="1.0" encoding="UTF-8"?>
<records>
  <record>
    <id>001</id>
    <name>John Doe</name>
    <amount>1800.00</amount>
    <status>active</status>
  </record>
  <record>
    <id>002</id>
    <name>Jane Smith</name>
    <amount>2750.50</amount>
  </record>
  <record>
    <id>003</id>
    <name>Alice Brown</name>
    <amount>920.75</amount>
  </record>
</records>`;

	/* ---- Format ---- */
	let formatInput = $state(sampleXml);
	let formatIndent = $state(2);

	/* ---- Validate ---- */
	let validateInput = $state(sampleXml);
	let validationResult = $state<XmlValidationResult | null>(null);

	/* ---- Convert ---- */
	let convertInput = $state(sampleXml);
	let convertMode = $state('xml-to-json');
	let convertRoot = $state('records');

	/* ---- Fixed ---- */
	let fixedMode = $state('xml-to-fixed');
	let fixedXmlInput = $state(sampleXml);
	let fixedTextInput = $state('');
	let fixedFields = $state<XmlField[]>([
		{ name: 'id', length: 6, align: 'left', pad: ' ' },
		{ name: 'name', length: 20, align: 'left', pad: ' ' },
		{ name: 'amount', length: 12, align: 'right', pad: '0' }
	]);
	let fixedRecordName = $state('record');
	let fixedRootName = $state('records');

	/* ---- CSV ---- */
	let csvInput = $state(sampleXml);
	let csvDelimiter = $state(',');

	/* ---- Escape ---- */
	let escapeInput = $state('<name>John & Jane</name>');
	let escapeMode = $state('escape');

	/* ---- Diff ---- */
	let diffOriginal = $state(sampleXml);
	let diffModified = $state(sampleXmlModified);
	let diffOutOriginal = $state('');
	let diffOutModified = $state('');

	/* ---- Tree ---- */
	let treeInput = $state(sampleXml);
	let treeNodes = $state<XmlTreeNode[]>([]);
	let treeSelection = $state('');

	function clearMsg() {
		error = '';
		success = '';
	}

	function errorMessage(e: unknown): string {
		return e instanceof Error ? e.message : String(e);
	}

	function copyOut() {
		if (!output) return;
		navigator.clipboard.writeText(output);
		success = 'Copied to clipboard';
		setTimeout(() => (success = ''), 2000);
	}

	function addField() {
		fixedFields = [...fixedFields, { name: '', length: 10, align: 'left', pad: ' ' }];
	}

	function removeField(i: number) {
		fixedFields = fixedFields.filter((_, idx) => idx !== i);
	}

	function updateField(i: number, key: keyof XmlField, value: string) {
		const next = [...fixedFields];
		if (key === 'length') {
			next[i] = { ...next[i], length: Number(value) || 0 };
		} else if (key === 'align') {
			next[i] = { ...next[i], align: value === 'right' ? 'right' : 'left' };
		} else {
			next[i] = { ...next[i], [key]: value };
		}
		fixedFields = next;
	}

	function runFormat() {
		clearMsg();
		try {
			output = formatXml(formatInput, formatIndent);
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function runMinify() {
		clearMsg();
		try {
			output = minifyXml(formatInput);
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function runValidate() {
		clearMsg();
		const res = validateXml(validateInput);
		validationResult = res;
		if (!res.valid) {
			error = res.errors.map((e) => `${e.msg} (line ${e.line ?? '?'}, col ${e.col ?? '?'})`).join('; ');
		}
	}

	function runConvert() {
		clearMsg();
		try {
			output = convertMode === 'xml-to-json' ? xmlToJson(convertInput) : jsonToXml(convertInput, convertRoot);
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function runFixed() {
		clearMsg();
		try {
			if (fixedMode === 'xml-to-fixed') {
				const res = xmlToFixedWidth(fixedXmlInput, fixedFields.filter((f) => f.name && f.length > 0));
				output = res.text;
				if (res.fields.length && !fixedFields.some((f) => f.name)) {
					fixedFields = res.fields;
				}
			} else {
				output = fixedWidthToXml(fixedTextInput.split('\n'), fixedFields, {
					recordName: fixedRecordName,
					rootName: fixedRootName
				});
			}
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function autoDetectFixed() {
		clearMsg();
		try {
			const res = xmlToFixedWidth(fixedXmlInput, []);
			fixedFields = res.fields;
			fixedRecordName = res.recordName;
			output = res.text;
			success = `Auto-detected ${res.fields.length} field(s) from XML`;
			setTimeout(() => (success = ''), 3000);
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function runCsv() {
		clearMsg();
		try {
			output = xmlToCsv(csvInput, csvDelimiter);
		} catch (e) {
			error = errorMessage(e);
		}
	}

	function runEscape() {
		clearMsg();
		output = escapeMode === 'escape' ? escapeXml(escapeInput) : unescapeXml(escapeInput);
	}

	function runDiff() {
		clearMsg();
		try {
			// Normalize both sides (format + validate) so whitespace / entity
			// differences don't produce noisy line-level diffs.
			diffOutOriginal = formatXml(diffOriginal, 2);
			diffOutModified = formatXml(diffModified, 2);
		} catch (e) {
			error = errorMessage(e);
			diffOutOriginal = '';
			diffOutModified = '';
		}
	}

	function swapDiff() {
		const t = diffOriginal;
		diffOriginal = diffModified;
		diffModified = t;
		diffOutOriginal = '';
		diffOutModified = '';
	}

	function runTree() {
		clearMsg();
		try {
			treeNodes = buildXmlTree(treeInput);
			treeSelection = '';
			if (treeNodes.length === 0) error = 'No XML content to display';
		} catch (e) {
			error = errorMessage(e);
			treeNodes = [];
		}
	}

	function switchTab(id: Tab) {
		activeTab = id;
		error = '';
		success = '';
		output = '';
		validationResult = null;
		diffOutOriginal = '';
		diffOutModified = '';
		treeSelection = '';
	}

	// Reset every tool back to its sample data (wired to the header "Load Sample" button).
	export function loadSample() {
		formatInput = sampleXml;
		formatIndent = 2;
		validateInput = sampleXml;
		validationResult = null;
		convertInput = sampleXml;
		convertMode = 'xml-to-json';
		convertRoot = 'records';
		fixedMode = 'xml-to-fixed';
		fixedXmlInput = sampleXml;
		fixedTextInput = '';
		fixedFields = [
			{ name: 'id', length: 6, align: 'left', pad: ' ' },
			{ name: 'name', length: 20, align: 'left', pad: ' ' },
			{ name: 'amount', length: 12, align: 'right', pad: '0' }
		];
		fixedRecordName = 'record';
		fixedRootName = 'records';
		csvInput = sampleXml;
		csvDelimiter = ',';
		escapeInput = '<name>John & Jane</name>';
		escapeMode = 'escape';
		diffOriginal = sampleXml;
		diffModified = sampleXmlModified;
		diffOutOriginal = '';
		diffOutModified = '';
		treeInput = sampleXml;
		treeNodes = [];
		treeSelection = '';
		switchTab('format');
	}

	// Warn before reload / back / forward / swipe / navigating away with unsaved data.
	// Inputs are prefilled with samples, so we only warn when a result was generated.
	function hasUnsavedData() {
		return (
			output.trim() !== '' ||
			Boolean(validationResult) ||
			diffOutModified.trim() !== ''
		);
	}
	confirmOnLeave(hasUnsavedData);
</script>

<!-- Tab Navigation (matches ISO 8583 Studio layout) -->
<nav class="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-orange-100 shadow-sm">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex gap-1 overflow-x-auto py-2">
			{#each tabs as tab}
				<button
					onclick={() => switchTab(tab.id)}
					class="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all {activeTab === tab.id
						? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
						: 'text-gray-600 hover:bg-orange-50'}"
				>
					<Icon icon={tab.icon} class="h-4 w-4" />
					{tab.label}
				</button>
			{/each}
		</div>
	</div>
</nav>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
	<!-- Format / Minify -->
	{#if activeTab === 'format'}
		<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-amber-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:format-align-left" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Format / Minify XML</h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<select bind:value={formatIndent} class="rounded-lg bg-white/20 text-white text-sm px-3 py-2">
						<option value="2" class="text-gray-800">2 spaces</option>
						<option value="4" class="text-gray-800">4 spaces</option>
						<option value="1" class="text-gray-800">1 space (tab-ish)</option>
					</select>
					<button onclick={runFormat} class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30">
						Format
					</button>
					<button onclick={runMinify} class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30">
						Minify
					</button>
				</div>
			</div>
			<div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div>
					<label for="format-xml-input" class="block text-sm font-medium text-gray-700 mb-1">XML Input</label>
					<textarea
						id="format-xml-input"
						bind:value={formatInput}
						placeholder="Paste XML here..."
						class="w-full h-80 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-100 resize-none"
					></textarea>
				</div>
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="format-xml-output" class="block text-sm font-medium text-gray-700">Output</label>
						<button onclick={copyOut} class="text-xs text-orange-600 hover:text-orange-700 font-medium">Copy</button>
					</div>
					<textarea
						id="format-xml-output"
						readonly
						bind:value={output}
						placeholder="Formatted / minified output..."
						class="w-full h-80 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:outline-none"
					></textarea>
				</div>
			</div>
		</section>
	{:else if activeTab === 'validate'}
		<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:check-decagram-outline" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML Validator</h2>
				</div>
				<button onclick={runValidate} class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30">
					Validate
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<label for="validate-xml-input" class="block text-sm font-medium text-gray-700 mb-1">XML Input</label>
					<textarea
						id="validate-xml-input"
						bind:value={validateInput}
						placeholder="Paste XML to validate..."
						class="w-full h-72 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-green-400 focus:ring-4 focus:ring-green-100 resize-none"
					></textarea>
				</div>
				{#if validationResult}
					<div class="rounded-xl border-2 p-4 {validationResult.valid
						? 'border-green-200 bg-green-50'
						: 'border-rose-200 bg-rose-50'}">
						{#if validationResult.valid}
							<div class="flex items-center gap-2 text-green-700 font-semibold">
								<Icon icon="mdi:check-circle" class="h-5 w-5" />
								Valid XML document
							</div>
						{:else}
							<div class="flex items-center gap-2 text-rose-700 font-semibold mb-2">
								<Icon icon="mdi:alert-circle" class="h-5 w-5" />
								Invalid XML — {validationResult.errors.length} error(s)
							</div>
							{#each validationResult.errors as err}
								<div class="text-sm text-rose-700 font-mono">
									Line {err.line ?? '?'}, Col {err.col ?? '?'}: {err.msg}
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</section>
	<!-- Convert -->
	{:else if activeTab === 'convert'}
		<section class="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:swap-horizontal" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML ↔ JSON</h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => { convertMode = 'xml-to-json'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {convertMode === 'xml-to-json'
							? 'bg-white text-blue-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						XML → JSON
					</button>
					<button
						onclick={() => { convertMode = 'json-to-xml'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {convertMode === 'json-to-xml'
							? 'bg-white text-blue-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						JSON → XML
					</button>
				</div>
			</div>
			<div class="p-6 space-y-4">
				{#if convertMode === 'json-to-xml'}
					<div>
						<label for="convert-root" class="block text-sm font-medium text-gray-700 mb-1">Root Element Name</label>
						<input
							id="convert-root"
							bind:value={convertRoot}
							placeholder="e.g., records"
							class="w-64 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
						/>
					</div>
				{/if}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<label for="convert-input" class="block text-sm font-medium text-gray-700 mb-1">{convertMode === 'xml-to-json' ? 'XML Input' : 'JSON Input'}</label>
						<textarea
							id="convert-input"
							bind:value={convertInput}
							placeholder={convertMode === 'xml-to-json' ? 'Paste XML here...' : 'Paste JSON here...'}
							class="w-full h-80 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
						></textarea>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="convert-output" class="block text-sm font-medium text-gray-700">{convertMode === 'xml-to-json' ? 'JSON Output' : 'XML Output'}</label>
							<button onclick={copyOut} class="text-xs text-blue-600 hover:text-blue-700 font-medium">Copy</button>
						</div>
						<textarea
							id="convert-output"
							readonly
							bind:value={output}
							placeholder="Converted output..."
							class="w-full h-80 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:outline-none"
						></textarea>
					</div>
				</div>
				<div class="flex justify-center">
					<button onclick={runConvert} class="rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600">
						Convert
					</button>
				</div>
			</div>
		</section>
	<!-- Fixed-Width -->
	{:else if activeTab === 'fixed'}
		<section class="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
			<div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:view-column-outline" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML ↔ Fixed-Width</h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => { fixedMode = 'xml-to-fixed'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {fixedMode === 'xml-to-fixed'
							? 'bg-white text-purple-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						XML → Fixed-Width
					</button>
					<button
						onclick={() => { fixedMode = 'fixed-to-xml'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {fixedMode === 'fixed-to-xml'
							? 'bg-white text-purple-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						Fixed-Width → XML
					</button>
				</div>
			</div>
			<div class="p-6 space-y-5">
				<!-- Field definitions -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="block text-sm font-medium text-gray-700">Field Definitions</span>
						<div class="flex gap-2">
							<button onclick={autoDetectFixed} class="text-xs text-purple-600 hover:text-purple-700 font-medium">
								Auto-detect from XML
							</button>
							<button onclick={addField} class="text-xs text-purple-600 hover:text-purple-700 font-medium">
								+ Add Field
							</button>
						</div>
					</div>
					<div class="overflow-x-auto rounded-xl border border-gray-200">
						<table class="w-full text-sm">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-2 text-left text-gray-600">#</th>
									<th class="px-4 py-2 text-left text-gray-600">Name</th>
									<th class="px-4 py-2 text-left text-gray-600">Length</th>
									<th class="px-4 py-2 text-left text-gray-600">Align</th>
									<th class="px-4 py-2 text-left text-gray-600">Pad</th>
									<th class="px-4 py-2"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								{#each fixedFields as field, i (i)}
									<tr>
										<td class="px-4 py-2 text-gray-500">{i + 1}</td>
										<td class="px-4 py-2">
											<input
												value={field.name}
												oninput={(e) => updateField(i, 'name', e.currentTarget.value)}
												class="w-36 rounded-lg border border-gray-200 px-2 py-1 font-mono text-sm focus:border-purple-400"
											/>
										</td>
										<td class="px-4 py-2">
											<input
												type="number"
												value={field.length}
												oninput={(e) => updateField(i, 'length', e.currentTarget.value)}
												class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-purple-400"
											/>
										</td>
										<td class="px-4 py-2">
											<select
												value={field.align}
												onchange={(e) => updateField(i, 'align', e.currentTarget.value)}
												class="rounded-lg border border-gray-200 px-2 py-1 text-sm"
											>
												<option value="left">Left</option>
												<option value="right">Right</option>
											</select>
										</td>
										<td class="px-4 py-2">
											<input
												value={field.pad}
												maxlength="1"
												oninput={(e) => updateField(i, 'pad', e.currentTarget.value)}
												class="w-12 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm focus:border-purple-400"
											/>
										</td>
										<td class="px-4 py-2 text-right">
											<button onclick={() => removeField(i)} class="text-rose-500 hover:text-rose-600 text-sm">✕</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				{#if fixedMode === 'fixed-to-xml'}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="fixed-record-name" class="block text-sm font-medium text-gray-700 mb-1">Record Element Name</label>
							<input
								id="fixed-record-name"
								bind:value={fixedRecordName}
								class="w-full rounded-xl border-2 border-gray-200 px-4 py-2 text-sm focus:border-purple-400"
							/>
						</div>
						<div>
							<label for="fixed-root-name" class="block text-sm font-medium text-gray-700 mb-1">Root Element Name</label>
							<input
								id="fixed-root-name"
								bind:value={fixedRootName}
								class="w-full rounded-xl border-2 border-gray-200 px-4 py-2 text-sm focus:border-purple-400"
							/>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<label for="fixed-width-input" class="block text-sm font-medium text-gray-700 mb-1">
							{fixedMode === 'xml-to-fixed' ? 'XML Input' : 'Fixed-Width Input'}
						</label>
						<textarea
							id="fixed-width-input"
							value={fixedMode === 'xml-to-fixed' ? fixedXmlInput : fixedTextInput}
							oninput={(e) => {
								if (fixedMode === 'xml-to-fixed') fixedXmlInput = e.currentTarget.value;
								else fixedTextInput = e.currentTarget.value;
							}}
							placeholder={fixedMode === 'xml-to-fixed' ? 'Paste XML with repeated record elements...' : 'Paste fixed-width lines (one per line)...'}
							class="w-full h-72 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100 resize-none"
						></textarea>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="fixed-width-output" class="block text-sm font-medium text-gray-700">{fixedMode === 'xml-to-fixed' ? 'Fixed-Width Output' : 'XML Output'}</label>
							<button onclick={copyOut} class="text-xs text-purple-600 hover:text-purple-700 font-medium">Copy</button>
						</div>
						<textarea
							id="fixed-width-output"
							readonly
							bind:value={output}
							placeholder="Converted output..."
							class="w-full h-72 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:outline-none"
						></textarea>
					</div>
				</div>
				<div class="flex justify-center">
					<button onclick={runFixed} class="rounded-lg bg-purple-500 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-600">
						{fixedMode === 'xml-to-fixed' ? 'XML → Fixed-Width' : 'Fixed-Width → XML'}
					</button>
				</div>
			</div>
		</section>
	<!-- CSV -->
	{:else if activeTab === 'csv'}
		<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:table" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML → CSV</h2>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<select bind:value={csvDelimiter} class="rounded-lg bg-white/20 text-white text-sm px-3 py-2">
						<option value="," class="text-gray-800">Comma (,)</option>
						<option value=";" class="text-gray-800">Semicolon (;)</option>
						<option value={'\t'} class="text-gray-800">Tab</option>
						<option value="|" class="text-gray-800">Pipe (|)</option>
					</select>
					<button onclick={runCsv} class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30">
						Convert
					</button>
				</div>
			</div>
			<div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div>
					<label for="csv-xml-input" class="block text-sm font-medium text-gray-700 mb-1">XML Input</label>
					<textarea
						id="csv-xml-input"
						bind:value={csvInput}
						placeholder="Paste XML with repeated record elements..."
						class="w-full h-80 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
					></textarea>
				</div>
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="csv-output" class="block text-sm font-medium text-gray-700">CSV Output</label>
						<button onclick={copyOut} class="text-xs text-teal-600 hover:text-teal-700 font-medium">Copy</button>
					</div>
					<textarea
						id="csv-output"
						readonly
						bind:value={output}
						placeholder="CSV output..."
						class="w-full h-80 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:outline-none"
					></textarea>
				</div>
			</div>
		</section>
	<!-- Diff -->
	{:else if activeTab === 'diff'}
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:compare" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML Diff (GitHub style)</h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						onclick={runDiff}
						class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
					>
						Compare
					</button>
					<button
						onclick={swapDiff}
						class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
					>
						Swap
					</button>
				</div>
			</div>
			<div class="p-6 space-y-4">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<div id="diff-original-label" class="block text-sm font-medium text-gray-700 mb-1">Original XML</div>
						<MonacoField bind:value={diffOriginal} language="xml" height="14rem" id="diff-original" ariaLabel="Original XML" />
					</div>
					<div>
						<div id="diff-modified-label" class="block text-sm font-medium text-gray-700 mb-1">Modified XML</div>
						<MonacoField bind:value={diffModified} language="xml" height="14rem" id="diff-modified" ariaLabel="Modified XML" />
					</div>
				</div>
				<div>
					<div class="block text-sm font-medium text-gray-700 mb-1">Diff Result</div>
					<GitHubDiff oldText={diffOutOriginal} newText={diffOutModified} unitLabel="XML" />
				</div>
			</div>
		</section>
	<!-- Tree -->
	{:else if activeTab === 'tree'}
		<section class="bg-white rounded-2xl shadow-xl border border-sky-100 overflow-hidden">
			<div class="bg-gradient-to-r from-sky-500 to-blue-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:file-tree-outline" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">XML Tree View</h2>
				</div>
				<button
					onclick={runTree}
					class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
				>
					Build Tree
				</button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<div class="block text-sm font-medium text-gray-700 mb-1">XML Input</div>
					<MonacoField bind:value={treeInput} language="xml" height="14rem" id="tree-xml-input" ariaLabel="XML Input" />
				</div>
				<div>
					<div class="flex items-center justify-between mb-1">
						<div class="block text-sm font-medium text-gray-700">Structure</div>
						{#if treeSelection}
							<span class="text-xs text-sky-600 font-mono">{treeSelection}</span>
						{/if}
					</div>
					<XmlTree tree={treeNodes} onselect={(p) => (treeSelection = p)} />
				</div>
			</div>
		</section>
	<!-- Escape -->
	{:else}
		<section class="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
			<div class="bg-gradient-to-r from-amber-500 to-yellow-500 p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Icon icon="mdi:code-tags" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Escape / Unescape XML Entities</h2>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => { escapeMode = 'escape'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {escapeMode === 'escape'
							? 'bg-white text-amber-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						Escape
					</button>
					<button
						onclick={() => { escapeMode = 'unescape'; }}
						class="rounded-lg px-4 py-2 text-sm font-semibold {escapeMode === 'unescape'
							? 'bg-white text-amber-600 shadow-md'
							: 'bg-white/20 text-white hover:bg-white/30'}"
					>
						Unescape
					</button>
				</div>
			</div>
			<div class="p-6 space-y-4">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<label for="escape-input" class="block text-sm font-medium text-gray-700 mb-1">{escapeMode === 'escape' ? 'Plain Text Input' : 'Escaped XML Input'}</label>
						<textarea
							id="escape-input"
							bind:value={escapeInput}
							placeholder={escapeMode === 'escape' ? 'Enter text with <, >, &, \", \'...' : 'Enter escaped entities (e.g., &lt;tag&gt;)...'}
							class="w-full h-72 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none"
						></textarea>
					</div>
					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="escape-output" class="block text-sm font-medium text-gray-700">Output</label>
							<button onclick={copyOut} class="text-xs text-amber-600 hover:text-amber-700 font-medium">Copy</button>
						</div>
						<textarea
							id="escape-output"
							readonly
							bind:value={output}
							placeholder="Converted output..."
							class="w-full h-72 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:outline-none"
						></textarea>
					</div>
				</div>
				<div class="flex justify-center">
					<button onclick={runEscape} class="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600">
						{escapeMode === 'escape' ? 'Escape' : 'Unescape'}
					</button>
				</div>
			</div>
		</section>
	{/if}

	{#if success}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
			<Icon icon="mdi:check-circle" class="h-5 w-5" />
			{success}
		</div>
	{/if}
	{#if error}
		<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
			<Icon icon="mdi:alert-circle" class="h-5 w-5" />
			{error}
		</div>
	{/if}
</div>
