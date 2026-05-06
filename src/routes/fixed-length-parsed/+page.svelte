<script>
	import Icon from "@iconify/svelte";

	let fixedText = '';
	let fields = [];
	let parsedData = [];
	let error = '';

	// Reactive: auto-parse when fields or fixedText changes (after initial parse)
	// But only if we have data and fields
	$: if (autoParseEnabled && fixedText.trim() && fields.length > 0) {
		autoParse();
	}

	// Flag to enable reactive parsing AFTER first manual parse
	let autoParseEnabled = false;

	function addField() {
		fields = [...fields, { name: '', length: 10 }];
	}

	function removeField(index) {
		fields = fields.filter((_, i) => i !== index);
	}

	function updateField(index, key, value) {
		const newFields = [...fields];
		newFields[index][key] = key === 'length' ? Number(value) || 0 : value;
		fields = newFields;
	}

	// Manual parse (enables auto-parse mode)
	function parseText() {
		error = '';
		autoParseEnabled = false; // will re-enable after success
		const totalLength = fields.reduce((sum, f) => sum + f.length, 0);
		if (totalLength === 0 || fields.some((f) => !f.name.trim())) {
			error = 'All fields must have a name and valid length.';
			return;
		}

		const lines = fixedText.split('\n').filter((line) => line.length >= totalLength);

		if (lines.length === 0) {
			error = `No line has ≥${totalLength} characters.`;
			return;
		}

		const results = parseLines(lines, fields, totalLength);
		parsedData = results;
		autoParseEnabled = true; // enable reactive updates
	}

	// Reusable parser
	function parseLines(lines, fields, totalLength) {
		return lines.map((line) => {
			const record = line.substring(0, totalLength);
			let pos = 0;
			const raw = {};
			const value = {};
			for (const field of fields) {
				const rawVal = record.substring(pos, pos + field.length);
				raw[field.name] = rawVal;
				value[field.name] = rawVal.trim();
				pos += field.length;
			}
			return { raw, value };
		});
	}

	// Auto-detect fields from first line
	function autoDetectFields() {
		error = '';
		const lines = fixedText.split('\n').filter((line) => line.trim() !== '');
		if (lines.length === 0) {
			error = 'No data to analyze.';
			return;
		}

		const firstLine = lines[0];
		const totalLength = firstLine.length;

		// Find all non-space segments with index
		const segments = [];
		let i = 0;
		while (i < totalLength) {
			if (firstLine[i] !== ' ') {
				let start = i;
				while (i < totalLength && firstLine[i] !== ' ') {
					i++;
				}
				segments.push({ start, end: i });
			} else {
				i++;
			}
		}

		if (segments.length === 0) {
			error = 'No non-space content found.';
			return;
		}

		// Build fields: each field spans from segment start to next segment start (or end)
		const newFields = [];
		for (let idx = 0; idx < segments.length; idx++) {
			const seg = segments[idx];
			const nextStart = idx + 1 < segments.length ? segments[idx + 1].start : totalLength;
			const length = nextStart - seg.start;

			// Extract raw value for naming hint (optional)
			const rawValue = firstLine.substring(seg.start, nextStart).trim();
			const fieldName =
				rawValue && rawValue.length <= 20
					? rawValue.toLowerCase().replace(/[^a-z0-9]/g, '_')
					: `field_${idx + 1}`;

			newFields.push({
				name: fieldName || `field_${idx + 1}`,
				length
			});
		}

		fields = newFields;
		// Auto-parse after detection
		const validLines = lines.filter((line) => line.length >= totalLength);
		parsedData = parseLines(validLines, newFields, totalLength);
		autoParseEnabled = true;
	}

	// Reactive auto-parse (used when fields change after initial parse)
	function autoParse() {
		const totalLength = fields.reduce((sum, f) => sum + f.length, 0);
		if (totalLength === 0) return;

		const lines = fixedText.split('\n').filter((line) => line.length >= totalLength);

		if (lines.length === 0) {
			parsedData = [];
			return;
		}

		parsedData = parseLines(lines, fields, totalLength);
	}

	// Export functions (use parsedData.value)
	function exportJSON() {
		if (parsedData.length === 0) return;
		const data = parsedData.map((r) => r.value);
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'parsed_data.json';
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function exportCSV() {
		if (parsedData.length === 0) return;
		const data = parsedData.map((r) => r.value);
		const headers = Object.keys(data[0]);
		const rows = data.map((obj) =>
			headers
				.map((h) => {
					const v = (obj[h] ?? '').toString();
					return v.includes(',') || v.includes('"') || v.includes('\n')
						? `"${v.replace(/"/g, '""')}"`
						: v;
				})
				.join(',')
		);
		const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'parsed_data.csv';
		a.click();
		URL.revokeObjectURL(a.href);
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
						on:click={() => {location.href = "/"}}
					>
						<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 p-3">
							<Icon icon="mdi-light:format-align-left" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
								Fixed-Length Data Parser
							</h1>
							<p class="text-gray-600 mt-1">
								Parse fixed-width text files with customizable field definitions
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
		<section class="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:file-document-edit" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Input Data</h2>
					</div>
					<div class="text-sm text-white/80">
						{#if fixedText}
							Length: {fixedText
								.split('\n')
								.filter((l) => l.trim())
								.map((l) => l.length)
								.join(', ')}
						{:else}
							No data loaded
						{/if}
					</div>
				</div>
			</div>
			<div class="p-6">
				<textarea
					bind:value={fixedText}
					placeholder="Paste your fixed-length record(s)..."
					class="w-full h-40 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
				></textarea>
			</div>
		</section>

		<!-- Field Definitions Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
			<div class="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:format-list-bulleted" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Field Definitions</h2>
					</div>
					<div class="flex space-x-3">
						<button
							on:click={autoDetectFields}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:magnify" class="h-4 w-4" />
								<span>Auto-Detect Fields</span>
							</span>
						</button>
						<button
							on:click={addField}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:plus" class="h-4 w-4" />
								<span>Add Field</span>
							</span>
						</button>
					</div>
				</div>
			</div>
			<div class="p-6 space-y-4">
				<div class="space-y-3">
					{#each fields as field, i (i)}
						<div class="flex gap-3">
							<input
								type="text"
								placeholder="Field name"
								value={field.name}
								on:input={(e) => updateField(i, 'name', e.target.value)}
								class="flex-1 rounded-xl border-2 border-gray-200 p-3 text-sm transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
							/>
							<input
								type="number"
								min="1"
								value={field.length}
								on:input={(e) => updateField(i, 'length', e.target.value)}
								class="w-32 rounded-xl border-2 border-gray-200 p-3 text-sm transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
							/>
							<button
								on:click={() => removeField(i)}
								class="group rounded-xl bg-gradient-to-r from-red-500 to-rose-500 p-3 text-white transition-all hover:from-red-600 hover:to-rose-600 hover:scale-105"
							>
								<Icon icon="mdi-light:delete" class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
				<div class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
					<div class="flex items-center space-x-2">
						<Icon icon="mdi-light:information" class="h-5 w-5 text-purple-600" />
						<p class="text-sm font-medium text-purple-800">
							Total configured length: <span class="font-bold">{fields.reduce((sum, f) => sum + f.length, 0)} chars</span>
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Action Buttons -->
		<div class="flex flex-wrap gap-4">
			<button
				on:click={parseText}
				class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 text-sm font-semibold text-white transition-all hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl"
			>
				<span class="relative z-10 flex items-center space-x-2">
					<Icon icon="mdi-light:play" class="h-4 w-4" />
					<span>Parse Data</span>
				</span>
			</button>

			{#if parsedData.length > 0}
				<button
					on:click={exportJSON}
					class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl"
				>
					<span class="relative z-10 flex items-center space-x-2">
						<Icon icon="mdi-light:code-json" class="h-4 w-4" />
						<span>Export JSON</span>
					</span>
				</button>
				<button
					on:click={exportCSV}
					class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-teal-600 hover:to-cyan-600 shadow-lg hover:shadow-xl"
				>
					<span class="relative z-10 flex items-center space-x-2">
						<Icon icon="mdi-light:table" class="h-4 w-4" />
						<span>Export CSV</span>
					</span>
				</button>
			{/if}
		</div>

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

		<!-- Parsed Preview Section -->
		{#if parsedData.length > 0}
			<section class="bg-white rounded-2xl shadow-xl border border-green-100 overflow-hidden">
				<div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:table-eye" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Parsed Data Preview</h2>
					</div>
				</div>
				<div class="p-6 space-y-6">
					{#each parsedData as record, recordIndex}
						<div class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
							{#if parsedData.length > 1}
								<div class="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-3 font-medium text-gray-800">
									<div class="flex items-center space-x-2">
										<Icon icon="mdi-light:file-document" class="h-4 w-4" />
										<span>Record #{recordIndex + 1}</span>
									</div>
								</div>
							{/if}
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
								<thead class="bg-gradient-to-r from-gray-50 to-gray-100">
									<tr>
										<th class="px-6 py-3 text-left font-medium text-gray-700">#</th>
										<th class="px-6 py-3 text-left font-medium text-gray-700">Field</th>
										<th class="px-6 py-3 text-left font-medium text-gray-700">Length</th>
										<th class="px-6 py-3 text-left font-medium text-gray-700">Value Raw</th>
										<th class="px-6 py-3 text-left font-medium text-gray-700">Value</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each fields as field, fieldIndex (fieldIndex)}
										<tr class="{fieldIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors">
											<td class="px-6 py-4 font-medium text-gray-900">{fieldIndex + 1}</td>
											<td class="px-6 py-4 font-mono text-sm text-gray-800">{field.name}</td>
											<td class="px-6 py-4 text-gray-600">{field.length}</td>
											<td class="px-6 py-4">
												<div class="bg-gray-100 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre-wrap">
													{record.raw[field.name]}
												</div>
											</td>
											<td class="px-6 py-4 text-gray-800">{record.value[field.name]}</td>
										</tr>
									{/each}
								</tbody>
							</table>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</main>
