<script>
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import {
		parseAbcsSchema,
		buildSchemaTree,
		parseAbcsBinary,
		parseAbcsSegments,
		flattenWithSchema,
		hexToBytes,
		base64ToBytes
	} from '#lib/plugin/abcs/abcsParser.js';

	// Form state
	let schemaFile = null;
	let schemaText = '';
	let rootElement = ''; // default empty; auto-populated from the schema's DFDL roots
	let availableRoots = []; // top-level elements detected in the loaded schema
	let schemaNotice = ''; // info message about stored/uploaded schema
	let binaryFile = null;
	let binaryFileName = '';
	let binaryFileSize = 0;
	let inputMode = 'file'; // 'file' | 'hex' | 'base64'
	let hexInput = '';
	let base64Input = '';
	let defaultEncoding = 'AUTO'; // 'AUTO' auto-detects EBCDIC vs ASCII from the bytes
	let byteOrder = 'bigEndian';
	let stripPad = true;
	let showDebug = true;

	// Result state
	let results = null;
	let loading = false;
	let error = '';
	let flatFields = [];

	// Stored schema files (localStorage)
	let storedFiles = [];
	let selectedStoredFile = '';

	onMount(() => {
		loadStoredFiles();
	});

	function loadStoredFiles() {
		const stored = localStorage.getItem('abcs-files');
		if (stored) {
			try {
				storedFiles = JSON.parse(stored);
			} catch (e) {
				storedFiles = [];
			}
		}
	}

	function saveStoredFiles() {
		localStorage.setItem('abcs-files', JSON.stringify(storedFiles));
	}

	async function storeFile(file) {
		const fileContent = await file.text();
		const fileInfo = {
			name: file.name,
			content: fileContent,
			size: file.size,
			lastModified: file.lastModified,
			uploadedAt: new Date().toISOString()
		};
		// Only add if not already present; never overwrite an existing stored file
		if (!storedFiles.some(f => f.name === file.name)) {
			storedFiles.push(fileInfo);
			saveStoredFiles();
		}
		return fileInfo;
	}

	// Extract available root elements (top-level xs:element) from the schema
	function updateAvailableRoots(content) {
		try {
			const schema = parseAbcsSchema(content);
			availableRoots = Object.keys(schema.rootTypes);
		} catch (e) {
			availableRoots = [];
		}
	}

	// Load schema content (from a stored file or a fresh upload) and populate roots
	function loadSchemaContent(content, name) {
		const blob = new Blob([content], { type: 'application/xml' });
		schemaFile = new File([blob], name, { type: 'application/xml' });
		schemaText = content;
		selectedStoredFile = name;
		updateAvailableRoots(content);
		rootElement = ''; // default empty; user picks from the auto-populated dropdown
	}

	function selectStoredFile(fileName) {
		const file = storedFiles.find(f => f.name === fileName);
		if (file) {
			loadSchemaContent(file.content, file.name);
			error = '';
		}
	}

	function deleteStoredFile(fileName) {
		storedFiles = storedFiles.filter(f => f.name !== fileName);
		saveStoredFiles();
		if (selectedStoredFile === fileName) {
			selectedStoredFile = '';
			schemaFile = null;
			schemaText = '';
			availableRoots = [];
			rootElement = '';
			schemaNotice = '';
		}
	}

	async function handleSchemaUpload(event) {
		const file = event.target.files[0];
		if (!file || !(file.name.endsWith('.xml') || file.name.endsWith('.xsd'))) {
			error = 'Please upload a valid XML/XSD DFDL schema file';
			return;
		}

		const existing = storedFiles.find(f => f.name === file.name);
		if (existing) {
			// File already stored: do not re-upload, just load the stored version
			loadSchemaContent(existing.content, existing.name);
			schemaNotice = `"${file.name}" already exists in storage. Loaded the stored version — pick it from the dropdown.`;
			error = '';
		} else {
			const info = await storeFile(file);
			loadSchemaContent(info.content, info.name);
			schemaNotice = `"${file.name}" stored locally.`;
			error = '';
		}

		// Reset the input so the same file can be chosen again later
		event.target.value = '';
	}

	function handleBinaryUpload(event) {
		const file = event.target.files[0];
		if (file) {
			binaryFile = file;
			binaryFileName = file.name;
			binaryFileSize = file.size;
			error = '';
		}
	}

	// Convert binary file to Uint8Array
	async function readBinaryFile(file) {
		const buffer = await file.arrayBuffer();
		return new Uint8Array(buffer);
	}

	// Resolve the input bytes based on the selected input mode
	async function resolveInputBytes() {
		if (inputMode === 'file') {
			if (!binaryFile) {
				throw new Error('Please upload a binary file (.bin) or switch to Hex/Base64 input');
			}
			return await readBinaryFile(binaryFile);
		}
		if (inputMode === 'hex') {
			const clean = hexInput.trim();
			if (!clean) throw new Error('Please enter hex data');
			return hexToBytes(clean);
		}
		if (inputMode === 'base64') {
			const clean = base64Input.trim();
			if (!clean) throw new Error('Please enter base64 data');
			return base64ToBytes(clean);
		}
		throw new Error('Unknown input mode');
	}

	async function processParsing() {
		if (!schemaText.trim()) {
			error = 'Please upload a DFDL/XSD schema file';
			return;
		}

		if (!rootElement.trim()) {
			error = 'Please select a root element from the schema';
			return;
		}

		loading = true;
		error = '';
		results = null;
		flatFields = [];

		try {
			// 1. Parse the schema
			const schema = parseAbcsSchema(schemaText);

			// 2. Resolve binary input
			const bytes = await resolveInputBytes();

			const isAllSegments = rootElement.trim() === '__ALL__';

			if (isAllSegments) {
				// Parse every segment found in the buffer (split by initiators)
				const segResult = parseAbcsSegments(schema, bytes, {
					defaultEncoding: defaultEncoding,
					defaultByteOrder: byteOrder,
					stripPad: stripPad
				});

				results = {
					mode: 'segments',
					segments: segResult.segments,
					detectedEncoding: segResult.detectedEncoding,
					totalBytes: segResult.totalBytes,
					preamble: segResult.preamble,
					preambleLength: segResult.preambleLength,
					rootElement: rootElement.trim(),
					schemaFields: [],
					encoding: segResult.detectedEncoding,
					byteOrder: byteOrder
				};

				flatFields = segResult.segments.flatMap((s, i) =>
					s.fields.map(f => ({ ...f, path: `[Seg${i + 1}] ${f.path}` }))
				);
			} else {
				// Parse a single segment with the selected root element
				const schemaTree = buildSchemaTree(schema, rootElement.trim());
				const { json, debug, fields } = parseAbcsBinary(schemaTree, bytes, {
					rootName: rootElement.trim(),
					defaultEncoding: defaultEncoding,
					defaultByteOrder: byteOrder,
					stripPad: stripPad
				});

				results = {
					mode: 'single',
					json: json,
					debug: debug,
					rootElement: rootElement.trim(),
					schemaFields: schemaTree.children.map(c => c.name),
					encoding: debug.detectedEncoding,
					byteOrder: byteOrder
				};

				flatFields = fields;
			}
		} catch (err) {
			error = err.message || String(err);
		} finally {
			loading = false;
		}
	}

	function downloadJson() {
		if (!results) return;
		let payload;
		let filename;
		if (results.mode === 'segments') {
			const combined = {
				detectedEncoding: results.detectedEncoding,
				segments: results.segments.map((s, i) => ({
					root: s.rootName,
					initiator: s.initiator,
					offset: s.offset,
					length: s.length,
					...s.json
				}))
			};
			payload = JSON.stringify(combined, null, 2);
			filename = 'abcs-segments.json';
		} else {
			payload = JSON.stringify(results.json, null, 2);
			filename = `${results.rootElement.toLowerCase()}-abcs.json`;
		}
		const blob = new Blob([payload], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadSegmentJson(seg, idx) {
		const blob = new Blob([JSON.stringify(seg.json, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${seg.rootName.toLowerCase()}-abcs-segment${idx + 1}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadDebug() {
		if (!results) return;
		const lines = [];
		lines.push(`=== ABCS Converter Debug ===`);
		lines.push(`Mode              : ${results.mode === 'segments' ? 'All segments' : 'Single'}`);
		lines.push(`Root Element      : ${results.rootElement}`);
		lines.push(`Default Encoding  : ${results.encoding}`);
		lines.push(`Byte Order        : ${results.byteOrder}`);

		if (results.mode === 'segments') {
			lines.push(`Total Bytes       : ${results.totalBytes}`);
			lines.push(`Segments          : ${results.segments.length}`);
			lines.push(`Preamble (${results.preambleLength} bytes):`);
			lines.push(results.preamble);
			lines.push(``);
			results.segments.forEach((s, i) => {
				lines.push(`--- Segment ${i + 1}: ${s.rootName} (${s.initiator} @ offset ${s.offset}, ${s.length} bytes) ---`);
				lines.push(`DECODED VIEW (${s.debug.detectedEncoding}):`);
				lines.push(s.debug.decodedView);
				lines.push(`JSON:`);
				lines.push(JSON.stringify(s.json, null, 2));
			lines.push(`FIELDS:`);
			(s.fields || []).forEach(f =>
				lines.push(`  ${f.path.padEnd(40)} value=${f.value}  xsdLength=${f.xsdLength ?? '—'}  valueLength=${f.valueLength ?? '—'}`)
			);

				lines.push(``);
			});
		} else {
			lines.push(`Total Bytes       : ${results.debug.totalBytes}`);
			lines.push(`Consumed Bytes    : ${results.debug.consumedBytes}`);
			lines.push(``);
			lines.push(`DECODED VIEW (${results.debug.detectedEncoding}):`);
			lines.push(results.debug.decodedView);
			lines.push(``);
			lines.push(`HEX DUMP:`);
			lines.push(results.debug.hexDump);
			lines.push(``);
			lines.push(`EBCDIC VIEW (reference):`);
			lines.push(results.debug.ebcdicView);
			lines.push(``);
			lines.push(`JSON:`);
			lines.push(JSON.stringify(results.json, null, 2));
		lines.push(`FIELDS:`);
		(flatFields || []).forEach(f =>
			lines.push(`  ${f.path.padEnd(40)} value=${f.value}  xsdLength=${f.xsdLength ?? '—'}  valueLength=${f.valueLength ?? '—'}`)
		);

		}

		const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${results.mode === 'segments' ? 'abcs-segments' : results.rootElement.toLowerCase()}-abcs-debug.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function resetForm() {
		schemaFile = null;
		schemaText = '';
		rootElement = '';
		availableRoots = [];
		schemaNotice = '';
		binaryFile = null;
		binaryFileName = '';
		binaryFileSize = 0;
		inputMode = 'file';
		hexInput = '';
		base64Input = '';
		defaultEncoding = 'EBCDIC';
		byteOrder = 'bigEndian';
		stripPad = true;
		showDebug = true;
		results = null;
		error = '';
		flatFields = [];
		selectedStoredFile = '';
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="bg-white shadow-lg border-b border-purple-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-purple-600 transition-all hover:bg-purple-100 hover:scale-110"
						onclick={() => {
							location.href = '/';
						}}
					>
						<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-3">
							<Icon icon="mdi-light:database" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
								ABCS Converter
							</h1>
							<p class="text-gray-600 mt-1">
								Convert ABCS segments (binary) to JSON using a DFDL XSD schema
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

		<!-- Schema & Root Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Schema & Root Element</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<!-- DFDL Schema File Upload -->
				<div>
					<label for="abcs-schema" class="block text-sm font-medium text-gray-700 mb-2">
						DFDL Schema File (.xml/.xsd)
					</label>

					{#if storedFiles.length > 0}
						<div class="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
							<label for="stored-files" class="block text-sm font-medium text-gray-700 mb-2">
								Or select a previously uploaded file:
							</label>
							<div class="flex gap-2">
								<select
									id="stored-files"
									bind:value={selectedStoredFile}
									onchange={() => selectStoredFile(selectedStoredFile)}
									class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
								>
									<option value="">-- Select stored file --</option>
									{#each storedFiles as file}
										<option value={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option>
									{/each}
								</select>
								{#if selectedStoredFile}
									<button
										onclick={() => deleteStoredFile(selectedStoredFile)}
										class="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition-all"
										title="Delete stored file"
									>
										Delete
									</button>
								{/if}
							</div>
						</div>
					{/if}

					<input
						type="file"
						id="abcs-schema"
						accept=".xml,.xsd"
						onchange={handleSchemaUpload}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
					/>
					{#if schemaFile}
						<div class="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
								<p class="text-green-700 font-medium">
									Loaded: {schemaFile.name}
									{#if storedFiles.find(f => f.name === schemaFile.name)}
										<span class="text-green-600 text-xs">(stored locally)</span>
									{/if}
								</p>
							</div>
						</div>
					{/if}

					{#if schemaNotice}
						<div class="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:information" class="h-5 w-5 text-blue-600 shrink-0" />
								<p class="text-blue-700 text-sm font-medium">{schemaNotice}</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Root Element -->
				<div>
					<label for="root-element" class="block text-sm font-medium text-gray-700 mb-2">
						Root Element
					</label>
					<select
						id="root-element"
						bind:value={rootElement}
						disabled={availableRoots.length === 0}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
					>
						<option value="">-- Select root element --</option>
						<option value="__ALL__">All segments (auto-detect)</option>
						{#each availableRoots as root}
							<option value={root}>{root}</option>
						{/each}
					</select>
					<p class="mt-2 text-xs text-gray-500">
						{#if availableRoots.length > 0}
							Auto-detected from the loaded schema. Equivalent to daffodil's
							<code class="font-mono bg-gray-100 px-1 rounded">--root</code> option.
						{:else}
							Upload a schema file to auto-populate the available root elements (e.g. RMQK1).
						{/if}
					</p>
				</div>
			</div>
		</section>


		<!-- Binary Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:edit" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Binary Segment Input</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<!-- Input mode selector -->
				<div>
					<div class="block text-sm font-medium text-gray-700 mb-3">Input Source</div>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="file"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:file" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Binary File (.bin)</span>
							</div>
						</label>
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="hex"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi:hexagon-multiple-outline" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Hex String</span>
							</div>
						</label>
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="base64"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:lock-open" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Base64 String</span>
							</div>
						</label>
					</div>
				</div>

				<!-- Binary file upload -->
				{#if inputMode === 'file'}
					<div>
						<label for="abcs-binary" class="block text-sm font-medium text-gray-700 mb-2">
							Binary Segment File (.bin)
						</label>
						<input
							type="file"
							id="abcs-binary"
							onchange={handleBinaryUpload}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
						/>
						{#if binaryFile}
							<div class="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
									<p class="text-green-700 font-medium">
										Loaded: {binaryFileName} ({(binaryFileSize / 1024).toFixed(1)} KB)
									</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Hex input -->
				{#if inputMode === 'hex'}
					<div>
						<label for="hex-input" class="block text-sm font-medium text-gray-700 mb-2">
							Hex String (e.g. F1F2F3F4...)
						</label>
						<textarea
							id="hex-input"
							bind:value={hexInput}
							placeholder="Enter hex encoded binary data..."
							class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
						></textarea>
					</div>
				{/if}

				<!-- Base64 input -->
				{#if inputMode === 'base64'}
					<div>
						<label for="base64-input" class="block text-sm font-medium text-gray-700 mb-2">
							Base64 String (or X'...' hex wrapper)
						</label>
						<textarea
							id="base64-input"
							bind:value={base64Input}
							placeholder="Enter base64 encoded data, or X'C1C2C3...'"
							class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
						></textarea>
					</div>
				{/if}
			</div>
		</section>


		<!-- Options Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Parsing Options</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="default-encoding" class="block text-sm font-medium text-gray-700 mb-2">
							Default Encoding
						</label>
						<select
							id="default-encoding"
							bind:value={defaultEncoding}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
						>
							<option value="AUTO">Auto-Detect (EBCDIC vs ASCII)</option>
							<option value="EBCDIC">EBCDIC (CP037)</option>
							<option value="ASCII">ASCII</option>
							<option value="UTF-8">UTF-8</option>
							<option value="ISO-8859-1">ISO-8859-1</option>
						</select>
						<p class="mt-2 text-xs text-gray-500">
							Auto-Detect inspects the bytes and picks EBCDIC or ASCII automatically.
							Otherwise used when the schema does not specify <code class="font-mono bg-gray-100 px-1 rounded">dfdl:encoding</code>.
						</p>
					</div>

					<div>
						<label for="byte-order" class="block text-sm font-medium text-gray-700 mb-2">
							Default Byte Order
						</label>
						<select
							id="byte-order"
							bind:value={byteOrder}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
						>
							<option value="bigEndian">Big Endian (Network)</option>
							<option value="littleEndian">Little Endian</option>
						</select>
						<p class="mt-2 text-xs text-gray-500">
							Used for binary numeric fields when <code class="font-mono bg-gray-100 px-1 rounded">dfdl:byteOrder</code> is not set.
						</p>
					</div>

					<div class="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="strip-pad"
							bind:checked={stripPad}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="strip-pad" class="ml-3 block text-sm text-gray-700 font-medium">
							Strip trailing NULs and whitespace from values
						</label>
					</div>

					<div class="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="show-debug"
							bind:checked={showDebug}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="show-debug" class="ml-3 block text-sm text-gray-700 font-medium">
							Show debug information (hex dump & EBCDIC view)
						</label>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						onclick={processParsing}
						disabled={loading}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:play" class="h-4 w-4" />
							<span>{#if loading}Converting...{:else}Convert Segment to JSON{/if}</span>
						</span>
					</button>

					<button
						onclick={resetForm}
						class="group relative overflow-hidden rounded-lg bg-gray-500 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-600 hover:shadow-lg"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:refresh" class="h-4 w-4" />
							<span>Reset</span>
						</span>
					</button>
				</div>
			</div>
		</section>


		<!-- Error Display -->
		{#if error}
			<section class="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl shadow-xl border border-red-100 overflow-hidden">
				<div class="bg-gradient-to-r from-red-500 to-rose-500 p-4">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:alert" class="h-5 w-5 text-white" />
						<h3 class="text-lg font-bold text-white">Error</h3>
					</div>
				</div>
				<div class="p-6">
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-red-100 p-2">
							<Icon icon="mdi-light:alert-circle" class="h-6 w-6 text-red-600" />
						</div>
						<p class="text-red-800 font-medium">{error}</p>
					</div>
				</div>
			</section>
		{/if}

		<!-- Results Section -->
		{#if results}
			<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
				<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Conversion Results</h2>
						</div>
						<div class="flex gap-2">
							<button
								onclick={downloadJson}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:download" class="h-4 w-4" />
									<span>Download JSON</span>
								</span>
							</button>
							<button
								onclick={downloadDebug}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:download" class="h-4 w-4" />
									<span>Download Debug</span>
								</span>
							</button>
						</div>
					</div>
				</div>
				<div class="p-6 space-y-6">
					<!-- Parsing Info -->
					<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
							<Icon icon="mdi-light:information" class="h-5 w-5 text-indigo-600" />
							<span>Conversion Information</span>
						</h3>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Root Element:</span>
								<div class="text-gray-900 mt-1 font-mono">
									{#if results.mode === 'segments'}All segments{:else}{results.rootElement}{/if}
								</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Total Bytes:</span>
								<div class="text-gray-900 mt-1">{results.mode === 'segments' ? results.totalBytes : results.debug.totalBytes}</div>
							</div>
							{#if results.mode === 'segments'}
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<span class="font-medium text-indigo-700">Segments:</span>
									<div class="text-gray-900 mt-1">{results.segments.length}</div>
								</div>
							{:else}
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<span class="font-medium text-indigo-700">Consumed Bytes:</span>
									<div class="text-gray-900 mt-1">{results.debug.consumedBytes}</div>
								</div>
							{/if}
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Fields Parsed:</span>
								<div class="text-gray-900 mt-1">{flatFields.length}</div>
							</div>
						</div>
					<p class="text-xs text-indigo-700/80 mt-3 flex items-center gap-1.5">
						<Icon icon="mdi-light:information" class="h-4 w-4 shrink-0" />
						<span>
							DFDL/Daffodil-compatible parsing: honors <code class="font-mono bg-white px-1 rounded">dfdl:lengthUnits</code> (bytes/characters/bits),
							field-level <code class="font-mono bg-white px-1 rounded">initiator</code>/<code class="font-mono bg-white px-1 rounded">terminator</code> (in the field's encoding),
							<code class="font-mono bg-white px-1 rounded">trimKind</code>/<code class="font-mono bg-white px-1 rounded">trimValue</code>,
							IBM packed-decimal (COMP-3) fields, hex-binary filler fields, and
							<code class="font-mono bg-white px-1 rounded">xsd:choice</code> (first matching branch, like Daffodil).
						</span>
					</p>

					</div>


					<!-- JSON Output -->
					{#if results.mode === 'segments'}
						{#if results.segments.length === 0}
							<div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:alert" class="h-5 w-5 text-yellow-600 shrink-0" />
									<p class="text-yellow-800 text-sm font-medium">
										No segments were detected. Check that the schema root elements have initiators (e.g. <code class="font-mono bg-white px-1 rounded">..K1</code>), or pick a single root element.
									</p>
								</div>
							</div>
						{/if}
						{#each results.segments as seg, idx}
							<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
								<div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center justify-between">
									<div class="flex items-center space-x-3">
										<Icon icon="mdi:code-json" class="h-5 w-5 text-indigo-600 shrink-0" />
										<div>
											<div class="font-semibold text-gray-800">
												Segment {idx + 1}: <span class="font-mono text-indigo-700">{seg.rootName}</span>
											</div>
											<div class="text-xs text-gray-500 font-mono">
												{seg.initiator} @ byte {seg.offset} · {seg.length} bytes
											</div>
										</div>
									</div>
									<button
										onclick={() => downloadSegmentJson(seg, idx)}
										class="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-600"
									>
										Download
									</button>
								</div>
								<pre class="text-xs bg-gray-50 p-4 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre">{JSON.stringify(seg.json, null, 2)}</pre>
							</div>
						{/each}
					{:else}
						<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
							<h3 class="text-lg font-semibold text-gray-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center space-x-2">
								<Icon icon="mdi:code-json" class="h-5 w-5 text-indigo-600" />
								<span>JSON Infoset</span>
							</h3>
							<pre class="text-xs bg-gray-50 p-4 rounded border-b border-gray-200 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre">{JSON.stringify(results.json, null, 2)}</pre>
						</div>
					{/if}

					<!-- Flattened Fields -->
					<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
						<h3 class="text-lg font-semibold text-gray-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center space-x-2">
							<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
							<span>Parsed Fields</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Field Path</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Value</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Length (XSD)</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Value Length</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each flatFields as field}
										<tr class="hover:bg-indigo-50 transition-colors">
											<td class="px-4 py-3 text-sm font-mono text-gray-700">{field.path}</td>
											<td class="px-4 py-3 text-sm text-indigo-600 font-mono font-semibold">{field.value}</td>
											<td class="px-4 py-3 text-sm font-mono text-gray-700">
												{#if field.xsdLength != null}{field.xsdLength}{:else}<span class="text-gray-400">—</span>{/if}
											</td>
											<td class="px-4 py-3 text-sm font-mono text-gray-700">
												{#if field.valueLength != null}{field.valueLength}{:else}<span class="text-gray-400">—</span>{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Debug Information -->
					{#if showDebug}
						<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
								<Icon icon="mdi-light:bug" class="h-5 w-5 text-indigo-600" />
								<span>Debug Information</span>
							</h3>
							<div class="space-y-4">
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<h4 class="font-medium text-gray-700 mb-2">
										Detected Encoding: <span class="font-mono text-indigo-600">{results.mode === 'segments' ? results.detectedEncoding : results.debug.detectedEncoding}</span>
									</h4>
								</div>
								{#if results.mode === 'segments'}
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">
											Preamble (before first segment, {results.preambleLength} bytes):
										</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.preamble}</pre>
									</div>
									{#each results.segments as seg, idx}
										<div class="bg-white rounded-lg p-3 border border-indigo-100">
											<h4 class="font-medium text-gray-700 mb-2">
												Segment {idx + 1}: <span class="font-mono text-indigo-600">{seg.rootName}</span>
												<span class="text-gray-500 font-mono text-xs">({seg.initiator} @ byte {seg.offset}, {seg.length} bytes)</span>
											</h4>
											<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{seg.debug.decodedView}</pre>
										</div>
									{/each}
								{:else}
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">Decoded View:</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.decodedView}</pre>
									</div>
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">Hex Dump:</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.hexDump}</pre>
									</div>
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">EBCDIC View (reference):</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.ebcdicView}</pre>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</main>

