<script>
	import Icon from '@iconify/svelte';
	import { page } from '$app/state';
	import {
		bytesToHex,
		bytesToBase64,
		bytesToAscii,
		bytesToEbcdic,
		asciiToEbcdicHex,
		asciiToEbcdicBytes,
		asciiToBytes,
		hexToBytes,
		base64ToBytes
	} from '#lib/plugin/iso8583/codec';

	let inputData = $state('');
	let outputData = $state('');
	let conversionMode = $state('hexToEbcdic');
	let error = $state('');

	const codecModes = [
		{ id: 'hexToEbcdic', label: 'Hex → EBCDIC', icon: 'mdi-light:hexadecimal', input: 'hex' },
		{ id: 'ebcdicToHex', label: 'EBCDIC → Hex', icon: 'mdi-light:alphabetical', input: 'text' },
		{ id: 'hexToAscii', label: 'Hex → ASCII', icon: 'mdi-light:hexadecimal', input: 'hex' },
		{ id: 'asciiToHex', label: 'ASCII → Hex', icon: 'mdi-light:alphabetical', input: 'text' },
		{ id: 'base64ToHex', label: 'Base64 → Hex', icon: 'mdi-light:lock-open', input: 'base64' },
		{ id: 'hexToBase64', label: 'Hex → Base64', icon: 'mdi-light:hexadecimal', input: 'hex' },
		{ id: 'asciiToEbcdic', label: 'ASCII → EBCDIC', icon: 'mdi-light:alphabetical', input: 'text' }
	];

	const currentMode = $derived(codecModes.find((m) => m.id === conversionMode) || codecModes[0]);

	$effect(() => {
		if (page.url.searchParams.has('hex')) {
			const hexParam = page.url.searchParams.get('hex');
			if (hexParam) {
				inputData = hexParam;
				conversionMode = 'hexToEbcdic';
				convert();
			}
		}
	});

	function convert() {
		try {
			error = '';
			const input = inputData.trim();
			if (!input) {
				outputData = '';
				return;
			}
			switch (conversionMode) {
				case 'hexToEbcdic':
					outputData = bytesToEbcdic(hexToBytes(input));
					break;
				case 'ebcdicToHex':
					outputData = bytesToHex(asciiToEbcdicBytes(input));
					break;
				case 'hexToAscii':
					outputData = bytesToAscii(hexToBytes(input));
					break;
				case 'asciiToHex':
					outputData = bytesToHex(asciiToBytes(input));
					break;
				case 'base64ToHex':
					outputData = bytesToHex(base64ToBytes(input));
					break;
				case 'hexToBase64':
					outputData = bytesToBase64(hexToBytes(input));
					break;
				case 'asciiToEbcdic':
					outputData = asciiToEbcdicHex(input);
					break;
				default:
					outputData = '';
			}
		} catch (e) {
			error = e.message;
			outputData = '';
		}
	}

	function copyToClipboard() {
		if (outputData) navigator.clipboard.writeText(outputData);
	}

	function clearAll() {
		inputData = '';
		outputData = '';
		error = '';
	}

	function swapConversion() {
		const temp = inputData;
		inputData = outputData;
		outputData = temp;
	}

	function inputPlaceholder() {
		if (currentMode.input === 'hex') return 'Enter hexadecimal values (e.g., 48656C6C6F20576F726C64)...';
		if (currentMode.input === 'base64') return 'Enter Base64 encoded data...';
		return 'Enter text to convert...';
	}

	function inputLabel() {
		return currentMode.label.split('→')[0].trim();
	}

	function outputLabel() {
		return currentMode.label.split('→')[1].trim();
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
						onclick={() => (location.href = '/')}
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
								Convert between Hex, ASCII, EBCDIC, and Base64 representations
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
						onclick={swapConversion}
						class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						title="Swap input and output"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:swap-horizontal" class="h-4 w-4" />
							<span>Swap</span>
						</span>
					</button>
				</div>
			</div>
			<div class="p-6">
				<div class="flex flex-wrap gap-2">
					{#each codecModes as mode}
						<button
							onclick={() => { conversionMode = mode.id; convert(); }}
							class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all {conversionMode === mode.id
								? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
						>
							<Icon icon={mode.icon} class="h-4 w-4" />
							{mode.label}
						</button>
					{/each}
				</div>
			</div>
		</section>
		<!-- Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:file-document-edit" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">{inputLabel()} Input</h2>
					</div>
					<div class="flex space-x-3">
						<button
							onclick={convert}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:play" class="h-4 w-4" />
								<span>Convert</span>
							</span>
						</button>
						<button
							onclick={clearAll}
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
					oninput={convert}
					placeholder={inputPlaceholder()}
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
						<h2 class="text-xl font-bold text-white">{outputLabel()} Output</h2>
					</div>
					<button
						onclick={copyToClipboard}
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
					<h2 class="text-xl font-bold text-white">About Codec Conversions</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
					<p class="text-blue-800 leading-relaxed">
						<strong class="text-blue-900">EBCDIC</strong> (Extended Binary Coded Decimal Interchange Code) is an 8-bit character encoding used mainly on IBM mainframe systems. These codec helpers convert between hexadecimal, ASCII, EBCDIC, and Base64 representations — useful when working with ISO 8583 and mainframe financial messages.
					</p>
				</div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-blue-100 p-2">
								<Icon icon="mdi-light:hexadecimal" class="h-5 w-5 text-blue-600" />
							</div>
							<h3 class="font-bold text-blue-800">Hex ↔ EBCDIC</h3>
						</div>
						<div class="space-y-3">
							{#each [
								'Converts hex values to their EBCDIC character equivalents',
								'Supports common EBCDIC (IBM037) character mappings',
								'EBCDIC input is converted to its hex representation'
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
							<h3 class="font-bold text-blue-800">Hex ↔ ASCII ↔ Base64</h3>
						</div>
						<div class="space-y-3">
							{#each [
								'Converts between hex and printable ASCII text',
								'Base64 encode / decode to and from hex',
								'ASCII text to EBCDIC hex conversion'
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
