<script>
	import Icon from '@iconify/svelte';
	import 'swagger-ui-dist/swagger-ui.css';
	import { loadSwaggerUI, loadXLSX, loadYAML } from '$lib/lazy-loads';
	import { buildSwagger } from '$lib/plugin/swagger/builder';
	import { cleanupSwagger } from '$lib/plugin/swagger/cleanupSwagger';
	import { applyExcelToSwagger } from '$lib/plugin/swagger/applyExcelToSwagger';
	import { updateSwaggerFromForm } from '$lib/plugin/swagger/updateSwaggerFromForm';

	// Lazy loaded dependencies
	let XLSX = null;
	let yaml = null;
	let SwaggerUI = null;

	let error = '';
	let yamlText = '';
	let fileName = '';
	let apiName = '';
	let apiVersion = '';
	let businessService = '';
	let serviceCode = '';
	let serviceVersion = '';
	let providerSystem = '';
	let sourceSystem = '';
	let basePath = '';
	let queueName = '';
	let swaggerContainer;
	let sheetName = 'Transfer SKN Redirect';
	let selectedFile = null;
	let headerRow = 2;
	let selectedColumns = 'A,B,C,D,L';
	let selectType = '';

	let swaggerTemplate = null;
	let swaggerTemplateText = '';
	let swaggerTemplateFile = null;

	let selectedPath = '';
	let selectedMethod = 'post';

	let conflicts = [];
	let dependenciesLoaded = false;

	// Lazy load dependencies when needed
	async function loadDependencies() {
		if (dependenciesLoaded) return;
		
		try {
			XLSX = await loadXLSX();
			yaml = await loadYAML();
			SwaggerUI = await loadSwaggerUI();
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

	function toCamelCase(str) {
		return str
			.replace(/[^a-zA-Z0-9]/g, ' ')
			.split(' ')
			.filter((word) => word)
			.map((word, index) =>
				index === 0
					? word.toLowerCase()
					: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
			)
			.join('');
	}

	async function renderSwagger(swagger) {
		await initializeIfNeeded(); // Ensure dependencies are loaded
		
		if (!swaggerContainer) return;
		swaggerContainer.innerHTML = '';
		SwaggerUI({
			domNode: swaggerContainer,
			spec: swagger
		});
	}

	async function processSwaggerTemplate(file) {
		await initializeIfNeeded(); // Ensure dependencies are loaded
		
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				swaggerTemplateText = e.target.result;
				swaggerTemplate = yaml.load(swaggerTemplateText);
				error = null;

				console.log('swaggerTemplate', swaggerTemplate);
			} catch (err) {
				error = 'Invalid Swagger YAML';
			}
		};
		reader.readAsText(file);
	}

	async function processExcel() {
		await initializeIfNeeded(); // Ensure dependencies are loaded
		
		if (!sheetName.trim()) {
			error = 'Sheet name is required';
			return;
		}
		if (!selectedFile) {
			error = 'Please select a file';
			return;
		}
		const reader = new FileReader();

		reader.onload = async (evt) => {
			const wb = XLSX.read(evt.target.result, { type: 'binary' });
			if (!wb.SheetNames.includes(sheetName)) {
				error = `Sheet "${sheetName}" not found. Available sheets: ${wb.SheetNames.join(', ')}`;
				return;
			}
			fileName = sheetName;

			let maxR = 0,
				maxC = 0;
			for (let cell in wb.Sheets[sheetName]) {
				if (cell[0] === '!') continue;
				const addr = XLSX.utils.decode_cell(cell);
				if (addr.r > maxR) maxR = addr.r;
				if (addr.c > maxC) maxC = addr.c;
			}
			let columnIndices = [];
			if (selectedColumns.trim()) {
				columnIndices = selectedColumns
					.split(',')
					.map((c) => c.trim())
					.filter((c) => c)
					.map((c) => {
						try {
							return XLSX.utils.decode_col(c);
						} catch {
							error = `Invalid column: ${c}`;
							return null;
						}
					})
					.filter((i) => i !== null);
				if (error) return;
			} else {
				for (let C = 0; C <= maxC; ++C) columnIndices.push(C);
			}
			const aoa = [];
			for (let R = 0; R <= maxR; ++R) {
				const row = [];
				for (let C of columnIndices) {
					const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
					const cell = wb.Sheets[sheetName][cell_ref];
					row.push(cell ? cell.v : '');
				}
				aoa.push(row);
			}
			if (headerRow > aoa.length || headerRow < 1) {
				error = `Header row ${headerRow} is out of range. Sheet has ${aoa.length} rows.`;
				return;
			}
			const header = aoa[headerRow - 1];
			const dataRows = aoa.slice(headerRow - 1);
			const rows = dataRows.map((row) => {
				const obj = {};
				header.forEach((h, i) => {
					obj[toCamelCase(h) || `column${i + 1}`] = row[i] || '';
				});
				return obj;
			});

			const excelSwagger = buildSwagger(rows);
			cleanupSwagger(excelSwagger);
			if (!swaggerTemplate) {
				yamlText = yaml.dump(excelSwagger, { noRefs: true, lineWidth: 120 });
				setTimeout(() => renderSwagger(excelSwagger));
				return;
			}

			conflicts = [];

			const mergedSwagger = applyExcelToSwagger({
				templateSwagger: structuredClone(swaggerTemplate),
				excelSwagger: excelSwagger,
				path: selectedPath,
				method: selectedMethod,
				conflicts
			});

			updateSwaggerFromForm(mergedSwagger, {
				title: apiName,
				titleName: apiName.toLocaleLowerCase().replaceAll(" ", "-"),
				apiVersion: apiVersion,
				serviceName:businessService,
				serviceVersion: serviceVersion,
				serviceCode: serviceCode,
				sourceSystem: sourceSystem,
				providerSystem: providerSystem,
				queueName: queueName,
				basePath: basePath
			})

			cleanupSwagger(mergedSwagger);

			try {
				yamlText = yaml.dump(mergedSwagger, {
					noRefs: true,
					lineWidth: 120
				});

				setTimeout(() => renderSwagger(mergedSwagger));
				error = null;
			} catch (err) {
				error = err.message;
			}
		};

		reader.readAsBinaryString(selectedFile);
	}

	function downloadYaml() {
		const blob = new Blob([yamlText], { type: 'text/yaml' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = fileName + '.yaml';
		a.click();
	}

	function handleOnChange(e) {
		if (selectType == 'internal') {
			if (e.target.id == 'serviceVersion' || e.target.id == 'businessService') {
				basePath = `V${serviceVersion}/${businessService}`
			}
		} else if (selectType == 'external') {
			if (e.target.id == '' || e.target.id == 'apiVersion') {
				basePath = `v${apiVersion.split(".")[0]}.${apiVersion.split(".")[1]}/`
			}
		}
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
						<div class="rounded-full bg-gradient-to-r from-orange-500 to-red-500 p-3">
							<Icon icon="mdi-light:api" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
								IDM to Swagger Converter
							</h1>
							<p class="text-gray-600 mt-1">
								Convert Excel IDM specifications to Swagger/OpenAPI documentation
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
	<!-- File Upload Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-red-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:file-upload" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">File Upload</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="yaml" class="block text-sm font-medium text-gray-700 mb-2">
							Swagger Template (optional)
						</label>
						<div class="relative">
							<input
								id="yaml"
								type="file"
								accept=".yaml,.yml"
								on:change={(e) => {
									swaggerTemplateFile = e.target.files[0];
									processSwaggerTemplate(swaggerTemplateFile);
								}}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
							/>
						</div>
					</div>
					<div>
						<label for="idm" class="block text-sm font-medium text-gray-700 mb-2">
							IDM Excel Template
						</label>
						<div class="relative">
							<input
								type="file"
								id="idm"
								accept=".xlsx"
								on:change={(e) => (selectedFile = e.target.files[0])}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
							/>
						</div>
					</div>
				</div>
				{#if swaggerTemplate}
					<div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">Template Configuration</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="selectedPath" class="block text-sm font-medium text-gray-700 mb-2">API Path</label>
								<select 
									id="selectedPath" 
									class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" 
									bind:value={selectedPath}
								>
									<option value="">-- Select Path --</option>
									{#each Object.keys(swaggerTemplate.paths || {}) as p}
										<option value={p}>{p}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="selectedMethod" class="block text-sm font-medium text-gray-700 mb-2">HTTP Method</label>
								<select
									id="selectedMethod"
									class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
									bind:value={selectedMethod}
								>
									<option value="post">POST</option>
									<option value="put">PUT</option>
									<option value="patch">PATCH</option>
								</select>
							</div>
						</div>
					</div>
				{/if}
				<!-- Excel Configuration -->
				<div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">Excel Configuration</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label for="headerRow" class="block text-sm font-medium text-gray-700 mb-2">
								Header Row Number
							</label>
							<input
								type="number"
								id="headerRow"
								bind:value={headerRow}
								min="1"
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
							/>
						</div>
						<div>
							<label for="selectedColumns" class="block text-sm font-medium text-gray-700 mb-2">
								Selected Columns (e.g., A,B,C)
							</label>
							<input
								type="text"
								id="selectedColumns"
								bind:value={selectedColumns}
								placeholder="A,B,C,D,L"
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
							/>
						</div>
						<div>
							<label for="sheetName" class="block text-sm font-medium text-gray-700 mb-2">
								Sheet Name (required)
							</label>
							<input
								type="text"
								id="sheetName"
								placeholder="Sheet name"
								bind:value={sheetName}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
			<!-- API Configuration Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-red-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">API Configuration</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label for="selectType" class="block text-sm font-medium text-gray-700 mb-2">API Type</label>
						<select
							id="selectType"
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
							bind:value={selectType}
						>
							<option value="">-- Select Type --</option>
							<option value="internal">Internal</option>
							<option value="external">External</option>
						</select>
					</div>
					<div class="md:col-span-2">
						<label for="apiName" class="block text-sm font-medium text-gray-700 mb-2">
							API Name (required)
						</label>
						<input
							type="text"
							id="apiName"
							placeholder="API Name"
							bind:value={apiName}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="apiVersion" class="block text-sm font-medium text-gray-700 mb-2">
							API Version (required)
						</label>
						<input
							type="text"
							id="apiVersion"
							placeholder="API Version"
							bind:value={apiVersion}
							on:input={(e) => { handleOnChange(e) }}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div class="md:col-span-2">
						<label for="businessService" class="block text-sm font-medium text-gray-700 mb-2">
							Business Service (required)
						</label>
						<input
							type="text"
							id="businessService"
							placeholder="Business Service"
							bind:value={businessService}
							on:input={(e) => { handleOnChange(e) }}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="serviceVersion" class="block text-sm font-medium text-gray-700 mb-2">
							Service Version (required)
						</label>
						<input
							type="text"
							id="serviceVersion"
							placeholder="Service Version"
							bind:value={serviceVersion}
							on:input={(e) => { handleOnChange(e) }}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="serviceCode" class="block text-sm font-medium text-gray-700 mb-2">
							Service Code (required)
						</label>
						<input
							type="text"
							id="serviceCode"
							placeholder="Service Code"
							bind:value={serviceCode}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label for="sourceSystem" class="block text-sm font-medium text-gray-700 mb-2">
							Source System
						</label>
						<input
							type="text"
							id="sourceSystem"
							placeholder="Source System"
							bind:value={sourceSystem}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="providerSystem" class="block text-sm font-medium text-gray-700 mb-2">
							Provider System
						</label>
						<input
							type="text"
							id="providerSystem"
							placeholder="Provider System"
							bind:value={providerSystem}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="queueName" class="block text-sm font-medium text-gray-700 mb-2">Queue Name</label>
						<input
							type="text"
							id="queueName"
							placeholder="Queue Name"
							bind:value={queueName}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
					<div>
						<label for="basePath" class="block text-sm font-medium text-gray-700 mb-2">
							Base Path (required)
						</label>
						<input
							type="text"
							id="basePath"
							placeholder="Base Path"
							bind:value={basePath}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
						/>
					</div>
				</div>
			</div>
		</section>
			<!-- Action Buttons Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
			<div class="bg-gradient-to-r from-orange-500 to-red-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:play" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Actions</h2>
				</div>
			</div>
			<div class="p-6">
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						on:click={processExcel}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-red-600 hover:shadow-lg"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:play" class="h-4 w-4" />
							<span>Process Excel</span>
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
		{#if yamlText}
			<section class="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
				<div class="bg-gradient-to-r from-orange-500 to-red-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Results</h2>
						</div>
						<button
							on:click={downloadYaml}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:download" class="h-4 w-4" />
								<span>Download YAML</span>
							</span>
						</button>
					</div>
				</div>
				<div class="p-6 space-y-6">
					{#if conflicts.length}
						<div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
							<div class="flex items-start space-x-3">
								<Icon icon="mdi-light:alert-triangle" class="h-5 w-5 text-yellow-600 mt-0.5" />
								<div>
									<h4 class="font-semibold text-yellow-800 mb-2">Conflicts detected:</h4>
									<ul class="list-disc pl-5 space-y-1">
										{#each conflicts as c}
											<li class="text-yellow-700 text-sm">{c.message}</li>
										{/each}
									</ul>
								</div>
							</div>
						</div>
					{/if}

					<!-- YAML Preview -->
					<div>
						<h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
							<Icon icon="mdi-light:code-json" class="h-5 w-5 text-orange-600" />
							<span>{fileName}.yaml</span>
						</h3>
						<textarea
							readonly
							class="w-full h-96 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100 resize-none"
							bind:value={yamlText}
						></textarea>
					</div>

					<!-- Swagger Preview -->
					<div>
						<h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
							<Icon icon="mdi-light:eye" class="h-5 w-5 text-orange-600" />
							<span>Swagger Preview</span>
						</h3>
						<div class="w-full rounded-xl border-2 border-gray-200 overflow-hidden">
							<div bind:this={swaggerContainer} class="min-h-[600px]"></div>
						</div>
					</div>
				</div>
			</section>
		{/if}
	</div>
</main>
