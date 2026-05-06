<script>
	import Icon from '@iconify/svelte';

	let inputData = '';
	let outputData = '';
	let conversionMode = 'hexToEbcdic'; // 'hexToEbcdic' or 'ebcdicToHex'
	let error = '';

	// EBCDIC to ASCII conversion table
	const ebcdicToAscii = {
		0x00: '\x00', 0x01: '\x01', 0x02: '\x02', 0x03: '\x03',
		0x04: '\x04', 0x05: '\x05', 0x06: '\x06', 0x07: '\x07',
		0x08: '\x08', 0x09: '\x09', 0x0A: '\x0A', 0x0B: '\x0B',
		0x0C: '\x0C', 0x0D: '\x0D', 0x0E: '\x0E', 0x0F: '\x0F',
		0x10: '\x10', 0x11: '\x11', 0x12: '\x12', 0x13: '\x13',
		0x14: '\x14', 0x15: '\x15', 0x16: '\x16', 0x17: '\x17',
		0x18: '\x18', 0x19: '\x19', 0x1A: '\x1A', 0x1B: '\x1B',
		0x1C: '\x1C', 0x1D: '\x1D', 0x1E: '\x1E', 0x1F: '\x1F',
		0x20: ' ',    0x21: ' ',    0x22: ' ',    0x23: ' ',
		0x24: ' ',    0x25: ' ',    0x26: ' ',    0x27: ' ',
		0x28: ' ',    0x29: ' ',    0x2A: ' ',    0x2B: ' ',
		0x2C: ' ',    0x2D: ' ',    0x2E: ' ',    0x2F: ' ',
		0x30: '0',    0x31: '1',    0x32: '2',    0x33: '3',
		0x34: '4',    0x35: '5',    0x36: '6',    0x37: '7',
		0x38: '8',    0x39: '9',    0x3A: ' ',    0x3B: ' ',
		0x3C: ' ',    0x3D: ' ',    0x3E: ' ',    0x3F: ' ',
		0x40: ' ',    0x41: ' ',    0x42: ' ',    0x43: ' ',
		0x44: ' ',    0x45: ' ',    0x46: ' ',    0x47: ' ',
		0x48: ' ',    0x49: ' ',    0x4A: ' ',    0x4B: ' ',
		0x4C: ' ',    0x4D: ' ',    0x4E: ' ',    0x4F: ' ',
		0x50: ' ',    0x51: ' ',    0x52: ' ',    0x53: ' ',
		0x54: ' ',    0x55: ' ',    0x56: ' ',    0x57: ' ',
		0x58: ' ',    0x59: ' ',    0x5A: ' ',    0x5B: ' ',
		0x5C: ' ',    0x5D: ' ',    0x5E: ' ',    0x5F: ' ',
		0x60: ' ',    0x61: ' ',    0x62: ' ',    0x63: ' ',
		0x64: ' ',    0x65: ' ',    0x66: ' ',    0x67: ' ',
		0x68: ' ',    0x69: ' ',    0x6A: ' ',    0x6B: ' ',
		0x6C: ' ',    0x6D: ' ',    0x6E: ' ',    0x6F: ' ',
		0x70: ' ',    0x71: ' ',    0x72: ' ',    0x73: ' ',
		0x74: ' ',    0x75: ' ',    0x76: ' ',    0x77: ' ',
		0x78: ' ',    0x79: ' ',    0x7A: ' ',    0x7B: ' ',
		0x7C: ' ',    0x7D: ' ',    0x7E: ' ',    0x7F: ' ',
		0x80: ' ',    0x81: ' ',    0x82: ' ',    0x83: ' ',
		0x84: ' ',    0x85: ' ',    0x86: ' ',    0x87: ' ',
		0x88: ' ',    0x89: ' ',    0x8A: ' ',    0x8B: ' ',
		0x8C: ' ',    0x8D: ' ',    0x8E: ' ',    0x8F: ' ',
		0x90: ' ',    0x91: ' ',    0x92: ' ',    0x93: ' ',
		0x94: ' ',    0x95: ' ',    0x96: ' ',    0x97: ' ',
		0x98: ' ',    0x99: ' ',    0x9A: ' ',    0x9B: ' ',
		0x9C: ' ',    0x9D: ' ',    0x9E: ' ',    0x9F: ' ',
		0xA0: ' ',    0xA1: '~',    0xA2: ' ',    0xA3: ' ',
		0xA4: ' ',    0xA5: ' ',    0xA6: ' ',    0xA7: ' ',
		0xA8: ' ',    0xA9: ' ',    0xAA: ' ',    0xAB: ' ',
		0xAC: '.',    0xAD: '<',    0xAE: '(',    0xAF: '+',
		0xB0: '|',    0xB1: '&',    0xB2: ' ',    0xB3: ' ',
		0xB4: ' ',    0xB5: ' ',    0xB6: ' ',    0xB7: ' ',
		0xB8: ' ',    0xB9: '!',    0xBA: '$',    0xBB: '*',
		0xBC: ')',    0xBD: ';',    0xBE: '^',    0xBF: '-',
		0xC0: '/',    0xC1: ' ',    0xC2: ' ',    0xC3: ' ',
		0xC4: ' ',    0xC5: ' ',    0xC6: ' ',    0xC7: ' ',
		0xC8: ' ',    0xC9: ' ',    0xCA: ' ',    0xCB: ' ',
		0xCC: ' ',    0xCD: ' ',    0xCE: ' ',    0xCF: ' ',
		0xD0: ' ',    0xD1: ' ',    0xD2: ' ',    0xD3: ' ',
		0xD4: ' ',    0xD5: ' ',    0xD6: ' ',    0xD7: ' ',
		0xD8: ' ',    0xD9: ' ',    0xDA: ' ',    0xDB: ' ',
		0xDC: ' ',    0xDD: ' ',    0xDE: ' ',    0xDF: ' ',
		0xE0: ' ',    0xE1: ' ',    0xE2: ' ',    0xE3: ' ',
		0xE4: ' ',    0xE5: ' ',    0xE6: ' ',    0xE7: ' ',
		0xE8: ' ',    0xE9: ' ',    0xEA: ' ',    0xEB: ' ',
		0xEC: ' ',    0xED: ' ',    0xEE: ' ',    0xEF: ' ',
		0xF0: '0',    0xF1: '1',    0xF2: '2',    0xF3: '3',
		0xF4: '4',    0xF5: '5',    0xF6: '6',    0xF7: '7',
		0xF8: '8',    0xF9: '9',    0xFA: ' ',    0xFB: ' ',
		0xFC: ' ',    0xFD: ' ',    0xFE: ' ',    0xFF: ' '
	};

	// ASCII to EBCDIC conversion table (reverse of above)
	const asciiToEbcdic = {};
	for (let ebcdicCode in ebcdicToAscii) {
		const asciiChar = ebcdicToAscii[ebcdicCode];
		if (asciiChar && !asciiToEbcdic[asciiChar]) {
			asciiToEbcdic[asciiChar] = parseInt(ebcdicCode);
		}
	}

	function hexToEbcdic() {
		try {
			error = '';
			
			// Clean hex input - remove spaces, newlines, and ensure valid hex
			let cleanHex = inputData.replace(/\s/g, '').toUpperCase();
			
			// Validate hex input
			if (!/^[0-9A-F]*$/.test(cleanHex)) {
				throw new Error('Invalid hex input. Only hex characters (0-9, A-F) are allowed.');
			}
			
			// Ensure even number of hex digits
			if (cleanHex.length % 2 !== 0) {
				cleanHex = '0' + cleanHex;
			}
			
			let result = '';
			for (let i = 0; i < cleanHex.length; i += 2) {
				const hexByte = cleanHex.substr(i, 2);
				const ebcdicCode = parseInt(hexByte, 16);
				const asciiChar = ebcdicToAscii[ebcdicCode] || '.';
				result += asciiChar;
			}
			
			outputData = result;
		} catch (e) {
			error = 'Hex to EBCDIC conversion error: ' + e.message;
		}
	}

	function ebcdicToHex() {
		try {
			error = '';
			
			let result = '';
			for (let i = 0; i < inputData.length; i++) {
				const char = inputData[i];
				const ebcdicCode = asciiToEbcdic[char];
				if (ebcdicCode !== undefined) {
					result += ebcdicCode.toString(16).toUpperCase().padStart(2, '0');
				} else {
					// For characters not in the table, use a default or skip
					result += '00'; // Default to 0x00 for unknown chars
				}
			}
			
			outputData = result;
		} catch (e) {
			error = 'EBCDIC to Hex conversion error: ' + e.message;
		}
	}

	function convert() {
		if (!inputData.trim()) {
			error = 'Please enter data to convert';
			return;
		}
		
		if (conversionMode === 'hexToEbcdic') {
			hexToEbcdic();
		} else {
			ebcdicToHex();
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(outputData);
	}

	function clearAll() {
		inputData = '';
		outputData = '';
		error = '';
	}

	function swapConversion() {
		// Swap input and output
		const temp = inputData;
		inputData = outputData;
		outputData = temp;
		
		// Swap conversion mode
		conversionMode = conversionMode === 'hexToEbcdic' ? 'ebcdicToHex' : 'hexToEbcdic';
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
						<div class="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 p-3">
							<Icon icon="mdi-light:swap-horizontal" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
								Hex to EBCDIC Converter
							</h1>
							<p class="text-gray-600 mt-1">
								Convert between hexadecimal and EBCDIC character encoding formats
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

		<!-- Conversion Mode Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden">
			<div class="bg-gradient-to-r from-pink-500 to-rose-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:swap-horizontal" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Conversion Mode</h2>
					</div>
					<button
						on:click={swapConversion}
						class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						title="Swap input/output and conversion mode"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:swap-horizontal" class="h-4 w-4" />
							<span>Swap</span>
						</span>
					</button>
				</div>
			</div>
			<div class="p-6">
				<div class="flex justify-center">
					<div class="inline-flex rounded-xl bg-gray-100 p-1">
						<button
							on:click={() => conversionMode = 'hexToEbcdic'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {conversionMode === 'hexToEbcdic'
								? 'bg-white text-pink-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:hexadecimal" class="h-4 w-4" />
								<span>Hex → EBCDIC</span>
							</span>
						</button>
						<button
							on:click={() => conversionMode = 'ebcdicToHex'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {conversionMode === 'ebcdicToHex'
								? 'bg-white text-pink-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:alphabetical" class="h-4 w-4" />
								<span>EBCDIC → Hex</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:file-document-edit" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">
							{conversionMode === 'hexToEbcdic' ? 'Hex Input' : 'EBCDIC Input'}
						</h2>
					</div>
					<div class="flex space-x-3">
						<button
							on:click={convert}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:play" class="h-4 w-4" />
								<span>Convert</span>
							</span>
						</button>
						<button
							on:click={clearAll}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:delete" class="h-4 w-4" />
								<span>Clear</span>
							</span>
						</button>
					</div>
				</div>
			</div>
			<div class="p-6">
				<textarea
					bind:value={inputData}
					placeholder={conversionMode === 'hexToEbcdic' 
						? 'Enter hexadecimal values (e.g., 48656C6C6F20576F726C64)...' 
						: 'Enter EBCDIC encoded text...'}
					class="w-full h-40 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-pink-400 focus:ring-4 focus:ring-pink-100 resize-none"
				></textarea>
			</div>
		</section>

		<!-- Output Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-pink-500 to-rose-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:check-circle" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">
							{conversionMode === 'hexToEbcdic' ? 'EBCDIC Output' : 'Hex Output'}
						</h2>
					</div>
					<button
						on:click={copyToClipboard}
						class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:content-copy" class="h-4 w-4" />
							<span>Copy</span>
							</span>
						</button>
				</div>
			</div>
			<div class="p-6">
				<textarea
					bind:value={outputData}
					placeholder="Conversion result will appear here..."
					readonly
					class="w-full h-40 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm bg-gray-50 transition-all focus:border-pink-400 focus:ring-4 focus:ring-pink-100 resize-none"
				></textarea>
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

		<!-- Info Section -->
		<section class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:information" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">About EBCDIC</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
					<p class="text-blue-800 leading-relaxed">
						<strong class="text-blue-900">EBCDIC</strong> (Extended Binary Coded Decimal Interchange Code) is an 8-bit character encoding used mainly on IBM mainframe systems.
					</p>
				</div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-blue-100 p-2">
								<Icon icon="mdi-light:hexadecimal" class="h-5 w-5 text-blue-600" />
							</div>
							<h3 class="font-bold text-blue-800">Hex to EBCDIC</h3>
						</div>
						<div class="space-y-3">
							{#each [
								'Converts hex values to their EBCDIC character equivalents',
								'Supports common EBCDIC character mappings',
								'Auto-pads odd-length hex input'
							] as feature}
							<div class="flex items-start space-x-3">
								<Icon icon="mdi-light:check-circle" class="h-4 w-4 text-blue-600 mt-0.5" />
								<p class="text-sm text-blue-700">{feature}</p>
							</div>
						{/each}
						</div>
					</div>
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-blue-100 p-2">
								<Icon icon="mdi-light:alphabetical" class="h-5 w-5 text-blue-600" />
							</div>
							<h3 class="font-bold text-blue-800">EBCDIC to Hex</h3>
						</div>
						<div class="space-y-3">
							{#each [
								'Converts EBCDIC characters back to hex representation',
								'Uses standard EBCDIC to ASCII conversion table',
								'Unknown characters default to 0x00'
							] as feature}
							<div class="flex items-start space-x-3">
								<Icon icon="mdi-light:check-circle" class="h-4 w-4 text-blue-600 mt-0.5" />
								<p class="text-sm text-blue-700">{feature}</p>
							</div>
						{/each}
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</main>
