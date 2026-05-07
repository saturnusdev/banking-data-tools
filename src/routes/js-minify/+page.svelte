<script>
	import Icon from '@iconify/svelte';
	import { loadTerser, loadPrettier } from '$lib/lazy-loads';

	// Lazy loaded dependencies
	let minify = null;
	let prettier = null;
	let parserBabel = null;
	let dependenciesLoaded = false;

	// Lazy load dependencies when needed
	async function loadDependencies() {
		if (dependenciesLoaded) return;
		
		try {
			const terser = await loadTerser();
			minify = terser.minify;
			
			const prettierLib = await loadPrettier();
			prettier = prettierLib.prettier;
			parserBabel = prettierLib.parserBabel;
			
			dependenciesLoaded = true;
		} catch (error) {
			console.error('Failed to load dependencies:', error);
			error = 'Failed to load required libraries';
		}
	}

	// Initialize dependencies on first interaction
	async function initializeIfNeeded() {
		await loadDependencies();
	}

	let jsCode = '';
	let mode = 'original';
	let error = '';

	let removeComments = true;
	let removeWhitespace = true;
	let mangleNames = true;

	async function minifyJs() {
		try {
			error = '';
			await initializeIfNeeded();

			if (!jsCode.trim()) {
				error = 'Please enter JavaScript code';
				return;
			}

			const result = await minify(jsCode, {
				compress: {
					drop_console: false,
					drop_debugger: true,
					// Always enable basic compression for valid JS output
					collapse_vars: true,
					reduce_vars: true,
					sequences: true,
					join_vars: true,
					// Control whitespace removal
					dead_code: true,
					conditionals: true,
					evaluate: true,
					booleans: true,
					loops: true,
					unused: true,
					// ifs: true,
					inline: true,
					join_vars: true,
					collapse_vars: true,
					reduce_vars: true,
					passes: 2
				},
				mangle: mangleNames,
				format: {
					comments: removeComments ? false : 'some',
					quote_style: 1,
					// Ensure valid output for unminification
					semicolons: true,
					wrap_func_args: false,
					// Output formatting options
					ascii_only: false,
					beautify: false,
					// bracketize: false,
					indent_level: 0,
					indent_start: 0,
					keep_quoted_props: false,
					max_line_len: false,
					preamble: null,
					quote_keys: false,
					// preserve_line: false,
					shebang: true,
					wrap_iife: false
				}
			});

			if (!result?.code) {
				throw new Error('Failed to minify code');
			}

			jsCode = result.code;
			mode = 'minified';
		} catch (e) {
			error = `Minification error: ${e.message}`;
		}
	}

	async function unminifyJs() {
		try {
			error = '';
			await initializeIfNeeded();

			if (!jsCode.trim()) {
				error = 'Please enter JavaScript code';
				return;
			}

			const formatted = await prettier.format(jsCode, {
				parser: "babel",
				plugins: [parserBabel],
				semi: true,
				singleQuote: true,
				tabWidth: 2,
				useTabs: false
			});

			mode = 'unminified';
		} catch (e) {
			error = `Unminification error: ${e.message}`;
		}
	}

	function cleanCode() {
	try {
		error = '';

		if (!jsCode) return;

		jsCode = jsCode
			// normalize escaped literals
			.replace(/\\r\\n/g, '\n')
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\n')
			.replace(/\\t/g, '    ') // literal \t -> 4 spaces

			// normalize actual tabs
			.replace(/\t/g, '    ') // actual tab -> 4 spaces

			// normalize line endings
			.replace(/\r/g, '\n')
			.replace(/\\/g, '')

			// remove trailing spaces
			.split('\n')
			.map((line) => line.trimEnd())

			// optional: remove excessive leading spaces
			.map((line) => line.replace(/^[ ]{8,}/, (m) => ' '.repeat(Math.floor(m.length / 4) * 4)))

			.join('\n')

			// collapse excessive blank lines
			.replace(/\n{3,}/g, '\n\n')

			.trim();

		error = '';
	} catch (e) {
		error = `Cleaning error: ${e.message}`;
	}
}


	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(jsCode);
		} catch (e) {
			error = `Copy failed: ${e.message}`;
		}
	}

	function clearAll() {
		jsCode = '';
		error = '';
		mode = 'original';
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
						<div class="rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 p-3">
							<Icon icon="mdi-light:language-javascript" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
								JavaScript Minify/Unminify
							</h1>
							<p class="text-gray-600 mt-1">
								Minify, unminify, and clean JavaScript code with advanced options
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
		<section class="bg-white rounded-2xl shadow-xl border border-yellow-100 overflow-hidden">
			<div class="bg-gradient-to-r from-yellow-500 to-orange-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:toggle-switch" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Code Mode</h2>
					</div>
				</div>
			</div>
			<div class="p-6">
				<div class="flex justify-center">
					<div class="inline-flex rounded-xl bg-gray-100 p-1">
						<button
							on:click={() => (mode = 'original')}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'original'
								? 'bg-white text-yellow-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:file-document" class="h-4 w-4" />
								<span>Original</span>
							</span>
						</button>
						<button
							on:click={() => (mode = 'minified')}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'minified'
								? 'bg-white text-yellow-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:compress" class="h-4 w-4" />
								<span>Minified</span>
							</span>
						</button>
						<button
							on:click={() => (mode = 'unminified')}
							class="rounded-lg px-6 py-3 text-sm font-medium transition-all {mode === 'unminified'
								? 'bg-white text-yellow-600 shadow-md'
								: 'text-gray-600 hover:text-gray-800'}"
						>
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:expand" class="h-4 w-4" />
								<span>Unminified</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- Minify Options Section -->
		{#if mode === 'original'}
			<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
				<div class="bg-gradient-to-r from-orange-500 to-red-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Minification Options</h2>
					</div>
				</div>
				<div class="p-6 space-y-4">
					<label class="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 cursor-pointer hover:from-orange-100 hover:to-red-100 transition-all">
						<input
							type="checkbox"
							bind:checked={removeComments}
							class="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
						/>
						<div class="flex items-center space-x-3 flex-1">
							<Icon icon="mdi-light:comment-off" class="h-5 w-5 text-orange-600" />
							<span class="text-gray-800 font-medium">Remove Comments</span>
						</div>
					</label>
					<label class="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 cursor-pointer hover:from-orange-100 hover:to-red-100 transition-all">
						<input
							type="checkbox"
							bind:checked={removeWhitespace}
							class="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
						/>
						<div class="flex items-center space-x-3 flex-1">
							<Icon icon="mdi-light:format-text" class="h-5 w-5 text-orange-600" />
							<span class="text-gray-800 font-medium">Remove Whitespace</span>
						</div>
					</label>
					<label class="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 cursor-pointer hover:from-orange-100 hover:to-red-100 transition-all">
						<input
							type="checkbox"
							bind:checked={mangleNames}
							class="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
						/>
						<div class="flex items-center space-x-3 flex-1">
							<Icon icon="mdi-light:variable" class="h-5 w-5 text-orange-600" />
							<span class="text-gray-800 font-medium">Mangle Variable Names</span>
						</div>
					</label>
				</div>
			</section>
		{/if}

		<!-- Code Editor Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:code-braces" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">
							JavaScript Code ({mode === 'original'
								? 'Original'
								: mode === 'minified'
									? 'Minified'
									: 'Unminified'} Mode)
						</h2>
					</div>
					<div class="flex space-x-3">
						{#if mode === 'original'}
							<button
								on:click={minifyJs}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:compress" class="h-4 w-4" />
									<span>Minify</span>
								</span>
							</button>
						{:else if mode === 'minified'}
							<button
								on:click={unminifyJs}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:expand" class="h-4 w-4" />
									<span>Unminify</span>
								</span>
							</button>
						{/if}
						<button
							on:click={cleanCode}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:broom" class="h-4 w-4" />
								<span>Clean</span>
							</span>
						</button>
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
					bind:value={jsCode}
					placeholder="Enter JavaScript code to minify, unminify, or clean..."
					class="w-full h-96 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 resize-none"
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
