<script>
	import Icon from '@iconify/svelte';
	import FieldEditor from '#lib/components/iso8583/FieldEditor.svelte';
	import { EDITABLE_FIELDS, validateField } from '#lib/plugin/iso8583/fields';
	import { bytesToHex, bytesToBase64, bytesToAscii, bytesToEbcdic } from '#lib/plugin/iso8583/codec';
	import { decodeLegacy, buildLegacy } from '#lib/plugin/iso8583/legacy';
	import { simulateResponse } from '#lib/plugin/iso8583/simulator';
	import { compareMessages } from '#lib/plugin/iso8583/compare';

	let activeTab = $state('decode');

	const tabs = [
		{ id: 'decode', label: 'Decode', icon: 'mdi:file-search-outline' },
		{ id: 'build', label: 'Build', icon: 'mdi:hammer-wrench' },
		{ id: 'simulate', label: 'Simulate', icon: 'mdi:swap-horizontal-bold' },
		{ id: 'compare', label: 'Compare', icon: 'mdi:compare' }
	];

	/* ============ DECODE ============ */
	let decodeInput = $state('');
	let decodeError = $state('');
	let decodeResult = $state(null);

	function doDecode(raw = decodeInput) {
		try {
			const { msg, bytes, inputEncoding } = decodeLegacy(raw);
			decodeResult = {
				norm: {
					encoding: inputEncoding,
					hex: bytesToHex(bytes),
					ascii: bytesToAscii(bytes),
					ebcdic: bytesToEbcdic(bytes)
				},
				msg
			};
			decodeError = '';
		} catch (e) {
			decodeResult = null;
			decodeError = e.message;
		}
	}

	/* ============ BUILD ============ */
	let buildMti = $state('0200');
	let buildValues = $state({});
	let buildResult = $state(null);
	let buildOutFormat = $state('hybrid');

	function doBuild() {
		const inputs = Object.entries(buildValues)
			.filter(([, v]) => v !== '' && v != null)
			.map(([index, value]) => ({ index: parseInt(index, 10), value }));
		buildResult = buildLegacy(buildMti, inputs);
	}

	function clearBuild() {
		buildMti = '0200';
		buildValues = {};
		buildResult = null;
	}

	function loadBuildIntoDecode() {
		if (!buildResult) return;
		decodeInput = buildResult.hybrid;
		activeTab = 'decode';
		doDecode(buildResult.hybrid);
	}

	/* ============ SIMULATE ============ */
	let simInput = $state('');
	let simError = $state('');
	let simState = $state(null);

	function doSimulate() {
		try {
			const { msg: request, bytes } = decodeLegacy(simInput);
			const resp = simulateResponse(request);
			const built = buildLegacy(resp.mti, resp.fields);
			simState = { request, response: resp, built, norm: { encoding: 'hybrid', hex: bytesToHex(bytes), ascii: bytesToAscii(bytes), ebcdic: bytesToEbcdic(bytes) } };
			simError = '';
		} catch (e) {
			simState = null;
			simError = e.message;
		}
	}

	function loadSimIntoBuild() {
		if (!simState) return;
		buildMti = simState.response.mti;
		buildValues = Object.fromEntries(simState.response.fields.map((f) => [f.index, f.value]));
		activeTab = 'build';
	}

	function loadSimIntoDecode() {
		if (!simState) return;
		decodeInput = simState.built.hybrid;
		activeTab = 'decode';
		doDecode(simState.built.hybrid);
	}

	/* ============ COMPARE ============ */
	let cmpA = $state('');
	let cmpB = $state('');
	let cmpError = $state('');
	let cmpResult = $state(null);

	function doCompare() {
		try {
			const a = decodeLegacy(cmpA).msg;
			const b = decodeLegacy(cmpB).msg;
			cmpResult = compareMessages(a, b);
			cmpError = '';
		} catch (e) {
			cmpResult = null;
			cmpError = e.message;
		}
	}

	function copyText(text) {
		if (text) navigator.clipboard.writeText(text);
	}

	function sampleMessage() {
		// Hybrid/display format (previous parser): MTI text + hex bitmap + ASCII data elements
		decodeInput =
			'0200' +
			'7220000000800000' +
			'16' + '1234567890123456' +
			'000000' +
			'000000000100' +
			'0712301020' +
			'000006' +
			'12345678';
		doDecode();
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header -->
	<header class="bg-white shadow-lg border-b border-teal-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-teal-600 transition-all hover:bg-teal-100 hover:scale-110"
						onclick={() => (location.href = '/')}
					>
						<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 p-3">
							<Icon icon="mdi:credit-card-outline" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
								Message ISO 8583 Studio
							</h1>
							<p class="text-gray-600 mt-1">
								Build, decode, validate, and simulate ISO 8583 financial transaction messages
							</p>
						</div>
					</div>
				</div>
				<button
					onclick={sampleMessage}
					class="hidden sm:flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
				>
					<Icon icon="mdi:flask-outline" class="h-4 w-4" />
					Load Sample
				</button>
			</div>
		</div>
	</header>

	<!-- Tab Navigation -->
	<nav class="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-teal-100 shadow-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex gap-1 overflow-x-auto py-2">
				{#each tabs as tab}
					<button
						onclick={() => (activeTab = tab.id)}
						class="flex items-center gap-2 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all {activeTab === tab.id
							? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
							: 'text-gray-600 hover:bg-teal-50'}"
					>
						<Icon icon={tab.icon} class="h-4 w-4" />
						{tab.label}
					</button>
				{/each}
			</div>
		</div>
	</nav>

	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
		{#if activeTab === 'decode'}
			{@render decodeSnippet()}
		{:else if activeTab === 'build'}
			{@render buildSnippet()}
		{:else if activeTab === 'simulate'}
			{@render simulateSnippet()}
		{:else}
			{@render compareSnippet()}
		{/if}
	</div>
</main>

{#snippet decodeSnippet()}
	<!-- Input -->
	<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
		<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5">
			<div class="flex items-center gap-3">
				<Icon icon="mdi:file-search-outline" class="h-6 w-6 text-white" />
				<div>
					<h2 class="text-xl font-bold text-white">Decode ISO 8583 Message</h2>
					<p class="text-teal-50 text-sm">Input auto-detects Base64 / Hex / ASCII and decodes it first</p>
				</div>
			</div>
		</div>
		<div class="p-6 space-y-4">
			<textarea
				bind:value={decodeInput}
				placeholder="Paste ISO 8583 message (Base64, Hex, or ASCII text)…"
				class="w-full h-28 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
			></textarea>
			<div class="flex flex-wrap gap-3">
				<button
					onclick={() => doDecode()}
					class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
				>
					<Icon icon="mdi:play" class="h-4 w-4" />
					Decode
				</button>
				<button
					onclick={() => { decodeInput = ''; decodeResult = null; decodeError = ''; }}
					class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
				>
					Clear
				</button>
			</div>

			{#if decodeError}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 flex items-center gap-2">
					<Icon icon="mdi:alert-circle" class="h-5 w-5" />
					{decodeError}
				</div>
			{/if}
		</div>
	</section>

	{#if decodeResult}
		{@const { norm, msg } = decodeResult}
		<!-- Detected encoding -->
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 p-6">
			<h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
				<Icon icon="mdi:auto-fix" class="h-5 w-5 text-teal-500" />
				Input &amp; Encoding
			</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div class="rounded-xl bg-teal-50 p-4">
					<p class="text-xs font-semibold text-teal-600 uppercase">Detected Input</p>
					<p class="text-lg font-bold text-teal-700 mt-1">{norm.encoding}</p>
				</div>
				<div class="rounded-xl bg-cyan-50 p-4">
					<p class="text-xs font-semibold text-cyan-600 uppercase">Character Set</p>
					<p class="text-lg font-bold text-cyan-700 mt-1 uppercase">{msg.encoding}</p>
				</div>
				<div class="rounded-xl bg-purple-50 p-4">
					<p class="text-xs font-semibold text-purple-600 uppercase">Bitmap</p>
					<p class="text-lg font-bold text-purple-700 mt-1">
						{msg.hasTertiary ? '3 (Tertiary)' : msg.hasSecondary ? '2 (Secondary)' : '1 (Primary)'}
					</p>
				</div>
				<div class="rounded-xl bg-indigo-50 p-4">
					<p class="text-xs font-semibold text-indigo-600 uppercase">Data Elements</p>
					<p class="text-lg font-bold text-indigo-700 mt-1">{msg.fields.length}</p>
				</div>
			</div>
			<div class="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3 font-mono text-xs text-gray-600 break-all">
				<span class="text-gray-400">Decoded bytes (hex): </span>{norm.hex}
			</div>
		</section>

		<!-- MTI -->
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center gap-2">
				<Icon icon="mdi:tag-outline" class="h-5 w-5 text-teal-600" />
				<h3 class="text-lg font-bold text-teal-800">MTI Decoder</h3>
			</div>
			<div class="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
				<div class="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
					<p class="text-xs font-semibold text-teal-600 uppercase">MTI</p>
					<p class="text-2xl font-mono font-bold text-teal-700 mt-1">{msg.mti}</p>
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase">Version</p>
					<p class="font-semibold text-gray-800 mt-1">{msg.mtiInfo.version}</p>
					<p class="font-mono text-xs text-gray-400">{msg.mtiInfo.versionID}</p>
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase">Class</p>
					<p class="font-semibold text-gray-800 mt-1">{msg.mtiInfo.messageClass}</p>
					<p class="font-mono text-xs text-gray-400">{msg.mtiInfo.classID}</p>
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase">Function</p>
					<p class="font-semibold text-gray-800 mt-1">{msg.mtiInfo.messageFunction}</p>
					<p class="font-mono text-xs text-gray-400">{msg.mtiInfo.functionID}</p>
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase">Origin</p>
					<p class="font-semibold text-gray-800 mt-1">{msg.mtiInfo.messageOrigin}</p>
					<p class="font-mono text-xs text-gray-400">{msg.mtiInfo.originID}</p>
				</div>
				<div class="rounded-xl border border-gray-100 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase">Length</p>
					<p class="font-semibold text-gray-800 mt-1">{msg.messageLength} bytes</p>
					<p class="font-mono text-xs text-gray-400">DE offset {msg.dataElementOffset}</p>
				</div>
			</div>
		</section>

		<!-- Bitmap -->
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center gap-2">
				<Icon icon="mdi:table-large" class="h-5 w-5 text-teal-600" />
				<h3 class="text-lg font-bold text-teal-800">Bitmap Decoder</h3>
			</div>
			<div class="p-6 space-y-4">
				<div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase mb-1">Bitmap (hex)</p>
					<p class="font-mono text-sm text-teal-700 break-all">{msg.bitmapHex}</p>
				</div>
				<div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase mb-1">Bitmap (bits)</p>
					<p class="font-mono text-[11px] text-gray-600 break-all leading-relaxed">{msg.bitmapBits}</p>
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each msg.fieldIndices as idx}
						<span class="rounded-md bg-teal-100 text-teal-700 px-2 py-1 font-mono text-xs font-semibold">DE {idx}</span>
					{/each}
				</div>
				{#if msg.errors.length}
					<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
						{#each msg.errors as err}<p>⚠ {err}</p>{/each}
					</div>
				{/if}
				{#if msg.trailing}
					<div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 font-mono">
						Trailing bytes: {msg.trailing}
					</div>
				{/if}
			</div>
		</section>

		<!-- Data Elements -->
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center gap-2">
				<Icon icon="mdi:format-list-bulleted" class="h-5 w-5 text-teal-600" />
				<h3 class="text-lg font-bold text-teal-800">Data Elements (DE 2–128)</h3>
			</div>
			<div class="p-6 overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-gradient-to-r from-teal-50 to-cyan-50 text-left">
							<th class="px-3 py-2 font-semibold text-teal-700">DE</th>
							<th class="px-3 py-2 font-semibold text-teal-700">Type</th>
							<th class="px-3 py-2 font-semibold text-teal-700">Length</th>
							<th class="px-3 py-2 font-semibold text-teal-700">Name</th>
							<th class="px-3 py-2 font-semibold text-teal-700">Value</th>
							<th class="px-3 py-2 font-semibold text-teal-700">Raw</th>
						</tr>
					</thead>
					<tbody>
						{#each msg.fields as f (f.index)}
							{@const issues = validateField(f.meta, f.value)}
							<tr class="border-t border-gray-100 hover:bg-teal-50/50">
								<td class="px-3 py-2 font-mono font-semibold text-teal-600">{f.index}</td>
								<td class="px-3 py-2 font-mono text-xs text-gray-600">{f.meta.type}{f.meta.lengthType !== 'fixed' ? `/${f.meta.lengthType}` : ''}</td>
								<td class="px-3 py-2 font-mono text-xs text-gray-500">{f.byteLength}</td>
								<td class="px-3 py-2 text-gray-700">{f.meta.name}</td>
								<td class="px-3 py-2 font-mono text-xs text-teal-600 break-all max-w-64">{f.value}</td>
								<td class="px-3 py-2 font-mono text-[10px] text-gray-400 break-all max-w-32">{f.rawHex}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/snippet}

{#snippet buildSnippet()}
	<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
		<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5 flex items-center gap-3">
			<Icon icon="mdi:hammer-wrench" class="h-6 w-6 text-white" />
			<div>
				<h2 class="text-xl font-bold text-white">Build / Pack ISO 8583 Message</h2>
				<p class="text-teal-50 text-sm">Set MTI, edit DE 2–128 fields, then pack into wire format</p>
			</div>
		</div>
		<div class="p-6 space-y-5">
			<!-- MTI + Encoding -->
			<div class="flex flex-col sm:flex-row gap-4 sm:items-end">
				<div class="w-40">
					<label for="build-mti" class="block text-sm font-medium text-gray-700 mb-1">MTI</label>
					<input
						type="text"
						id="build-mti"
						bind:value={buildMti}
						maxlength="4"
						placeholder="0200"
						class="w-full rounded-xl border-2 border-gray-200 px-3 py-2 font-mono text-lg text-center focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none"
					/>
				</div>
				<div class="flex gap-2">
					<button
						onclick={doBuild}
						class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
					>
						<Icon icon="mdi:package-variant-closed" class="h-4 w-4" />
						Build Message
					</button>
					<button
						onclick={clearBuild}
						class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
					>
						Reset
					</button>
				</div>
			</div>

			<!-- Field Editor -->
			<FieldEditor fields={EDITABLE_FIELDS} values={buildValues} onchange={() => {}} />
		</div>
	</section>

	{#if buildResult}
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Icon icon="mdi:package-variant-closed" class="h-5 w-5 text-teal-600" />
					<h3 class="text-lg font-bold text-teal-800">Packed Message</h3>
				</div>
				<div class="flex items-center gap-2">
					<select
						bind:value={buildOutFormat}
						class="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium focus:outline-none"
					>
						<option value="hybrid">Hybrid (Parser)</option>
						<option value="hex">Hex (wire)</option>
						<option value="ascii">ASCII</option>
						<option value="ebcdic">EBCDIC</option>
						<option value="base64">Base64</option>
					</select>
					<button onclick={() => copyText(buildOutFormat === 'hybrid' ? buildResult.hybrid : buildOutFormat === 'hex' ? buildResult.hex : buildOutFormat === 'ascii' ? buildResult.ascii : buildOutFormat === 'ebcdic' ? buildResult.ebcdic : bytesToBase64(buildResult.bytes))} class="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-teal-700 transition-colors">Copy</button>
					<button onclick={loadBuildIntoDecode} class="rounded-lg border border-teal-200 bg-teal-50 text-teal-700 px-3 py-1.5 text-xs font-semibold hover:bg-teal-100 transition-colors">Load into Decode</button>
				</div>
			</div>
			<div class="p-6 space-y-4">
				<div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase mb-1">{buildOutFormat === 'hybrid' ? 'Hybrid (Previous Parser)' : buildOutFormat.toUpperCase() + ' Output'} ({buildResult.bytes.length} bytes)</p>
					<textarea
						readonly
						value={buildOutFormat === 'hybrid' ? buildResult.hybrid : buildOutFormat === 'hex' ? buildResult.hex : buildOutFormat === 'ascii' ? buildResult.ascii : buildOutFormat === 'ebcdic' ? buildResult.ebcdic : bytesToBase64(buildResult.bytes)}
						class="w-full h-32 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs focus:outline-none"
					></textarea>
				</div>
				{#if buildResult.errors.length}
					<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
						{#each buildResult.errors as err}<p>⚠ {err}</p>{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}
{/snippet}

{#snippet simulateSnippet()}
	<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
		<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5 flex items-center gap-3">
			<Icon icon="mdi:swap-horizontal-bold" class="h-6 w-6 text-white" />
			<div>
				<h2 class="text-xl font-bold text-white">Request / Response Simulator</h2>
				<p class="text-teal-50 text-sm">Decode a request, generate a plausible response, and pack it</p>
			</div>
		</div>
		<div class="p-6 space-y-4">
			<textarea
				bind:value={simInput}
				placeholder="Paste a request message (Base64, Hex, or ASCII)…"
				class="w-full h-28 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
			></textarea>
			<div class="flex gap-3">
				<button
					onclick={doSimulate}
					class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
				>
					<Icon icon="mdi:play" class="h-4 w-4" />
					Simulate Response
				</button>
			</div>
			{#if simError}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 flex items-center gap-2">
					<Icon icon="mdi:alert-circle" class="h-5 w-5" />
					{simError}
				</div>
			{/if}
		</div>
	</section>

	{#if simState}
		{@const req = simState.request}
		{@const resp = simState.response}
		{@const built = simState.built}
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Icon icon="mdi:information-outline" class="h-5 w-5 text-teal-600" />
					<h3 class="text-lg font-bold text-teal-800">Simulation Result</h3>
				</div>
				<div class="flex items-center gap-2">
					<button onclick={loadSimIntoBuild} class="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-teal-700 transition-colors">Load Response into Build</button>
					<button onclick={loadSimIntoDecode} class="rounded-lg border border-teal-200 bg-teal-50 text-teal-700 px-3 py-1.5 text-xs font-semibold hover:bg-teal-100 transition-colors">Decode Response</button>
				</div>
			</div>
			<div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Request summary -->
				<div class="rounded-xl border border-gray-200 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase mb-2">Request</p>
					<p class="text-2xl font-mono font-bold text-gray-800">{req.mti}</p>
					<p class="text-xs text-gray-500 mt-1">{req.mtiInfo.messageClass} · {req.mtiInfo.messageFunction} · {req.mtiInfo.messageOrigin}</p>
					<p class="text-xs text-gray-500">{req.fields.length} data elements · {req.encoding}</p>
				</div>
				<!-- Response summary -->
				<div class="rounded-xl border border-teal-200 bg-teal-50 p-4">
					<p class="text-xs font-semibold text-teal-600 uppercase mb-2">Response</p>
					<p class="text-2xl font-mono font-bold text-teal-700">{resp.mti}</p>
					<p class="text-xs text-teal-600 mt-1">{built.bytes.length} bytes packed</p>
					<p class="text-xs text-teal-600">{resp.fields.length} data elements</p>
				</div>
			</div>
			<div class="px-6 pb-6 space-y-3">
				{#each resp.notes as note}
					<div class="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2 text-sm text-indigo-700">
						ℹ {note}
					</div>
				{/each}
				<div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
					<p class="text-xs font-semibold text-gray-500 uppercase mb-1">Response Hex ({built.bytes.length} bytes)</p>
					<textarea readonly value={built.hex} class="w-full h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs focus:outline-none"></textarea>
				</div>
			</div>
		</section>
	{/if}
{/snippet}

{#snippet compareSnippet()}
	<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
		<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-5 flex items-center gap-3">
			<Icon icon="mdi:compare" class="h-6 w-6 text-white" />
			<div>
				<h2 class="text-xl font-bold text-white">Compare Two Financial Messages</h2>
				<p class="text-teal-50 text-sm">Decode both messages and diff them field by field (DE 2–128)</p>
			</div>
		</div>
		<div class="p-6 space-y-5">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div>
					<label for="compare-message-a" class="block text-sm font-medium text-gray-700 mb-1">Message A</label>
					<textarea
						id="compare-message-a"
						bind:value={cmpA}
						placeholder="Paste message A…"
						class="w-full h-28 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
					></textarea>
				</div>
				<div>
					<label for="compare-message-b" class="block text-sm font-medium text-gray-700 mb-1">Message B</label>
					<textarea
						id="compare-message-b"
						bind:value={cmpB}
						placeholder="Paste message B…"
						class="w-full h-28 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
					></textarea>
				</div>
			</div>
			<div class="flex gap-3">
				<button
					onclick={doCompare}
					class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
				>
					<Icon icon="mdi:compare" class="h-4 w-4" />
					Compare
				</button>
			</div>
			{#if cmpError}
				<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 flex items-center gap-2">
					<Icon icon="mdi:alert-circle" class="h-5 w-5" />
					{cmpError}
				</div>
			{/if}
		</div>
	</section>

	{#if cmpResult}
		{@const r = cmpResult}
		<section class="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Icon icon="mdi:compare" class="h-5 w-5 text-teal-600" />
					<h3 class="text-lg font-bold text-teal-800">Diff Result</h3>
				</div>
				<span class="rounded-full px-3 py-1 text-xs font-bold {r.identical ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
					{r.identical ? 'Identical' : `${r.differentCount} different · ${r.onlyACount} only A · ${r.onlyBCount} only B`}
				</span>
			</div>
			<div class="p-6">
				<div class="grid grid-cols-2 gap-4 mb-4">
					<div class="rounded-xl border border-gray-200 p-3 text-center">
						<p class="text-xs text-gray-500 uppercase">MTI A</p>
						<p class="text-xl font-mono font-bold {r.mtiEqual ? 'text-gray-800' : 'text-rose-600'}">{r.mtiA}</p>
					</div>
					<div class="rounded-xl border border-gray-200 p-3 text-center">
						<p class="text-xs text-gray-500 uppercase">MTI B</p>
						<p class="text-xl font-mono font-bold {r.mtiEqual ? 'text-gray-800' : 'text-rose-600'}">{r.mtiB}</p>
					</div>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-gradient-to-r from-teal-50 to-cyan-50 text-left">
								<th class="px-3 py-2 font-semibold text-teal-700">DE</th>
								<th class="px-3 py-2 font-semibold text-teal-700">Field</th>
								<th class="px-3 py-2 font-semibold text-teal-700">Message A</th>
								<th class="px-3 py-2 font-semibold text-teal-700">Message B</th>
								<th class="px-3 py-2 font-semibold text-teal-700">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each r.rows as row (row.index)}
								<tr class="border-t border-gray-100 {row.present === 'both' && !row.equal ? 'bg-rose-50/60' : 'bg-amber-50/40'}">
									<td class="px-3 py-2 font-mono font-semibold text-teal-600">{row.index}</td>
									<td class="px-3 py-2 text-gray-700">{row.name}</td>
									<td class="px-3 py-2 font-mono text-xs text-gray-800 break-all max-w-56">{#if row.valueA}{row.valueA}{:else}<span class="text-gray-300">—</span>{/if}</td>
									<td class="px-3 py-2 font-mono text-xs text-gray-800 break-all max-w-56">{#if row.valueB}{row.valueB}{:else}<span class="text-gray-300">—</span>{/if}</td>
									<td class="px-3 py-2">
										{#if row.present === 'onlyA'}
											<span class="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Only A</span>
										{:else if row.present === 'onlyB'}
											<span class="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Only B</span>
										{:else if row.equal}
											<span class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Equal</span>
										{:else}
											<span class="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Differs</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	{/if}
{/snippet}


