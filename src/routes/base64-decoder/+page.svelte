<script>
	import Icon from '@iconify/svelte';
	import { 
		isBase64, 
		detectContentType, 
		extractXmlData, 
		remapXmlStructure, 
		checkAndValidateValues,
		detectMixedContent,
		processMixedContent,
		formatDecodedContent,
		extractJsonData,
		remapJsonStructure
	} from '$lib/base64-processor.js';

	let inputText = '';
	let decodedOutput = '';
	let remappedOutput = '';
	let selectedType = 'auto'; // 'auto', 'base64', 'json', 'xml', 'plaintext', 'urlencoded'
	let error = '';
	let showRawOutput = false;

	let detectedFormat = '';
	let isProcessing = false;

	function detectAndDecode() {
		try {
			isProcessing = true;
			error = '';
			decodedOutput = '';
			remappedOutput = '';
			detectedFormat = '';

			if (!inputText.trim()) {
				error = 'Please enter text to process';
				isProcessing = false;
				return;
			}

			const text = inputText.trim();

			// Process based on selected type
			switch (selectedType) {
				case 'auto':
					// Auto-detection logic
					if (isBase64(text)) {
						detectedFormat = 'Base64 Encoded';
						const decoded = decodeBase64(text);
						const contentType = detectContentType(decoded);
						detectedFormat += ` → ${contentType}`;
						const formatted = formatDecodedContent(decoded, contentType);
						decodedOutput = formatted.mainContent;
						remappedOutput = formatted.remappedContent;
					} else {
						const mixedDetection = detectMixedContent(text);
						if (mixedDetection.isMixed) {
							detectedFormat = `Mixed Content (${mixedDetection.parts.join(', ')})`;
							decodedOutput = processMixedContent(text, mixedDetection);
						} else {
							const contentType = detectContentType(text);
							if (contentType !== 'Unknown') {
								detectedFormat = `Plain ${contentType}`;
								const formatted = formatDecodedContent(text, contentType);
								decodedOutput = formatted.mainContent;
								remappedOutput = formatted.remappedContent;
							} else {
								detectedFormat = 'Plain Text (Base64 Encoded)';
								decodedOutput = `Base64: ${btoa(text)}`;
							}
						}
					}
					break;

				case 'base64':
					try {
						const decoded = decodeBase64(text);
						detectedFormat = 'Base64 Decoded';
						const contentType = detectContentType(decoded);
						detectedFormat += ` → ${contentType}`;
						const formatted = formatDecodedContent(decoded, contentType);
						decodedOutput = formatted.mainContent;
						remappedOutput = formatted.remappedContent;
					} catch (e) {
						error = 'Invalid base64 format';
						return;
					}
					break;

				case 'json':
					detectedFormat = 'JSON Formatted';
					const jsonFormatted = formatDecodedContent(text, 'JSON');
					decodedOutput = jsonFormatted.mainContent;
					remappedOutput = jsonFormatted.remappedContent;
					break;

				case 'xml':
					detectedFormat = 'XML Formatted';
					const xmlFormatted = formatDecodedContent(text, 'XML');
					decodedOutput = xmlFormatted.mainContent;
					remappedOutput = xmlFormatted.remappedContent;
					break;

				case 'plaintext':
					detectedFormat = 'Plain Text';
					// Check if the plaintext is actually a base64 string
					if (isBase64(text)) {
						detectedFormat = 'Plain Text → Base64 Encoded';
						try {
							const decoded = atob(text);
							const contentType = detectContentType(decoded);
							detectedFormat += ` → ${contentType}`;
							const formatted = formatDecodedContent(decoded, contentType);
							decodedOutput = formatted.mainContent;
							remappedOutput = formatted.remappedContent;
						} catch {
							decodedOutput = `Original: ${text}\n\nFailed to decode base64`;
						}
					} else {
						const contentType = detectContentType(text);
						if (contentType !== 'Plain Text') {
							detectedFormat += ` → ${contentType}`;
							const formatted = formatDecodedContent(text, contentType);
							decodedOutput = formatted.mainContent;
							remappedOutput = formatted.remappedContent;
						} else {
							decodedOutput = text;
						}
					}
					break;

				case 'urlencoded':
					try {
						const decoded = decodeURIComponent(text);
						detectedFormat = 'URL Decoded';
						decodedOutput = decoded;
					} catch (e) {
						error = 'Invalid URL encoding';
						return;
					}
					break;

				default:
					error = 'Please select a valid content type';
					return;
			}
		} catch (e) {
			error = 'Processing error: ' + e.message;
		} finally {
			isProcessing = false;
		}
	}

	function encodeToBase64() {
		try {
			isProcessing = true;
			error = '';
			detectedFormat = 'Base64 Encoded';
			decodedOutput = btoa(inputText);
		} catch (e) {
			error = 'Base64 encoding error: ' + e.message;
		} finally {
			isProcessing = false;
		}
	}

	function copyToClipboard() {
		try {
			navigator.clipboard.writeText(decodedOutput);
		} catch (e) {
			error = 'Failed to copy to clipboard: ' + e.message;
		}
	}

	function copyRemappedToClipboard() {
		try {
			navigator.clipboard.writeText(remappedOutput);
		} catch (e) {
			error = 'Failed to copy remapped content: ' + e.message;
		}
	}

	function clearAll() {
		inputText = '';
		decodedOutput = '';
		remappedOutput = '';
		error = '';
		showRawOutput = false;
		detectedFormat = '';
	}

	function toggleRawOutput() {
		showRawOutput = !showRawOutput;
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
						<div class="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-3">
							<Icon icon="mdi-light:code-braces" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
								Base64 Auto-Detect & Decoder
							</h1>
							<p class="text-gray-600 mt-1">
								Automatically detect and decode base64, JSON, XML, or mixed content formats
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

		<!-- Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
			<div class="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:file-document-edit" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Input Text</h2>
					</div>
					<div class="flex items-center space-x-3">
						<select
							bind:value={selectedType}
							class="rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm text-white placeholder-white/70 backdrop-blur-sm focus:border-white focus:ring-2 focus:ring-white/50"
						>
							<option value="auto" class="text-gray-800">Auto-Detect</option>
							<option value="json" class="text-gray-800">JSON</option>
							<option value="xml" class="text-gray-800">XML</option>
							<option value="plaintext" class="text-gray-800">Plain Text</option>
						</select>
					</div>
				</div>
			</div>
			<div class="p-6 space-y-4">
				<textarea
					bind:value={inputText}
					placeholder={selectedType === 'auto'
						? 'Enter text to auto-detect and decode...'
						: selectedType === 'base64'
							? 'Enter base64 encoded text to decode...'
							: selectedType === 'json'
								? 'Enter JSON to format...'
								: selectedType === 'xml'
									? 'Enter XML to format...'
									: selectedType === 'urlencoded'
										? 'Enter URL encoded text to decode...'
										: 'Enter text to process...'}
					class="w-full h-40 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100 resize-none"
				></textarea>
				<div class="flex flex-wrap gap-3">
					<button
						on:click={detectAndDecode}
						disabled={isProcessing}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
					>
						<span class="relative z-10 flex items-center space-x-2">
							{#if isProcessing}
								<Icon icon="mdi-light:loading" class="h-4 w-4 animate-spin" />
								<span>Processing...</span>
							{:else}
								<Icon icon="mdi-light:magnify" class="h-4 w-4" />
								<span>Decode</span>
							{/if}
						</span>
					</button>
					{#if selectedType === 'plaintext'}
						<button
							on:click={encodeToBase64}
							disabled={isProcessing}
							class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:lock" class="h-4 w-4" />
								<span>Encode to Base64</span>
							</span>
						</button>
					{/if}
					<button
						on:click={clearAll}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-red-600 hover:to-rose-600 shadow-lg hover:shadow-xl"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:delete" class="h-4 w-4" />
							<span>Clear</span>
						</span>
					</button>
				</div>
			</div>
		</section>

		<!-- Detection Result -->
		{#if detectedFormat}
			<section class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
				<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:information" class="h-5 w-5 text-white" />
						<h3 class="text-lg font-bold text-white">Detection Result</h3>
					</div>
				</div>
				<div class="p-6">
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-blue-100 p-2">
							<Icon icon="mdi-light:check-circle" class="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<p class="text-sm font-medium text-blue-800">Detected Format</p>
							<p class="text-lg font-bold text-blue-900">{detectedFormat}</p>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Output Area -->
		{#if decodedOutput}
			<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
				<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:code-brackets" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Decoded Output</h2>
						</div>
						<div class="flex space-x-3">
							<button
								on:click={toggleRawOutput}
								class="rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								{showRawOutput ? 'Show Formatted' : 'Show Raw'}
							</button>
							<button
								on:click={copyToClipboard}
								class="rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<Icon icon="mdi-light:content-copy" class="h-4 w-4 mr-1" />
								Copy
							</button>
						</div>
					</div>
				</div>
				<div class="p-6">
					<div class="rounded-xl bg-gray-900 p-6 font-mono text-sm text-green-400 overflow-x-auto">
						<pre class="whitespace-pre-wrap">{decodedOutput}</pre>
					</div>
				</div>
			</section>
		{/if}

		<!-- Remapped Content Section -->
		{#if remappedOutput}
			<section class="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
				<div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:swap-horizontal" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">
								{selectedType === 'json' ? 'Remapped JSON (with decoded base64)' : 'Remapped XML (with decoded base64)'}
							</h2>
						</div>
						<button
							on:click={copyRemappedToClipboard}
							class="rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<Icon icon="mdi-light:content-copy" class="h-4 w-4 mr-1" />
							Copy {selectedType === 'json' ? 'JSON' : 'XML'}
						</button>
					</div>
				</div>
				<div class="p-6">
					<div class="rounded-xl bg-gray-900 p-6 font-mono text-sm text-purple-400 overflow-x-auto">
						<pre class="whitespace-pre-wrap">{remappedOutput}</pre>
					</div>
				</div>
			</section>
		{/if}

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
		<section class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl border border-green-100 overflow-hidden">
			<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:information" class="h-6 w-6 text-white" />
					<h3 class="text-xl font-bold text-white">Supported Formats & Features</h3>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-green-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-green-100 p-2">
								<Icon icon="mdi-light:magnify" class="h-5 w-5 text-green-600" />
							</div>
							<h4 class="font-bold text-green-800">Detection Features</h4>
						</div>
						<div class="space-y-3">
							{#each [
								{ icon: 'mdi-light:numeric', title: 'Base64', desc: 'Automatic detection and decoding' },
								{ icon: 'mdi-light:code-json', title: 'JSON', desc: 'Pretty-printed formatting' },
								{ icon: 'mdi-light:code-tags', title: 'XML', desc: 'Tag-based formatting' },
								{ icon: 'mdi-light:merge', title: 'Mixed Content', desc: 'Separates multiple formats' },
								{ icon: 'mdi-light:link', title: 'URL Encoding', desc: 'Decodes URL-encoded strings' }
							] as feature}
							<div class="flex items-start space-x-3">
								<Icon icon={feature.icon} class="h-5 w-5 text-green-600 mt-0.5" />
								<div>
									<p class="font-semibold text-green-800">{feature.title}</p>
									<p class="text-sm text-green-600">{feature.desc}</p>
								</div>
							</div>
							{/each}
						</div>
					</div>
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-green-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-green-100 p-2">
								<Icon icon="mdi-light:file-document" class="h-5 w-5 text-green-600" />
							</div>
							<h4 class="font-bold text-green-800">Content Types</h4>
						</div>
						<div class="space-y-3">
							{#each [
								{ icon: 'mdi-light:format-text', title: 'Plain Text', desc: 'Regular text content' },
								{ icon: 'mdi-light:code-json', title: 'JSON', desc: 'Structured data objects' },
								{ icon: 'mdi-light:code-tags', title: 'XML', desc: 'Markup language content' },
								{ icon: 'mdi-light:binary', title: 'Binary Data', desc: 'Hex or binary patterns' },
								{ icon: 'mdi-light:key', title: 'Key-Value', desc: 'URL parameters or config' }
							] as type}
							<div class="flex items-start space-x-3">
								<Icon icon={type.icon} class="h-5 w-5 text-green-600 mt-0.5" />
								<div>
									<p class="font-semibold text-green-800">{type.title}</p>
									<p class="text-sm text-green-600">{type.desc}</p>
								</div>
							</div>
							{/each}
						</div>
					</div>
				</div>
				<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-green-200">
					<div class="flex items-center space-x-3 mb-4">
						<div class="rounded-full bg-green-100 p-2">
							<Icon icon="mdi-light:cog" class="h-5 w-5 text-green-600" />
						</div>
						<h4 class="font-bold text-green-800">Auto-Detection Logic</h4>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
						{#each [
							{ step: 1, desc: 'Checks for valid Base64 encoding' },
							{ step: 2, desc: 'Analyzes decoded content type' },
							{ step: 3, desc: 'Detects mixed content patterns' },
							{ step: 4, desc: 'Applies appropriate formatting' },
							{ step: 5, desc: 'Handles encoding/decoding both ways' }
						] as item}
						<div class="text-center">
							<div class="rounded-full bg-green-500 text-white w-8 h-8 flex items-center justify-center mx-auto mb-2 font-bold">
								{item.step}
							</div>
							<p class="text-sm text-green-700">{item.desc}</p>
						</div>
						{/each}
					</div>
				</div>
			</div>
		</section>
	</div>
</main>
