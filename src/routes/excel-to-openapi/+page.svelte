<script>
	import Icon from '@iconify/svelte';
	import 'swagger-ui-dist/swagger-ui.css';
	import { onMount } from 'svelte';
	import { loadSwaggerUI, loadXLSX, loadYAML } from '#lib/lazy-loads';
	import { confirmOnLeave } from '#lib/navigation-guard';
	import {
		readWorkbook,
		autoMapColumns,
		generateBuild,
		buildFreshSpec,
		mergeTemplateFields,
		detectVersion
	} from '#lib/plugin/openapi/index';
	import { COLUMN_ROLES } from '#lib/plugin/openapi/index';

	let XLSX = null;
	let yaml = null;
	let SwaggerUI = null;
	let dependenciesLoaded = false;

	let error = '';
	let yamlText = '';
	let fileName = 'openapi';
	let swaggerContainer;

	// Workbook state
	let workbook = null; // { sheetNames, sheets }
	let excelFile = null;
	let selectedSheet = '';
	let headerRow = 1; // 1-based

	// Column roles + row tagging
	let columnMap = {};
	let rowGroups = [];
	const GROUP_COLORS = {
		none: 'bg-gray-100 text-gray-600',
		header: 'bg-blue-100 text-blue-700',
		request: 'bg-green-100 text-green-700',
		response: 'bg-purple-100 text-purple-700'
	};

	// Spec options
	let version = '2.0';
	let apiName = '';
	let apiVersion = '1.0.0';
	let basePath = '';
	let apiPath = '/';
	let apiMethod = 'post';

	// Templates (each sheet maps to a template by name)
	let templates = [];
	let selectedTemplate = ''; // '' = generate fresh
	let templateFileInput;

	// localStorage key so uploaded templates can be re-chosen later
	const TEMPLATES_STORAGE_KEY = 'excel-to-openapi:templates';

	// UI
	let conflicts = [];
	let showGrid = false;

	// Derived for the grid (header labels + data rows)
	let headerNames = [];
	let gridRows = [];

	// Row multi-select (for bulk target changes)
	let selectedRows = [];
	let lastClickedIndex = null;

	// Per-column filter text (column index -> filter string)
	let columnFilters = {};

	async function loadDependencies() {
		if (dependenciesLoaded) return;
		try {
			XLSX = await loadXLSX();
			yaml = await loadYAML();
			SwaggerUI = await loadSwaggerUI();
			dependenciesLoaded = true;
		} catch (e) {
			console.error('Failed to load dependencies:', e);
			error = 'Failed to load required libraries';
		}
	}

	async function renderSwagger(spec) {
		await loadDependencies();
		if (!swaggerContainer) return;
		swaggerContainer.innerHTML = '';
		SwaggerUI({ domNode: swaggerContainer, spec });
	}

	// ---- Local template storage (persist uploaded OpenAPI templates) ----

	function readStoredTemplates() {
		try {
			const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
			if (!raw) return [];
			const entries = JSON.parse(raw);
			if (!Array.isArray(entries)) return [];
			return entries.filter(
				(entry) => entry && typeof entry.name === 'string' && entry.doc
			);
		} catch (e) {
			console.warn('Could not read stored templates:', e);
			return [];
		}
	}

	function persistTemplates() {
		try {
			localStorage.setItem(
				TEMPLATES_STORAGE_KEY,
				JSON.stringify(templates.map(({ name, doc }) => ({ name, doc })))
			);
		} catch (e) {
			// Non-fatal: quota exceeded or serialization issue.
			console.warn('Could not store templates locally:', e);
		}
	}

	function addTemplate(name, doc) {
		// Replace any existing template with the same name, else append.
		const existing = templates.some((t) => t.name === name);
		templates = existing
			? templates.map((t) => (t.name === name ? { name, doc } : t))
			: [...templates, { name, doc }];
		persistTemplates();
	}

	function removeTemplate(name) {
		templates = templates.filter((t) => t.name !== name);
		if (selectedTemplate === name) selectedTemplate = '';
		persistTemplates();
	}

	function handleExcelUpload(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		excelFile = file;
		fileName = file.name.replace(/\.[^.]+$/, '');
		loadDependencies().then(() => {
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					workbook = readWorkbook(XLSX, evt.target.result);
					error = '';
					if (workbook.sheetNames.length) {
						selectSheet(workbook.sheetNames[0]);
					}
				} catch (err) {
					error = 'Failed to read Excel file: ' + err.message;
					workbook = null;
				}
			};
			reader.readAsBinaryString(file);
		});
	}

	/** Choosing a sheet resets config and auto-detects the header + column roles. */
	function selectSheet(name) {
		selectedSheet = name;
		headerRow = 1;
		// Auto-match a template whose name matches the sheet (standard selection).
		const match = templates.find(
			(t) => t.name.toLowerCase() === String(name).toLowerCase()
		);
		selectedTemplate = match ? match.name : '';
		rebuildFromHeader();
	}

	/** Recompute header names, auto-map columns, and reset row tags. */
	function rebuildFromHeader() {
		if (!workbook || !selectedSheet) return;
		const sheet = workbook.sheets[selectedSheet] || [];
		const header = sheet[headerRow - 1] || [];
		headerNames = header.map((h, i) => String(h ?? '').trim() || `Column ${i + 1}`);
		gridRows = sheet.slice(headerRow);
		columnMap = autoMapColumns(header);
		rowGroups = gridRows.map(() => 'none');
		selectedRows = [];
		columnFilters = {};
		lastClickedIndex = null;
		showGrid = gridRows.length > 0;
	}

	function onHeaderRowChange() {
		rebuildFromHeader();
	}

	function setRole(role, colIndex) {
		const value = colIndex === '' ? null : Number(colIndex);
		// Ensure a column is not assigned to two roles.
		if (value !== null) {
			for (const other of COLUMN_ROLES) {
				if (other !== role && columnMap[other] === value) {
					columnMap[other] = null;
				}
			}
		}
		columnMap[role] = value;
		columnMap = { ...columnMap };
	}

	/** Rows that pass the per-column filters, as { row, index } pairs. */
	function getDisplayRows() {
		const active = Object.entries(columnFilters).filter(
			([, v]) => String(v ?? '').trim() !== ''
		);
		if (active.length === 0) {
			return gridRows.map((row, index) => ({ row, index }));
		}
		return gridRows
			.map((row, index) => ({ row, index }))
			.filter(({ row }) =>
				active.every(([c, filter]) =>
					String(row?.[Number(c)] ?? '')
						.toLowerCase()
						.includes(String(filter).trim().toLowerCase())
				)
			);
	}

	function isSelected(index) {
		return selectedRows.includes(index);
	}

	function toggleSelect(index, event) {
		let next = [...selectedRows];

		if (event?.shiftKey && lastClickedIndex !== null) {
			// Extend from the anchor to this row — but only across rows that are
			// currently visible (i.e. match the active filters), so filtering
			// never causes hidden/non-matching rows to be selected.
			const visible = getDisplayRows().map(({ index: i }) => i);
			const anchorPos = visible.indexOf(lastClickedIndex);
			const clickedPos = visible.indexOf(index);

			if (anchorPos !== -1 && clickedPos !== -1) {
				const start = Math.min(anchorPos, clickedPos);
				const end = Math.max(anchorPos, clickedPos);
				// Base the action on the anchor row's state: if it was selected we
				// select the whole visible range, otherwise we clear it.
				const shouldSelect = selectedRows.includes(lastClickedIndex);
				for (let pos = start; pos <= end; pos++) {
					const i = visible[pos];
					if (shouldSelect) {
						if (!next.includes(i)) next.push(i);
					} else {
						next = next.filter((n) => n !== i);
					}
				}
			} else {
				// Anchor or target is filtered out — fall back to a plain toggle.
				if (next.includes(index)) next = next.filter((n) => n !== index);
				else next.push(index);
			}
		} else if (next.includes(index)) {
			next = next.filter((n) => n !== index);
		} else {
			next.push(index);
		}

		selectedRows = next;
		lastClickedIndex = index;
	}

	function areAllVisibleSelected() {
		const visible = getDisplayRows();
		return (
			visible.length > 0 && visible.every(({ index }) => selectedRows.includes(index))
		);
	}

	function toggleSelectAllVisible() {
		const visible = getDisplayRows();
		if (areAllVisibleSelected()) {
			const visibleIdx = new Set(visible.map(({ index }) => index));
			selectedRows = selectedRows.filter((i) => !visibleIdx.has(i));
		} else {
			const next = [...selectedRows];
			visible.forEach(({ index }) => {
				if (!next.includes(index)) next.push(index);
			});
			selectedRows = next;
		}
	}

	function clearSelection() {
		selectedRows = [];
		lastClickedIndex = null;
	}

	/** Apply one target to every selected row in a single action. */
	function applyGroupToSelection(group) {
		if (!selectedRows.length) return;
		const next = [...rowGroups];
		selectedRows.forEach((i) => {
			if (i >= 0 && i < next.length) next[i] = group;
		});
		rowGroups = next;
	}

	function setColumnFilter(col, value) {
		columnFilters = { ...columnFilters, [col]: value };
	}

	function handleTemplateUpload(e) {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;
		loadDependencies().then(() => {
			let pending = files.length;
			files.forEach((file) => {
				const reader = new FileReader();
				reader.onload = (evt) => {
					try {
						const doc = yaml.load(evt.target.result);
						addTemplate(file.name.replace(/\.[^.]+$/, ''), doc);
						error = '';
						// If a sheet is already selected and matches, link it.
						if (
							selectedSheet &&
							file.name.replace(/\.[^.]+$/, '').toLowerCase() ===
								String(selectedSheet).toLowerCase()
						) {
							selectedTemplate = file.name.replace(/\.[^.]+$/, '');
						}
					} catch (err) {
						error = `Invalid YAML template "${file.name}": ${err.message}`;
					}
					if (--pending === 0) templateFileInput && (templateFileInput.value = '');
				};
				reader.readAsText(file);
			});
		});
	}

	async function generate() {
		await loadDependencies();
		error = '';
		conflicts = [];

		if (!workbook || !selectedSheet) {
			error = 'Please upload an Excel file and select a sheet';
			return;
		}

		const sheet = workbook.sheets[selectedSheet] || [];
		const header = sheet[headerRow - 1] || [];
		const dataRows = sheet.slice(headerRow);

		if (!columnMap.name) {
			error = 'Map a column to the "name" role (the property name).';
			return;
		}

		try {
			const templateEntry = templates.find((t) => t.name === selectedTemplate);
		// When merging into a template, build using the TEMPLATE's own version so
		// the internal $ref bases (definitions vs components/schemas) match.
		const effectiveVersion = templateEntry
			? detectVersion(templateEntry.doc)
			: version;
		const build = generateBuild({
			version: effectiveVersion,
			dataRows,
			rowGroups,
			columnMap
		});
			if (!build.present.header && !build.present.request && !build.present.response) {
				error = 'Tag at least one row as header, request, or response.';
				return;
			}

			const meta = {
				title: apiName || selectedSheet,
				apiVersion: apiVersion || '1.0.0',
				path: apiPath || '/',
				method: apiMethod,
				basePath
			};

			let spec;

			if (templateEntry) {
				// Surgical merge: only the request/response definitions and the
				// four metadata fields change; the rest of the template is kept.
				spec = mergeTemplateFields({
					template: structuredClone(templateEntry.doc),
					build,
					header: true,
					title: meta.title,
					xIbmName: meta.title.toLowerCase().replaceAll(' ', '-'),
					apiVersion: meta.apiVersion,
					basePath: meta.basePath
				});
			} else {
				spec = buildFreshSpec({ version, meta, build });
			}

			yamlText = yaml.dump(spec, { noRefs: true, lineWidth: 120 });
			setTimeout(() => renderSwagger(spec));
		} catch (err) {
			error = err.message;
		}
	}

	function downloadYaml() {
		if (!yamlText) return;
		const blob = new Blob([yamlText], { type: 'text/yaml' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${fileName || selectedSheet || 'openapi'}.yaml`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	/** True when the user has entered data worth warning about before leaving. */
	function hasUnsavedData() {
		// Note: the template library is persisted locally, so it is NOT treated
		// as unsaved work — only the current session's inputs/outputs are.
		return (
			Boolean(excelFile) ||
			Boolean(yamlText) ||
			Boolean(selectedSheet) ||
			apiName.trim() !== '' ||
			basePath.trim() !== '' ||
			(apiPath.trim() !== '' && apiPath !== '/')
		);
	}

	function reset() {
		if (hasUnsavedData() && !window.confirm('Reset all entered data? This cannot be undone.')) {
			return;
		}
		workbook = null;
		excelFile = null;
		selectedSheet = '';
		rowGroups = [];
		columnMap = {};
		selectedRows = [];
		columnFilters = {};
		// Keep the locally-stored template library available after a reset.
		templates = readStoredTemplates();
		selectedTemplate = '';
		apiName = '';
		apiVersion = '1.0.0';
		basePath = '';
		apiPath = '/';
		apiMethod = 'post';
		headerRow = 1;
		yamlText = '';
		showGrid = false;
		error = '';
		conflicts = [];
		lastClickedIndex = null;
	}

	onMount(() => {
		// Restore locally-stored OpenAPI templates so they can be re-chosen.
		templates = readStoredTemplates();

		// Warn before reload / back / forward / swipe / navigating away with
		// unsaved data. Registered during component init for beforeNavigate.
		confirmOnLeave(hasUnsavedData);
	});
</script>

<main class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
	<!-- Header -->
	<header class="bg-white shadow-lg border-b border-emerald-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center space-x-4">
				<button
					class="group rounded-full p-2 text-emerald-600 transition-all hover:bg-emerald-100 hover:scale-110"
					onclick={() => (location.href = '/')}
					aria-label="Back to home"
				>
					<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
				</button>
				<div class="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 p-3">
					<Icon icon="mdi-light:api" class="h-8 w-8 text-white" />
				</div>
				<div>
					<h1 class="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
						Excel to OpenAPI Generator
					</h1>
					<p class="text-gray-600 mt-1">
						Dynamically map any Excel sheet to OpenAPI/Swagger — choose the standard, header row, columns, and rows
					</p>
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
		<!-- Step 1: Upload -->
		<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
			<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:file-upload" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">1 · Upload Files</h2>
				</div>
			</div>
			<div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label for="excel-workbook" class="block text-sm font-medium text-gray-700 mb-2">Excel Workbook (.xlsx)</label>
					<input
						id="excel-workbook"
						type="file"
						accept=".xlsx,.xls"
						onchange={handleExcelUpload}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
					/>
				</div>
				<div>
					<label for="openapi-templates" class="block text-sm font-medium text-gray-700 mb-2">
						OpenAPI Templates (optional · matched to sheets by name)
					</label>
					<input
						id="openapi-templates"
						type="file"
						accept=".yaml,.yml"
						multiple
						bind:this={templateFileInput}
						onchange={handleTemplateUpload}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
					/>
					{#if templates.length}
						<div class="mt-2">
							<p class="text-xs text-gray-500 mb-1">
								Saved in this browser — re-choose anytime from the template dropdown below.
							</p>
							<div class="flex flex-wrap gap-2">
								{#each templates as t (t.name)}
									<span class="inline-flex items-center gap-1 pl-2 pr-1 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
										{t.name}
										<button
											type="button"
											aria-label="Remove template {t.name}"
											onclick={() => removeTemplate(t.name)}
											class="ml-1 rounded-full hover:bg-emerald-200 p-0.5 leading-none"
										>
											<Icon icon="mdi-light:close" class="h-3.5 w-3.5" />
										</button>
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Step 2: Standard + Header row -->
		{#if workbook}
			<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">2 · Standard &amp; Header Row</h2>
					</div>
				</div>
				<div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div>
						<label for="sheet-select" class="block text-sm font-medium text-gray-700 mb-2">Sheet (standard source)</label>
						<select
							id="sheet-select"
							bind:value={selectedSheet}
							onchange={() => selectSheet(selectedSheet)}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
						>
							{#each workbook.sheetNames as name}
								<option value={name}>{name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="header-row" class="block text-sm font-medium text-gray-700 mb-2">Header Row</label>
						<input
							id="header-row"
							type="number"
							min="1"
							bind:value={headerRow}
							onchange={onHeaderRowChange}
							oninput={onHeaderRowChange}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
						/>
					</div>
					<div>
						<label for="template-select" class="block text-sm font-medium text-gray-700 mb-2">OpenAPI Template (standard)</label>
						<select
							id="template-select"
							bind:value={selectedTemplate}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
						>
							<option value="">— Generate fresh —</option>
							{#each templates as t}
								<option value={t.name}>{t.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="spec-version" class="block text-sm font-medium text-gray-700 mb-2">Spec Version (fresh)</label>
						<select
							id="spec-version"
							bind:value={version}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
						>
							<option value="2.0">Swagger 2.0</option>
							<option value="3.0">OpenAPI 3.0</option>
						</select>
					</div>
				</div>
			</section>
		{/if}

		<!-- Step 3: Column role mapping -->
		{#if workbook && selectedSheet}
			<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:table-column" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">3 · Column Roles</h2>
					</div>
				</div>
				<div class="p-6">
					<p class="text-sm text-gray-600 mb-4">
						Auto-detected from header row {headerRow}. Each column maps to one role — the property <strong>name</strong> is required.
					</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{#each COLUMN_ROLES as role}
							<div>
								<label for="role-{role}" class="block text-sm font-medium text-gray-700 mb-2 capitalize">{role}</label>
								<select
									id="role-{role}"
									value={columnMap[role] ?? ''}
									onchange={(e) => setRole(role, e.target.value)}
									class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
								>
									<option value="">— none —</option>
									{#each headerNames as label, idx}
										<option value={idx}>{label}</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Step 4: Tag rows -->
		{#if workbook && selectedSheet && showGrid}
			<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:tag" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">4 · Tag Rows</h2>
					</div>
				</div>
				<div class="p-6">
					<p class="text-sm text-gray-600 mb-4">
						Tick rows to select them. <strong>Hold <kbd>Shift</kbd> and click</strong> another checkbox to
						select (or clear) the whole range from the last one you clicked. Then use the
						<strong>Set selected to</strong> buttons to retag them all in one action. Use the filter
						row under each header to narrow the list. Only tagged rows become properties in that section.
					</p>
					<!-- Bulk actions -->
					<div class="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
						<span class="text-sm font-medium text-emerald-800">
							{selectedRows.length} row{selectedRows.length === 1 ? '' : 's'} selected
						</span>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-sm text-gray-600">Set selected to:</span>
							{#each ['header', 'request', 'response'] as group}
								<button
									type="button"
									onclick={() => applyGroupToSelection(group)}
									disabled={selectedRows.length === 0}
									class="px-3 py-1 text-xs font-semibold capitalize rounded-full transition-transform {selectedRows.length
										? GROUP_COLORS[group] + ' hover:scale-105'
										: 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
								>
									{group}
								</button>
							{/each}
							<button
								type="button"
								onclick={() => applyGroupToSelection('none')}
								disabled={selectedRows.length === 0}
								class="px-3 py-1 text-xs font-semibold rounded-full transition-transform {selectedRows.length
									? GROUP_COLORS.none + ' hover:scale-105'
									: 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
							>
								clear
							</button>
						</div>
						<button
							type="button"
							onclick={clearSelection}
							class="ml-auto px-3 py-1 text-xs rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
						>
							Clear selection
						</button>
					</div>

					<div class="overflow-x-auto rounded-xl border border-gray-200">
						<table class="min-w-full text-sm">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-3 py-2 border-b w-10">
										<input
											type="checkbox"
											aria-label="Select all visible rows"
											checked={areAllVisibleSelected()}
											onchange={toggleSelectAllVisible}
											class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
										/>
									</th>
									<th class="px-3 py-2 text-left font-semibold text-gray-700 border-b">Row</th>
									<th class="px-3 py-2 text-left font-semibold text-gray-700 border-b">Target</th>
									{#each headerNames as label, c}
										<th class="px-3 py-2 text-left font-semibold text-gray-700 border-b whitespace-nowrap max-w-[180px]">
											<div class="truncate" title={label}>{label}</div>
											<input
												type="text"
												aria-label="Filter column {label}"
												placeholder="Filter…"
												value={columnFilters[c] ?? ''}
												oninput={(e) => setColumnFilter(c, e.target.value)}
												class="mt-1 w-full px-2 py-1 text-xs font-normal border border-gray-200 rounded focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
											/>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each getDisplayRows() as { row, index }}
									<tr class="border-b hover:bg-emerald-50/40 {rowGroups[index] !== 'none' ? 'bg-emerald-50/30' : ''}">
										<td class="px-3 py-2">
											<input
												type="checkbox"
												aria-label="Select row {headerRow + index + 1}"
												checked={isSelected(index)}
												onchange={(e) => toggleSelect(index, e)}
												class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
											/>
										</td>
										<td class="px-3 py-2 text-gray-500">{headerRow + index + 1}</td>
										<td class="px-3 py-2">
											<select
												aria-label="Target for row {headerRow + index + 1}"
												value={rowGroups[index]}
												onchange={(e) => {
													const next = [...rowGroups];
													next[index] = e.target.value;
													rowGroups = next;
												}}
												class="px-2 py-1 text-xs font-semibold capitalize rounded-full border-0 {GROUP_COLORS[rowGroups[index]]} focus:ring-2 focus:ring-emerald-300"
											>
												{#each ['none', 'header', 'request', 'response'] as g}
													<option value={g}>{g}</option>
												{/each}
											</select>
										</td>
										{#each headerNames as _label, c}
											<td class="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[220px] truncate" title={String(row[c] ?? '')}>
												{String(row[c] ?? '')}
											</td>
										{/each}
									</tr>
								{:else}
									<tr>
										<td colspan="{headerNames.length + 3}" class="px-3 py-6 text-center text-gray-500">
											No rows match the current filters.
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		{/if}

		<!-- Step 5: API meta + actions -->
		{#if workbook && selectedSheet}
			<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:play" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">5 · API Details &amp; Generate</h2>
					</div>
				</div>
				<div class="p-6 space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="md:col-span-2">
							<label for="api-title" class="block text-sm font-medium text-gray-700 mb-2">API Title</label>
							<input id="api-title" type="text" bind:value={apiName} placeholder={selectedSheet}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
						</div>
						<div>
							<label for="api-version" class="block text-sm font-medium text-gray-700 mb-2">API Version</label>
							<input id="api-version" type="text" bind:value={apiVersion}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
						</div>
						<div>
							<label for="base-path" class="block text-sm font-medium text-gray-700 mb-2">Base Path</label>
							<input id="base-path" type="text" bind:value={basePath} placeholder="/v1/service"
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="md:col-span-2">
							<label for="api-path" class="block text-sm font-medium text-gray-700 mb-2">Path</label>
							<input id="api-path" type="text" bind:value={apiPath} placeholder="/"
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
						</div>
						<div>
							<label for="api-method" class="block text-sm font-medium text-gray-700 mb-2">Method</label>
							<select id="api-method" bind:value={apiMethod}
								class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100">
								<option value="post">POST</option>
								<option value="get">GET</option>
								<option value="put">PUT</option>
								<option value="patch">PATCH</option>
								<option value="delete">DELETE</option>
							</select>
						</div>
						<div class="flex items-end gap-3">
							<button onclick={generate}
								class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 flex-1 text-sm font-semibold text-white transition-all hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg">
								<span class="relative z-10 flex items-center justify-center space-x-2">
									<Icon icon="mdi-light:play" class="h-4 w-4" />
									<span>Generate OpenAPI</span>
								</span>
							</button>
							<button onclick={reset} type="button"
								class="rounded-lg border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:border-gray-400">
								<span class="flex items-center justify-center space-x-2">
									<Icon icon="mdi-light:refresh" class="h-4 w-4" />
									<span>Reset</span>
								</span>
							</button>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Error -->
		{#if error}
			<section class="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl shadow-xl border border-red-100 overflow-hidden">
				<div class="bg-gradient-to-r from-red-500 to-rose-500 p-4">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:alert" class="h-5 w-5 text-white" />
						<h3 class="text-lg font-bold text-white">Error</h3>
					</div>
				</div>
				<div class="p-6">
					<p class="text-red-800 font-medium">{error}</p>
				</div>
			</section>
		{/if}

		<!-- Results -->
		{#if yamlText}
			<section class="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Results</h2>
						</div>
						<button onclick={downloadYaml}
							class="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30">
							<span class="flex items-center space-x-2">
								<Icon icon="mdi-light:download" class="h-4 w-4" />
								<span>Download YAML</span>
							</span>
						</button>
					</div>
				</div>
				<div class="p-6 space-y-6">
					{#if conflicts.length}
						<div class="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
							<h4 class="font-semibold text-yellow-800 mb-2">Conflicts detected:</h4>
							<ul class="list-disc pl-5 space-y-1">
								{#each conflicts as c}
									<li class="text-yellow-700 text-sm">{c.message}</li>
								{/each}
							</ul>
						</div>
					{/if}
					<div>
						<h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
							<Icon icon="mdi-light:code-json" class="h-5 w-5 text-emerald-600" />
							<span>{fileName || selectedSheet}.yaml</span>
						</h3>
						<textarea readonly bind:value={yamlText}
							class="w-full h-96 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 resize-none"></textarea>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
							<Icon icon="mdi-light:eye" class="h-5 w-5 text-emerald-600" />
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
