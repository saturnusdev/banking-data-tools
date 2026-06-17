<script>
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

	let inputData = '';
	let outputData = '';
	let conversionMode = 'hexToEbcdic'; // 'hexToEbcdic' or 'ebcdicToHex'
	let error = '';

	// Check for hex parameter in URL
	$: if ($page.url.searchParams.has('hex')) {
		const hexParam = $page.url.searchParams.get('hex');
		if (hexParam) {
			inputData = hexParam;
			conversionMode = 'hexToEbcdic';
			// Auto-convert
			convert();
		}
	}

	// Converted from your original switch statement
	const ebcdicMap = {
		'00': '<NUL>',
		'01': '<SOH>',
		'02': '<STX>',
		'03': '<ETX>',
		'04': '<SEL>',
		'05': '<HT>',
		'06': '<RNL>',
		'07': '<DEL>',
		'08': '<GE>',
		'09': '<SPS>',
		'0A': '<RPT>',
		'0B': '<VT>',
		'0C': '<FF>',
		'0D': String.fromCharCode(13),
		'0E': '<SO>',
		'0F': '<SI>',

		'40': ' ',

		'4A': '[',
		'4B': '.',
		'4C': '<',
		'4D': '(',
		'4E': '+',
		'4F': '!',

		'50': '&',

		'5A': ']',
		'5B': '$',
		'5C': '*',
		'5D': ')',
		'5E': ';',
		'5F': '^',

		'60': '_',
		'61': '/',

		'6A': '|',
		'6B': ',',
		'6C': '%',
		'6D': '_',
		'6E': '>',
		'6F': '?',

		'79': '`',
		'7A': ':',
		'7B': '#',
		'7C': '@',
		'7D': "'",
		'7E': '=',
		'7F': '"',

		// lowercase
		'81': 'a',
		'82': 'b',
		'83': 'c',
		'84': 'd',
		'85': 'e',
		'86': 'f',
		'87': 'g',
		'88': 'h',
		'89': 'i',

		'91': 'j',
		'92': 'k',
		'93': 'l',
		'94': 'm',
		'95': 'n',
		'96': 'o',
		'97': 'p',
		'98': 'q',
		'99': 'r',

		'A1': '~',
		'A2': 's',
		'A3': 't',
		'A4': 'u',
		'A5': 'v',
		'A6': 'w',
		'A7': 'x',
		'A8': 'y',
		'A9': 'z',

		// uppercase
		'C0': '{',
		'C1': 'A',
		'C2': 'B',
		'C3': 'C',
		'C4': 'D',
		'C5': 'E',
		'C6': 'F',
		'C7': 'G',
		'C8': 'H',
		'C9': 'I',

		'D0': '}',
		'D1': 'J',
		'D2': 'K',
		'D3': 'L',
		'D4': 'M',
		'D5': 'N',
		'D6': 'O',
		'D7': 'P',
		'D8': 'Q',
		'D9': 'R',

		'E0': '\\',
		'E2': 'S',
		'E3': 'T',
		'E4': 'U',
		'E5': 'V',
		'E6': 'W',
		'E7': 'X',
		'E8': 'Y',
		'E9': 'Z',

		// digits
		'F0': '0',
		'F1': '1',
		'F2': '2',
		'F3': '3',
		'F4': '4',
		'F5': '5',
		'F6': '6',
		'F7': '7',
		'F8': '8',
		'F9': '9'
	};

	const asciiToEbcdic = {};

	Object.entries(ebcdicMap).forEach(([hex, value]) => {
		if (value.length === 1) {
			asciiToEbcdic[value] = hex;
		}
	});

	function hexToEbcdic() {
		try {
			error = '';

			let cleanHex = inputData
				.replace(/\s/g, '')
				.toUpperCase();

			if (!/^[0-9A-F]*$/.test(cleanHex)) {
				throw new Error('Invalid hex input');
			}

			if (cleanHex.length % 2 !== 0) {
				throw new Error('Hex length must be even');
			}

			let result = '';

			for (let i = 0; i < cleanHex.length; i += 2) {
				const byte = cleanHex.substring(i, i + 2);

				result += ebcdicMap[byte] ?? '.';
			}

			outputData = result;
		} catch (e) {
			error = e.message;
		}
	}

	function ebcdicToHex() {
		try {
			error = '';

			let result = '';

			for (const char of inputData) {
				result += asciiToEbcdic[char] ?? '00';
			}

			outputData = result;
		} catch (e) {
			error = e.message;
		}
	}

	function convert() {
		if (!inputData.trim()) {
			error = 'Please enter data';
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
