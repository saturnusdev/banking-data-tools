<script>
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';
	import xml2js from 'xml2js';

	// EBCDIC Hex Table
	const ebcdicTable = {
		'00': '<NUL>', '01': '<SOH>', '02': '<STX>', '03': '<ETX>', '04': '<SEL>', '05': '<HT>', '06': '<RNL>', '07': '<DEL>',
		'08': '<GE>', '09': '<SPS>', '0A': '<RPT>', '0B': '<VT>', '0C': '<FF>', '0D': '\r', '0E': '<SO>', '0F': '<SI>',
		'10': '<DLE>', '11': '<DC1>', '12': '<DC2>', '13': '<DC3>', '14': '<RES/ENP>', '15': '<NL>', '16': '<BS>', '17': '<POC>',
		'18': '<CAN>', '19': '<EM>', '1A': '<UBS>', '1B': '<CU1>', '1C': '<IFS>', '1D': '<IGS>', '1E': '<IRS>', '1F': '<ITB/IUS>',
		'20': '<DS>', '21': '<SOS>', '22': '<FS>', '23': '<WUS>', '24': '<BYP/INP>', '25': '<LF>', '26': '<ETB>', '27': '<ESC>',
		'28': '<SA>', '29': '<SFE>', '2A': '<SM/SW>', '2B': '<CSP>', '2C': '<MFA>', '2D': '<ENQ>', '2E': '<ACK>', '2F': '<BEL>',
		'30': '', '31': '', '32': '<SYN>', '33': '<IR>', '34': '<PP>', '35': '<TRN>', '36': '<NBS>', '37': '<EOT>',
		'38': '<SBS>', '39': '<IT>', '3A': '<RFF>', '3B': '<CU3>', '3C': '<DC4>', '3D': '<NAK>', '3E': '', '3F': '<SUB>',
		'40': ' ', '4A': '[', '4B': '.', '4C': '<', '4D': '(', '4E': '+', '4F': '!', '50': '&',
		'5A': ']', '5B': '$', '5C': '*', '5D': ')', '5E': ';', '5F': '^', '60': '_', '61': '/',
		'6A': '|', '6B': ',', '6C': '%', '6D': '_', '6E': '>', '6F': '?', '79': '`', '7A': ':',
		'7B': '#', '7C': '@', '7D': "'", '7E': '=', '7F': '"',
		'81': 'a', '82': 'b', '83': 'c', '84': 'd', '85': 'e', '86': 'f', '87': 'g', '88': 'h', '89': 'i',
		'91': 'j', '92': 'k', '93': 'l', '94': 'm', '95': 'n', '96': 'o', '97': 'p', '98': 'q', '99': 'r',
		'A1': '~', 'A2': 's', 'A3': 't', 'A4': 'u', 'A5': 'v', 'A6': 'w', 'A7': 'x', 'A8': 'y', 'A9': 'z',
		'C1': 'A', 'C2': 'B', 'C3': 'C', 'C4': 'D', 'C5': 'E', 'C6': 'F', 'C7': 'G', 'C8': 'H', 'C9': 'I',
		'D1': 'J', 'D2': 'K', 'D3': 'L', 'D4': 'M', 'D5': 'N', 'D6': 'O', 'D7': 'P', 'D8': 'Q', 'D9': 'R',
		'E2': 'S', 'E3': 'T', 'E4': 'U', 'E5': 'V', 'E6': 'W', 'E7': 'X', 'E8': 'Y', 'E9': 'Z',
		'F0': '0', 'F1': '1', 'F2': '2', 'F3': '3', 'F4': '4', 'F5': '5', 'F6': '6', 'F7': '7', 'F8': '8', 'F9': '9',
	};

	let base64Input = '';
	let dfdlFile = null;
	let headerLength = 688;
	let stripTrailing = false;
	let results = null;
	let loading = false;
	let error = '';
	let storedFiles = [];
	let selectedStoredFile = '';
	let parseType = 'response'; // 'request' or 'response'

	// Load stored files on component mount
	onMount(() => {
		loadStoredFiles();
	});

	function loadStoredFiles() {
		const stored = localStorage.getItem('dfdl-files');
		if (stored) {
			storedFiles = JSON.parse(stored);
		}
	}

	function saveStoredFiles() {
		localStorage.setItem('dfdl-files', JSON.stringify(storedFiles));
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

		// Check if file already exists
		const existingIndex = storedFiles.findIndex(f => f.name === file.name);
		if (existingIndex !== -1) {
			// Update existing file
			storedFiles[existingIndex] = fileInfo;
		} else {
			// Add new file
			storedFiles.push(fileInfo);
		}

		saveStoredFiles();
		return fileInfo;
	}

	function selectStoredFile(fileName) {
		const file = storedFiles.find(f => f.name === fileName);
		if (file) {
			// Create a File object from stored content
			const blob = new Blob([file.content], { type: 'application/xml' });
			dfdlFile = new File([blob], file.name, { type: 'application/xml' });
			selectedStoredFile = fileName;
			error = '';
		}
	}

	function deleteStoredFile(fileName) {
		storedFiles = storedFiles.filter(f => f.name !== fileName);
		saveStoredFiles();
		if (selectedStoredFile === fileName) {
			selectedStoredFile = '';
			dfdlFile = null;
		}
	}

	function hexToEBCDIC(hexStr) {
		let output = '';
		for (let i = 0; i < hexStr.length; i += 2) {
			const byte = hexStr.substr(i, 2).toUpperCase();
			output += ebcdicTable[byte] || '.';
		}
		return output;
	}

	async function parseDFDLXML(xmlContent) {
		try {
			// Use DOMParser for browser compatibility instead of xml2js
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
			
			// Check for XML parsing errors
			const parseError = xmlDoc.getElementsByTagName('parsererror');
			if (parseError.length > 0) {
				throw new Error('Invalid XML format');
			}
			
			// Find complexType elements
			const complexTypes = xmlDoc.getElementsByTagName('xsd:complexType');
			let targetType = null;
			
			// Search for RQTYPE or RSTYPE based on parseType
			const searchType = parseType === 'request' ? 'rqtype' : 'rstype';
			
			for (let i = 0; i < complexTypes.length; i++) {
				const complexType = complexTypes[i];
				const name = complexType.getAttribute('name');
				if (name && name.toLowerCase().includes(searchType)) {
					targetType = complexType;
					break;
				}
			}
			
			if (!targetType) {
				throw new Error(`No ${searchType.toUpperCase()} found in DFDL schema`);
			}
			
			// Get sequence elements
			const sequences = targetType.getElementsByTagName('xsd:sequence');
			if (sequences.length === 0) {
				throw new Error(`No xsd:sequence found in ${searchType.toUpperCase()}`);
			}
			
			const elements = sequences[0].getElementsByTagName('xsd:element');
			const elementArray = [];
			
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				const name = element.getAttribute('name');
				const length = element.getAttribute('dfdl:length');
				
				elementArray.push({
					$: {
						name: name,
						'dfdl:length': length || '26'
					}
				});
			}
			
			return elementArray;
		} catch (err) {
			throw new Error(`Failed to parse DFDL XML: ${err.message}`);
		}
	}

	async function processParsing() {
		if (!base64Input.trim()) {
			error = 'Please enter base64 input';
			return;
		}

		if (!dfdlFile) {
			error = 'Please upload a DFDL schema file';
			return;
		}

		loading = true;
		error = '';
		results = null;

		try {
			// Parse DFDL schema
			const dfdlContent = await dfdlFile.text();
			const schemaFields = await parseDFDLXML(dfdlContent);

			// Decode base64 and convert to hex
			const responseDecoded = atob(base64Input);
			const cleaned = responseDecoded.replace(/X'/g, '').replace(/'/g, '');

			// Convert hex to EBCDIC
			const ebcdicText = hexToEBCDIC(cleaned);
			const body = ebcdicText.slice(headerLength, -1);

			// Parse fields based on DFDL schema
			let cursor = 0;
			const fields = {};
			
			for (const el of schemaFields) {
				const name = el['$'].name;
				const len = parseInt(el['$']['dfdl:length'] || '26');
				const rawValue = body.substring(cursor, cursor + len);
				const value = stripTrailing ? (rawValue.trim().replace(/^0+/, '') || '0') : rawValue;
				fields[name] = {
					value: value,
					rawValue: rawValue,
					length: rawValue.length,
					expectedLength: len
				};
				cursor += len;
			}

			results = {
				parsingInfo: {
					responseLength: base64Input.length,
					headerLength: headerLength,
					bodyLength: body.length,
					stripTrailing: stripTrailing
				},
				fields: fields,
				debugInfo: {
					base64Input: base64Input,
					decodedHex: cleaned,
					ebcdicFull: ebcdicText,
					ebcdicBody: body
				}
			};

		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleFileUpload(event) {
		const file = event.target.files[0];
		if (file && (file.name.endsWith('.xml') || file.name.endsWith('.xsd'))) {
			dfdlFile = file;
			await storeFile(file);
			selectedStoredFile = file.name;
			error = '';
		} else {
			error = 'Please upload a valid XML/XSD DFDL schema file';
		}
	}

	function downloadResults() {
		if (!results) return;

		const resultLines = [];
		const parseTypeName = parseType === 'request' ? 'REQUEST' : 'RESPONSE';
		const schemaType = parseType === 'request' ? 'RQTYPE' : 'RSTYPE';
		
		resultLines.push(`PARSING ----------------------: Base64 Input`);
		resultLines.push(`USING DFDL -------------------: ${schemaType}`);
		resultLines.push(`RESPONSE HEADER LENGTH--------: ${results.parsingInfo.headerLength}`);
		resultLines.push(`DFDL BODY LENGTH -------------: ${results.parsingInfo.bodyLength}`);
		resultLines.push(`ACTUAL RESPONSE BODY LENGTH --: ${results.parsingInfo.bodyLength}`);
		resultLines.push(`TRAILING SPACE & 0 -----------: ${results.parsingInfo.stripTrailing}\n`);

		for (const [k, v] of Object.entries(results.fields)) {
			const value = results.parsingInfo.stripTrailing ? (v.value.trim().replace(/^0+/, '') || '0') : v.value;
			resultLines.push(`${k.padEnd(16)}: ${value} (length : ${v.length})`);
		}

		resultLines.push(`\n\nESB_PROVIDER_RES_AUDITIN BASE64 : \n${results.debugInfo.base64Input}`);
		resultLines.push(`\n\nESB_PROVIDER_RES_AUDITIN BASE64 DECODE : \n${results.debugInfo.decodedHex}`);
		resultLines.push(`\n\nEBCDIC OUTPUT FULL : \n${results.debugInfo.ebcdicFull}`);
		resultLines.push(`\n\nEBCDIC OUTPUT RES BODY : \n${results.debugInfo.ebcdicBody}`);

		const blob = new Blob([resultLines.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dfdl-${parseType.toLowerCase()}-results.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function resetForm() {
		base64Input = '';
		dfdlFile = null;
		headerLength = 688;
		stripTrailing = false;
		results = null;
		error = '';
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
						on:click={() => {
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
								DFDL Parser
							</h1>
							<p class="text-gray-600 mt-1">
								Parse base64 encoded data using DFDL schema with EBCDIC conversion
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
	<!-- Parse Type Selection Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:toggle-switch" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Parse Type</h2>
				</div>
			</div>
			<div class="p-6">
				<fieldset class="space-y-4">
					<legend class="text-lg font-medium text-gray-700 mb-4">Select parsing mode</legend>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label class="flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={parseType}
								value="request"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:arrow-up" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Request (RQTYPE)</span>
							</div>
						</label>
						<label class="flex items-center space-x-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={parseType}
								value="response"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:arrow-down" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Response (RSTYPE)</span>
							</div>
						</label>
					</div>
				</fieldset>
			</div>
		</section>
				<!-- Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:edit" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Data Input</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<!-- Base64 Input -->
				<div>
					<label for="base64-input" class="block text-sm font-medium text-gray-700 mb-2">
						Base64 Input
					</label>
					<textarea
						id="base64-input"
						bind:value={base64Input}
						placeholder="Enter base64 encoded data..."
						class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
					></textarea>
				</div>

				<!-- DFDL File Upload -->
				<div>
					<label for="dfdl-file" class="block text-sm font-medium text-gray-700 mb-2">
						DFDL Schema File (.xml/.xsd)
					</label>
					
					<!-- Stored Files Dropdown -->
					{#if storedFiles.length > 0}
						<div class="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
							<label for="stored-files" class="block text-sm font-medium text-gray-700 mb-2">
								Or select a previously uploaded file:
							</label>
							<div class="flex gap-2">
								<select
									id="stored-files"
									bind:value={selectedStoredFile}
									on:change={() => selectStoredFile(selectedStoredFile)}
									class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
								>
									<option value="">-- Select stored file --</option>
									{#each storedFiles as file}
										<option value={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option>
									{/each}
								</select>
								{#if selectedStoredFile}
									<button
										on:click={() => deleteStoredFile(selectedStoredFile)}
										class="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition-all"
										title="Delete stored file"
									>
										Delete
									</button>
								{/if}
							</div>
						</div>
					{/if}
					
					<!-- File Upload -->
					<input
						type="file"
						id="dfdl-file"
						accept=".xml,.xsd"
						on:change={handleFileUpload}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
					/>
					{#if dfdlFile}
						<div class="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
								<p class="text-green-700 font-medium">
									Loaded: {dfdlFile.name}
									{#if storedFiles.find(f => f.name === dfdlFile.name)}
										<span class="text-green-600 text-xs">(stored locally)</span>
									{/if}
								</p>
							</div>
						</div>
					{/if}
				</div>
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
						<label for="header-length" class="block text-sm font-medium text-gray-700 mb-2">
							Header Length
						</label>
						<input
							type="number"
							id="header-length"
							bind:value={headerLength}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
						/>
					</div>

					<div class="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="strip-trailing"
							bind:checked={stripTrailing}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="strip-trailing" class="ml-3 block text-sm text-gray-700 font-medium">
							Strip trailing zeros and whitespace
						</label>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						on:click={processParsing}
						disabled={loading}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:play" class="h-4 w-4" />
							<span>{#if loading}Processing...{:else}Parse Data{/if}</span>
						</span>
					</button>
					
					<button
						on:click={resetForm}
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
							<h2 class="text-xl font-bold text-white">Parsing Results</h2>
						</div>
						<button
							on:click={downloadResults}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:download" class="h-4 w-4" />
								<span>Download Results</span>
							</span>
						</button>
					</div>
				</div>
				<div class="p-6 space-y-6">
					<!-- Parsing Info -->
					<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
							<Icon icon="mdi-light:information" class="h-5 w-5 text-indigo-600" />
							<span>Parsing Information</span>
						</h3>
						<div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Parse Type:</span>
								<div class="text-gray-900 mt-1">{parseType === 'request' ? 'Request (RQTYPE)' : 'Response (RSTYPE)'}</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Header Length:</span>
								<div class="text-gray-900 mt-1">{results.parsingInfo.headerLength}</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Body Length:</span>
								<div class="text-gray-900 mt-1">{results.parsingInfo.bodyLength}</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Strip Trailing:</span>
								<div class="text-gray-900 mt-1">{results.parsingInfo.stripTrailing ? 'Yes' : 'No'}</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Fields Parsed:</span>
								<div class="text-gray-900 mt-1">{Object.keys(results.fields).length}</div>
							</div>
						</div>
					</div>

					<!-- Parsed Fields -->
					<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
						<h3 class="text-lg font-semibold text-gray-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center space-x-2">
							<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
							<span>Parsed Fields</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Field Name</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Value</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Raw Value</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Length</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Expected</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each Object.entries(results.fields) as [name, field]}
										<tr class="hover:bg-indigo-50 transition-colors">
											<td class="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
											<td class="px-4 py-3 text-sm text-indigo-600 font-mono font-semibold">{field.value}</td>
											<td class="px-4 py-3 text-sm text-gray-400 font-mono text-xs">{field.rawValue}</td>
											<td class="px-4 py-3 text-sm text-gray-600">{field.length}</td>
											<td class="px-4 py-3 text-sm text-gray-600">{field.expectedLength}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Debug Information -->
					<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
							<Icon icon="mdi-light:bug" class="h-5 w-5 text-indigo-600" />
							<span>Debug Information</span>
						</h3>
						<div class="space-y-4">
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<h4 class="font-medium text-gray-700 mb-2">Decoded Hex:</h4>
								<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto font-mono">{results.debugInfo.decodedHex}</pre>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<h4 class="font-medium text-gray-700 mb-2">EBCDIC Full Output:</h4>
								<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono">{results.debugInfo.ebcdicFull}</pre>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<h4 class="font-medium text-gray-700 mb-2">EBCDIC Body:</h4>
								<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono">{results.debugInfo.ebcdicBody}</pre>
							</div>
						</div>
					</div>
				</div>
			</section>
		{/if}
	</div>
</main>