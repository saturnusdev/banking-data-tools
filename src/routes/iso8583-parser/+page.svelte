<script>
	import Icon from '@iconify/svelte';
	import { ISO8583 } from '$lib/plugin/iso8583/iso8583Parser';

	let inputMessage = '';
	let properties = null;
	let dataElements = [];
	let error = '';

	function parseMessage() {
		if (!inputMessage.trim()) {
			properties = null;
			dataElements = [];
			return;
		}

		try {
			const iso = new ISO8583(inputMessage, 1);
			const data = iso.parseDataElement();

			properties = {
				mti: iso.mti,
				versionID: iso.versionID,
				version: iso.version,
				messageClassID: iso.messageClassID,
				messageClass: iso.messageClass,
				messageFunctionID: iso.messageFunctionID,
				messageFunction: iso.messageFunction,
				messageOriginID: iso.messageOriginID,
				messageOrigin: iso.messageOrigin,
				bitmap: iso.bitmap,
				messageLength: iso.messageLength,
				dataElementOffset: iso.dataElementOffset,
				dataElementLength: iso.dataElementLength
			};

			dataElements = data;
		} catch (err) {
			error = err.message;
			properties = null;
			dataElements = [];
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
						<div class="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 p-3">
							<Icon icon="mdi-light:credit-card" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
								ISO8583 Parser
							</h1>
							<p class="text-gray-600 mt-1">
								Parse and analyze ISO8583 financial transaction messages
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
		<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
			<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:edit" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Message Input</h2>
				</div>
			</div>
			<div class="p-6">
				<form on:submit|preventDefault={parseMessage} class="space-y-6">
					<div>
						<label for="input" class="block text-sm font-medium text-gray-700 mb-2">
							ISO 8583 Message
						</label>
						<textarea
							id="input"
							bind:value={inputMessage}
							placeholder="Type ISO 8583 message here..."
							class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 resize-none"
						></textarea>
					</div>
					
					<div class="flex flex-col sm:flex-row gap-4">
						<button
							type="submit"
							class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white transition-all hover:from-teal-600 hover:to-cyan-600 hover:shadow-lg"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:play" class="h-4 w-4" />
								<span>Parse Message</span>
							</span>
						</button>
					</div>
				</form>
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

			<!-- Message Properties Section -->
		{#if properties}
			<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
				<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:information" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Message Properties</h2>
					</div>
				</div>
				<div class="p-6">
					<div class="overflow-x-auto">
						<table class="w-full border-collapse border-2 border-gray-200 rounded-xl overflow-hidden">
							<thead>
								<tr class="bg-gradient-to-r from-teal-50 to-cyan-50">
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Property</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Value</th>
								</tr>
							</thead>
							<tbody>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">MTI</td>
									<td class="border-2 border-gray-200 px-4 py-3 font-mono text-teal-600 font-semibold">{properties.mti}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">ISO Version ID</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.versionID}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">ISO Version</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.version}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Class ID</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageClassID}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Class</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageClass}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Function ID</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageFunctionID}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Function</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageFunction}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Origin ID</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageOriginID}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Origin</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageOrigin}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Bitmap</td>
									<td class="border-2 border-gray-200 px-4 py-3 font-mono text-xs text-teal-600 break-all">{properties.bitmap}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Message Length</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.messageLength}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Data Element Offset</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.dataElementOffset}</td>
								</tr>
								<tr class="hover:bg-teal-50 transition-colors">
									<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">Data Element Length</td>
									<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{properties.dataElementLength}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>
		{/if}

			<!-- Data Elements Section -->
		{#if dataElements.length > 0}
			<section class="bg-white rounded-2xl shadow-xl border border-teal-100 overflow-hidden">
				<div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:format-list-bulleted" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Data Elements</h2>
					</div>
				</div>
				<div class="p-6">
					<div class="overflow-x-auto">
						<table class="w-full border-collapse border-2 border-gray-200 rounded-xl overflow-hidden">
							<thead>
								<tr class="bg-gradient-to-r from-teal-50 to-cyan-50">
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Field Index</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Field Type</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Max Length</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Length</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Field Name</th>
									<th class="border-2 border-gray-200 px-4 py-3 text-left font-semibold text-teal-700">Field Value</th>
								</tr>
							</thead>
							<tbody>
								{#each dataElements as element}
									<tr class="hover:bg-teal-50 transition-colors">
										<td class="border-2 border-gray-200 px-4 py-3 font-mono text-teal-600 font-semibold">{element.fieldIndex}</td>
										<td class="border-2 border-gray-200 px-4 py-3 font-mono text-gray-900">{element.fieldType}</td>
										<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{element.fieldMaxLength}</td>
										<td class="border-2 border-gray-200 px-4 py-3 text-gray-900">{element.fieldLength}</td>
										<td class="border-2 border-gray-200 px-4 py-3 font-medium text-gray-700">{element.fieldName}</td>
										<td class="border-2 border-gray-200 px-4 py-3 font-mono text-xs text-teal-600 break-all max-w-xs">{element.fieldValue}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		{/if}
	</div>
</main>
