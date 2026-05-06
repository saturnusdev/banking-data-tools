<script>
	import Icon from '@iconify/svelte';

	let jsonData = '';
	let mode = 'parse'; // 'parse' or 'stringified'
	let addEscapes = false;
	let error = '';

	function parseJson() {
		try {
			// Parse and validate JSON
			const parsed = JSON.parse(jsonData);
			// Format with pretty printing
			jsonData = JSON.stringify(parsed, null, 2);
			mode = 'parse';
			error = '';
		} catch (e) {
			error = 'Invalid JSON: ' + e.message;
		}
	}

	function stringifyJson() {
		try {
			// Remove escape characters if present
			let cleaned = jsonData.replace(/\\"/g, '"');
			// Parse to validate
			const parsed = JSON.parse(cleaned);
			// Stringify with minification
			let result = JSON.stringify(parsed);
			// Add escapes if option is enabled
			if (addEscapes) {
				result = result.replace(/"/g, '\\"');
			}
			jsonData = result;
			mode = 'stringified';
			error = '';
		} catch (e) {
			error = 'Invalid JSON: ' + e.message;
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(jsonData);
	}

	function clearAll() {
		jsonData = '';
		error = '';
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
						<div class="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 p-3">
							<Icon icon="mdi-light:code-braces" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
								JSON Stringify
							</h1>
							<p class="text-gray-600 mt-1">
								Convert JSON data to formatted strings with customizable indentation
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

		<!-- Mode Selection Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
			<div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:toggle-switch" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">JSON Mode</h2>
					</div>
					{#if mode === 'stringified'}
						<label class="flex items-center space-x-3 text-white/90">
							<input
								type="checkbox"
								bind:checked={addEscapes}
								class="h-4 w-4 rounded border-white/30 text-white focus:ring-white/50"
							/>
							<span class="text-sm font-medium">Add Escapes (\")</span>
						</label>
					{/if}
				</div>
			</div>
			<div class="p-6">
				<div class="flex justify-center">
					<div class="inline-flex rounded-xl bg-gray-100 p-1">
						<button
							on:click={() => mode = 'parse'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'parse'
								? 'bg-white text-purple-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:code-json" class="h-4 w-4" />
								<span>Parse</span>
							</span>
						</button>
						<button
							on:click={() => mode = 'stringified'}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'stringified'
								? 'bg-white text-purple-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:format-text" class="h-4 w-4" />
								<span>Stringified</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- JSON Editor Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:code-braces" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">
							JSON Data ({mode === 'parse' ? 'Parse Mode' : 'Stringified Mode'})
						</h2>
					</div>
					<div class="flex space-x-3">
						{#if mode === 'parse'}
							<button
								on:click={parseJson}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:code-json" class="h-4 w-4" />
									<span>Parse</span>
								</span>
							</button>
						{:else}
							<button
								on:click={stringifyJson}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:format-text" class="h-4 w-4" />
									<span>Stringified</span>
								</span>
							</button>
						{/if}
						<button
							on:click={copyToClipboard}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:content-copy" class="h-4 w-4" />
								<span>Copy</span>
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
					bind:value={jsonData}
					placeholder={mode === 'parse' ? 'Enter JSON data to parse and validate...' : 'Enter JSON data to stringify (will be minified)...'}
					class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100 resize-none"
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
	</div>
</main>
