<script>
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { confirmOnLeave } from '#lib/navigation-guard';
	import {
		parseAbcsSchema,
		buildSchemaTree,
		parseAbcsBinary,
		parseAbcsSegments,
		flattenWithSchema,
		findRecordMarkers,
		mergeSchemas,
		findHeaderRootsForSchema,
		extractHeaderLengths,
		findFieldValue,
		detectTextEncoding,
		hexToBytes,
		base64ToBytes,
		collectMissingTypes,
		resolveAllIncludes,
		collectDependencies,
		expandAliases
	} from '#lib/plugin/abcs/abcsParser.js';
	import {
		loadRules,
		saveRules,
		matchesPattern,
		DEFAULT_RULES as DEFAULT_CONVERSION_RULES
	} from '#lib/plugin/abcs/converterRules.js';
	import SearchSelect from '#lib/components/SearchSelect.svelte';

	// Form state
	let schemaFile = null;
	let schemaText = ''; // primary/active schema text (for the dropdown display & single-schema mode)
	let schemaTexts = []; // all active schema texts (header + body can be merged)
	let rootElement = ''; // default empty; auto-populated from the schema's DFDL roots
	let availableRoots = []; // top-level elements detected in the loaded schema(s)
	let schemaNotice = ''; // info message about stored/uploaded schema
	let messageDirection = 'auto'; // 'auto' | 'request' | 'response'
	let mapSecondaryHeader = true; // also map the secondary header layer after the first
	// User-defined conversion rules (header layers, length fields, signatures).
	// Persisted in localStorage — never in committed source.
	let conversionRules = loadRules();
	let binaryFile = null;
	let binaryFileName = '';
	let binaryFileSize = 0;
	let inputMode = 'file'; // 'file' | 'hex' | 'base64'
	let hexInput = '';
	let base64Input = '';
	let defaultEncoding = 'AUTO'; // 'AUTO' auto-detects EBCDIC vs ASCII from the bytes
	let byteOrder = 'bigEndian';
	let stripPad = true;
	let showDebug = true;
	let byteOffset = 0; // start parsing at this byte offset (e.g. inside a multi-record message)

	// Result state
	let results = null;
	let loading = false;
	let error = '';
	let parseWarning = '';
	let detectedMarkers = [];
	let flatFields = [];
	let missingTypes = []; // unresolved xs:complexType refs (from xsd:include not uploaded)

	// Walk the FULL xsd:include/xsd:import dependency graph of the active schema
	// set (transitively — includes of includes). Matching is by the basename of
	// each schemaLocation, so "IBMdefined/Foo.xsd" is satisfied by an uploaded
	// "Foo.xsd". Exposes resolved + missing so the UI can show upload progress
	// until every dependency is clear.
	$: dependencyInfo = (() => {
		if (!schemaTexts.length && !schemaText) return { resolved: [], missing: [] };
		const texts = schemaTexts.length ? schemaTexts : [schemaText];
		const userSchemas = Object.fromEntries(
			storedFiles.map(f => [f.name.toLowerCase(), f.content])
		);
		return collectDependencies(texts, userSchemas);
	})();
	$: missingIncludes = dependencyInfo.missing;

	// Root Element dropdown options: the special "all segments" entry plus every
	// root element detected in the loaded schema(s).
	$: rootOptions = [
		{ value: '__ALL__', label: 'All segments (auto-detect)' },
		...availableRoots.map((r) => ({ value: r, label: r }))
	];

	// Mode helpers (a header-mapped result is still a segments/single result underneath)
	$: isSegmentsMode = !!results && (results['mode'] === 'segments' || results['mode'] === 'header+segments');
	$: isSingleMode = !!results && (results['mode'] === 'single' || results['mode'] === 'header+single');

	// Stored schema files (localStorage)
	let storedFiles = [];
	let selectedStoredFile = '';
	let mergeSelection = []; // stored file names selected for merging (header + body schemas)

	onMount(() => {
		loadStoredFiles();
	});

	function loadStoredFiles() {
		const stored = localStorage.getItem('abcs-files');
		if (stored) {
			try {
				storedFiles = JSON.parse(stored);
			} catch (e) {
				storedFiles = [];
			}
		}
	}

	function saveStoredFiles() {
		localStorage.setItem('abcs-files', JSON.stringify(storedFiles));
	}

	// ------------------------------------------------------------------
	// Support schemas (NOT shipped with the app for security).
	// The user uploads ANY number of DFDL schemas the converter needs to
	// resolve xsd:include/xsd:import references. They are persisted in
	// localStorage and resolved automatically on convert. There is no fixed
	// set and no vendor naming — the user decides which and how many schemas
	// their message uses.
	// ------------------------------------------------------------------

	// Upload one or more support schemas and persist them.
	async function handleSupportUpload(event) {
		const files = Array.from(event.target.files || []);
		event.target.value = ''; // allow re-selecting the same file later
		if (!files.length) return;
		let added = 0;
		for (const file of files) {
			await storeFile(file);
			added++;
		}
		schemaNotice = `Stored ${added} schema file(s). ${storedFiles.length} support schema(s) available.`;
		error = '';
	}

	// Remove a stored support schema from localStorage.
	function deleteStoredSchema(name) {
		storedFiles = storedFiles.filter(f => f.name !== name);
		saveStoredFiles();
		if (selectedStoredFile === name) selectedStoredFile = '';
		mergeSelection = mergeSelection.filter(n => n !== name);
		schemaNotice = `Removed ${name} from local storage.`;
	}

	// ------------------------------------------------------------------
	// Conversion rules (user-defined, persisted in localStorage).
	// These describe how to recognise each header layer and where its
	// length/signature live — no vendor naming is baked into the source.
	// ------------------------------------------------------------------
	function addHeaderLayer() {
		const n = (conversionRules.headerLayers || []).length + 1;
		conversionRules.headerLayers = [
			...(conversionRules.headerLayers || []),
			{ id: `layer-${n}`, label: `Header Layer ${n}`, sourceFile: '', rootPattern: '', lengthField: '', signatureField: '', signatureValue: '' }
		];
		saveRules(conversionRules);
	}

	// Root element names available in a given uploaded schema (by filename).
	// Used to offer a pick-list when a header layer is linked to a schema.
	function schemaRootsFor(sourceFile) {
		if (!sourceFile) return [];
		const file = storedFiles.find(f => f.name === sourceFile);
		if (!file) return [];
		try {
			const parsed = parseAbcsSchema(file.content);
			const roots = Object.keys(parsed.rootTypes || {});
			return roots.length ? roots : Object.keys(parsed.elementRegistry || {});
		} catch {
			return [];
		}
	}

	// When a header layer is linked to a schema, default its root pattern to that
	// schema's first root element (the user can still refine it by hand).
	function onLayerSourceChange(layer) {
		const roots = schemaRootsFor(layer.sourceFile);
		if (roots.length) {
			layer.rootPattern = roots[0];
		}
		updateRule();
	}

	function removeHeaderLayer(id) {
		conversionRules.headerLayers = (conversionRules.headerLayers || []).filter((l) => l.id !== id);
		saveRules(conversionRules);
	}

	function updateRule() {
		// Persist on every edit so rules survive reloads.
		saveRules(conversionRules);
	}

	function resetConversionRules() {
		conversionRules = structuredClone(DEFAULT_CONVERSION_RULES);
		saveRules(conversionRules);
	}

	// Follow xsd:include / xsd:import schemaLocation references by pulling in matching
	// files the user has already stored/uploaded (e.g. a Header/Body type defined in a
	// separate XSD). All schemas come from localStorage — nothing is bundled — and are
	// resolved automatically via resolveAllIncludes, expanded to their known aliases.
	function resolveSchemaTexts(texts) {
		const userSchemas = Object.fromEntries(
			storedFiles.map(f => [f.name.toLowerCase(), f.content])
		);
		return resolveAllIncludes(texts, userSchemas);
	}

	async function storeFile(file) {
		const fileContent = await file.text();
		const fileInfo = {
			name: file.name,
			content: fileContent,
			size: file.size,
			lastModified: file.lastModified,
			uploadedAt: new Date().toISOString()
		};
		// Only add if not already present; never overwrite an existing stored file.
		// Reassign (not .push) so the change is reactive in legacy mode — this is
		// what makes the file list, Linked-schema dropdowns, and dependency
		// progress refresh immediately after an upload.
		if (!storedFiles.some(f => f.name === file.name)) {
			storedFiles = [...storedFiles, fileInfo];
			saveStoredFiles();
		}
		return fileInfo;
	}

	// Extract available root elements (top-level xs:element) from all active schemas.
	// Roots come ONLY from the user-uploaded texts (schemaTexts / schemaText).
	// Stored support schemas (resolved via resolveSchemaTexts) are used for type
	// resolution only — they never contribute root elements to the dropdown.
	function updateAvailableRoots() {
		try {
			const uploadedTexts = schemaTexts.length ? schemaTexts : schemaText ? [schemaText] : [];
			if (!uploadedTexts.length) {
				availableRoots = [];
				return;
			}
			// Parse only the uploaded texts to get their root elements.
			// Parse each separately so one bad schema doesn't kill the rest.
			const uploadedSchemas = uploadedTexts.flatMap(t => {
				try { return [parseAbcsSchema(t)]; } catch (e) {
					error = `Schema parse error: ${e.message}`;
					return [];
				}
			});
			const uploadedMerged = mergeSchemas(uploadedSchemas);
			availableRoots = Object.keys(uploadedMerged.rootTypes || {});
			// Auto-select the first non-header body root
			if (!rootElement.trim()) {
				const bodyRoot =
					availableRoots.find(r => /body/i.test(r)) ||
					availableRoots.find(r => !/header/i.test(r));
				if (bodyRoot) rootElement = bodyRoot;
			}
			if (!availableRoots.length) {
				error = 'No root elements found in the schema. Check that xs:element is a direct child of xs:schema.';
			} else {
				error = '';
			}
		} catch (e) {
			availableRoots = [];
			error = `Schema load error: ${e.message || e}`;
		}
	}

	// Load schema content (from a stored file or a fresh upload) and populate roots
	function loadSchemaContent(content, name) {
		const blob = new Blob([content], { type: 'application/xml' });
		schemaFile = new File([blob], name, { type: 'application/xml' });
		schemaText = content;
		schemaTexts = [content];
		selectedStoredFile = name;
		rootElement = ''; // default empty; auto-selected below from the schema's DFDL roots
		updateAvailableRoots();
	}

	// Merge a set of stored schema files into the active schema set
	function loadMergedSchemas(names) {
		const texts = (names || [])
			.map(n => storedFiles.find(f => f.name === n))
			.filter(Boolean)
			.map(f => f.content);
		if (!texts.length) return;
		schemaTexts = texts;
		schemaText = texts[texts.length - 1]; // last file is the "primary" (e.g. the body schema)
		const lastName = names[names.length - 1];
		schemaFile = new File([new Blob(texts, { type: 'application/xml' })], `${lastName} (+${texts.length - 1} merged)`, { type: 'application/xml' });
		selectedStoredFile = lastName;
		rootElement = '';
		updateAvailableRoots();
	}

	// Merge whichever stored schemas are ticked in the "merge" checkbox list
	function mergeSelectedFiles() {
		if (!mergeSelection.length) {
			schemaNotice = 'Select at least one schema to merge.';
			return;
		}
		loadMergedSchemas(mergeSelection);
		schemaNotice = `Merged ${mergeSelection.length} schema(s): ${mergeSelection.join(', ')}.`;
		error = '';
	}

	// Convenience: merge all stored schemas (e.g. application header + transport header + body)
	function quickMergeHeaderAndBody() {
		if (!storedFiles.length) return;
		mergeSelection = storedFiles.map(f => f.name);
		mergeSelectedFiles();
	}

	function selectStoredFile(fileName) {
		const file = storedFiles.find(f => f.name === fileName);
		if (file) {
			loadSchemaContent(file.content, file.name);
			error = '';
		}
	}

	function deleteStoredFile(fileName) {
		storedFiles = storedFiles.filter(f => f.name !== fileName);
		saveStoredFiles();
		if (selectedStoredFile === fileName) {
			selectedStoredFile = '';
			schemaFile = null;
			schemaText = '';
			schemaTexts = [];
			availableRoots = [];
			rootElement = '';
			schemaNotice = '';
		}
	}

	async function handleSchemaUpload(event) {
		const file = event.target.files[0];
		if (!file || !(file.name.endsWith('.xml') || file.name.endsWith('.xsd'))) {
			error = 'Please upload a valid XML/XSD DFDL schema file';
			return;
		}

		const existing = storedFiles.find(f => f.name === file.name);
		if (existing) {
			// File already stored: do not re-upload, just load the stored version
			loadSchemaContent(existing.content, existing.name);
			schemaNotice = `"${file.name}" already exists in storage. Loaded the stored version — pick it from the dropdown.`;
			error = '';
		} else {
			const info = await storeFile(file);
			loadSchemaContent(info.content, info.name);
			schemaNotice = `"${file.name}" stored locally.`;
			error = '';
		}

		// Reset the input so the same file can be chosen again later
		event.target.value = '';
	}

	function handleBinaryUpload(event) {
		const file = event.target.files[0];
		if (file) {
			binaryFile = file;
			binaryFileName = file.name;
			binaryFileSize = file.size;
			error = '';
		}
	}

	// Convert binary file to Uint8Array
	async function readBinaryFile(file) {
		const buffer = await file.arrayBuffer();
		return new Uint8Array(buffer);
	}

	// Resolve the input bytes based on the selected input mode
	async function resolveInputBytes() {
		if (inputMode === 'file') {
			if (!binaryFile) {
				throw new Error('Please upload a binary file (.bin) or switch to Hex/Base64 input');
			}
			return await readBinaryFile(binaryFile);
		}
		if (inputMode === 'hex') {
			const clean = hexInput.trim();
			if (!clean) throw new Error('Please enter hex data');
			return hexToBytes(clean);
		}
		if (inputMode === 'base64') {
			const clean = base64Input.trim();
			if (!clean) throw new Error('Please enter base64 data');
			return base64ToBytes(clean);
		}
		throw new Error('Unknown input mode');
	}

	async function processParsing() {
		const texts = resolveSchemaTexts(schemaTexts.length ? schemaTexts : schemaText ? [schemaText] : []);
		if (!texts.length) {
			error = 'Please upload a DFDL/XSD schema file';
			return;
		}

		if (!rootElement.trim()) {
			error = 'Please select a root element from the schema';
			return;
		}

		loading = true;
		error = '';
		parseWarning = '';
		detectedMarkers = [];
		results = null;
		flatFields = [];
		missingTypes = [];

		try {
			// 1. Merge all active schemas (header + body) into one.
			// Parse each schema text individually so a bad included file doesn't crash the whole merge.
			const parseErrors = [];
			const schema = mergeSchemas(texts.map(t => {
				try { return parseAbcsSchema(t); }
				catch (e) { parseErrors.push(e.message); return null; }
			}).filter(Boolean));
			if (parseErrors.length) {
				parseWarning = `Schema parse warning(s): ${parseErrors.slice(0, 3).join(' | ')}`;
			}

			// Check for unresolved type references (xsd:include files not uploaded)
			missingTypes = collectMissingTypes(texts, schema);
			if (missingTypes.length) {
				const names = [...new Set(missingTypes.map(m => m.typeName))].slice(0, 6).join(', ');
				const fileRefs = [...new Set(schema.includes || [])];
				// A file is resolved if a stored (uploaded) schema matches it or any of its aliases.
				const missing = fileRefs.filter(f => {
					const lc = f.toLowerCase();
					const aliases = expandAliases(lc);
					return !storedFiles.some(s => aliases.includes(s.name.toLowerCase()) || s.name.toLowerCase() === lc);
				});
				if (missing.length) {
					parseWarning = `Missing included schema file(s): ${missing.join(', ')}. ` +
						`Upload them and they will be auto-merged. Unresolved types: ${names}. ` +
						`Fields using these types will decode as raw text instead of structured fields.`;
				}
				// If all includes are resolved but types still missing, the merge failed silently
				else if (parseErrors.length === 0) {
					// Types should have resolved — no warning needed, parsing will proceed
					missingTypes = [];
				}
			}

			// 2. Resolve binary input
			const bytes = await resolveInputBytes();

			// 3. Apply a user-supplied start offset (e.g. to begin at a record boundary)
			const offset = Math.max(0, Math.min(Math.floor(Number(byteOffset) || 0), bytes.length));
			const startBytes = offset > 0 ? bytes.subarray(offset) : bytes;

			const isAllSegments = rootElement.trim() === '__ALL__';

			// 4. Map the header chain (transport header → application header → ABCS body), then parse
			// the body. The transport header starts at the first character; the application header
			// follows it; the remainder is the ABCS body.
			let headers = [];
			let bodyBytes = startBytes;

			// Parse one header root at an offset, reporting its declared length and
			// signature. The transport header length comes from the length field (and its fields run
			// from the signature field = the expected value to the last field). The application header length comes
			// from the length field and ends with the signature field = the expected value.
			const parseOneHeader = (hroot, atOffset) => {
				const tree = buildSchemaTree(schema, hroot);
				const parsed = parseAbcsBinary(tree, startBytes.subarray(atOffset), {
					rootName: hroot,
					defaultEncoding: defaultEncoding,
					defaultByteOrder: byteOrder,
					stripPad: stripPad
				});
				const layer =
					(conversionRules.headerLayers || []).find(
						(l) => l.rootPattern && matchesPattern(hroot, l.rootPattern)
					) || null;
				// The header layer was identified above by the user's root-name
				// pattern. Its declared length comes from the layer's length field
				// (user-defined) — no vendor field names are referenced here.
				const declaredLength =
					layer && layer.lengthField ? extractFieldValue(parsed.json, layer.lengthField) : null;
				const remaining = startBytes.length - atOffset;
				const declaredSane =
					declaredLength != null && declaredLength > 0 && declaredLength <= remaining;
				// Optional signature: a field whose value must equal the user's
				// expected value (both defined in the conversion rules).
				let signatureRaw;
				if (layer && layer.signatureField) {
					const raw = findFieldValue(parsed.json, layer.signatureField);
					signatureRaw = raw && typeof raw === 'object' ? (raw.value ?? raw.text) : raw;
				}
				const signatureOk =
					layer && layer.signatureField
						? signatureRaw == null ||
							String(signatureRaw) === String(layer.signatureValue)
						: true;
				return {
					root: hroot,
					json: parsed.json,
					debug: parsed.debug,
					fields: parsed.fields,
					declaredLength,
					declaredSane,
					consumedBytes: parsed.debug.consumedBytes,
					layer,
					signatureRaw,
					signatureOk,
					length: 0
				};
			};

			// Map the header chain: transport header first, then the application header (ends with
			// the signature field = the expected value), then the ABCS body is the remainder. The transport header
			// starts at the first character. The true length of each header is the
			// number of bytes the schema consumed. The declared length (read from
			// the layer's length field) is a sanity signal, only authoritative when
			// it agrees with the schema layout. Additional header layers are
			// optional (gated by the mapSecondaryHeader checkbox).
			const runChain = (headerRoots) => {
				const mapped = [];
				let cursor = 0;
				for (const root of headerRoots) {
					const remaining = startBytes.length - cursor;
					if (remaining <= 0) break;
					// The secondary (and later) header layers are optional.
					if (mapped.length >= 1 && !mapSecondaryHeader) break;
					const h = parseOneHeader(root, cursor);
					// The first layer follows the chosen direction; later layers are
					// always auto-validated against their declared length/signature.
					const auto = mapped.length > 0 ? true : (messageDirection === 'auto');
					// Skip headers whose declared length is not sane or whose signature
					// does not match. If nothing has been mapped yet, try the next
					// candidate at the same offset; otherwise stop (the next layer's
					// offset would be unknown).
					if (auto && (!h.declaredSane || !h.signatureOk)) {
						if (mapped.length > 0) break;
						continue;
					}
					// Header length: the schema-parsed byte count is authoritative.
					// The declared length (from the layer's length field) is only used
					// when it agrees with the schema layout (within a small tolerance).
					const schemaLength = h.consumedBytes;
					// The declared header length is authoritative for the header
					// boundary when sane — it is the true end of the header even when
					// the schema also declares optional trailing fields (which the
					// parser may or may not have consumed). Fall back to the
					// schema-parsed byte count.
					h.length = h.declaredSane
						? h.declaredLength
						: (schemaLength > 0 ? schemaLength : (h.declaredLength || 0));
					mapped.push(h);
					cursor += h.length;
				}
				return { headers: mapped, bodyBytes: startBytes.subarray(cursor), cursor };
			};

			if (messageDirection !== 'auto') {
				const headerRoots = findHeaderRootsForSchema(schema, messageDirection, conversionRules);
				if (!headerRoots.length) {
					// Don't hard-fail: parse the whole input as the body, with a soft warning.
					parseWarning = `No header root was found for the "${messageDirection}" direction. ` +
						`Define your header layers (root-name patterns) under Conversion Rules so the ` +
						`converter knows which roots are headers. The whole input was parsed as the body.`;
				} else {
					const r = runChain(headerRoots);
					headers = r.headers;
					bodyBytes = r.bodyBytes;
					const bad = headers.find(h => !h.signatureOk);
					if (bad && bad.layer) {
						parseWarning = `Mapped header "${bad.root}" (${bad.layer.label}) but its ` +
							`${bad.layer.signatureField} is "${bad.signatureRaw}" (expected ` +
							`"${bad.layer.signatureValue}"). Double-check the message direction ` +
							`(Request vs Response) and your Conversion Rules.`;
					}
				}
			} else {
				// Auto: prefer the direction whose first header layer carries a valid
				// signature (defined in your Conversion Rules). Try response first
				// (the common case), then request.
				let best = null;
				for (const dir of ['response', 'request']) {
					const headerRoots = findHeaderRootsForSchema(schema, dir, conversionRules);
					if (!headerRoots.length) continue;
					const r = runChain(headerRoots);
					const first = r.headers.find(h => h.layer);
					if (first && first.signatureOk) {
						best = { ...r, autoDirection: dir };
						break;
					}
					if (!best && r.headers.length) best = { ...r, autoDirection: dir };
				}
				if (best) {
					headers = best.headers;
					bodyBytes = best.bodyBytes;
				}
			}

			// 5. Parse the body with the selected root element (or all segments)
			if (isAllSegments) {
				const segResult = parseAbcsSegments(schema, bodyBytes, {
					defaultEncoding: defaultEncoding,
					defaultByteOrder: byteOrder,
					stripPad: stripPad
				});

				if (segResult.segments.length === 0) {
					const enc = detectTextEncoding(bodyBytes);
					detectedMarkers = findRecordMarkers(bodyBytes, enc, availableRoots);
				}

				results = {
					mode: headers.length ? 'header+segments' : 'segments',
					segments: segResult.segments,
					detectedEncoding: segResult.detectedEncoding,
					totalBytes: segResult.totalBytes,
					preamble: segResult.preamble,
					preambleLength: segResult.preambleLength,
					rootElement: rootElement.trim(),
					schemaFields: [],
					encoding: segResult.detectedEncoding,
					byteOrder: byteOrder,
					startOffset: offset
				};

				flatFields = segResult.segments.flatMap((s, i) =>
					s.fields.map(f => ({ ...f, path: `[Seg${i + 1}] ${f.path}` }))
				);
			} else {
				const schemaTree = buildSchemaTree(schema, rootElement.trim());
				const { json, debug, fields } = parseAbcsBinary(schemaTree, bodyBytes, {
					rootName: rootElement.trim(),
					defaultEncoding: defaultEncoding,
					defaultByteOrder: byteOrder,
					stripPad: stripPad
				});

				results = {
					mode: headers.length ? 'header+single' : 'single',
					json: json,
					debug: debug,
					rootElement: rootElement.trim(),
					schemaFields: schemaTree.children.map(c => c.name),
					encoding: debug.detectedEncoding,
					byteOrder: byteOrder,
					startOffset: offset
				};

				flatFields = fields;

				// Sanity check: if the body root didn't consume the whole body, the data
				// may be a different record type or contain multiple records.
				const consumed = debug.consumedBytes;
				const remaining = bodyBytes.length - consumed;
				if (remaining > 8) {
					parseWarning = `Only ${consumed} of ${bodyBytes.length} body bytes were consumed by the selected root "${rootElement.trim()}". ` +
						`${remaining} byte${remaining === 1 ? '' : 's'} remain — the data may be a different record type, ` +
						`contain multiple records, or need a start offset.`;
				}
			}

			// 6. Attach the mapped header chain (if any) to the results
			if (headers.length) {
				results.headers = headers;
			}
		} catch (err) {
			error = err.message || String(err);
		} finally {
			loading = false;
		}
	}

	function downloadJson() {
		if (!results) return;
		let payload;
		let filename;
		const headerBlock = results.headers && results.headers.length
			? {
					headers: results.headers.map(h => ({
						root: h.root,
						json: h.json,
						length: h.length,
						declaredLength: h.declaredLength
					})),
					direction: messageDirection
				}
			: {};
		if (isSegmentsMode || results.mode === 'header+segments') {
			const combined = {
				...headerBlock,
				detectedEncoding: results.detectedEncoding,
				segments: results.segments.map((s, i) => ({
					root: s.rootName,
					initiator: s.initiator,
					offset: s.offset,
					length: s.length,
					...s.json
				}))
			};
			payload = JSON.stringify(combined, null, 2);
			filename = 'abcs-segments.json';
		} else {
			// Flatten the mapped header chain + body into a single object:
			// { transport header (response): {...}, Header: {...}, Body: {...} }.
			const flat = results.mode === 'header+single'
				? {
						...Object.fromEntries(results.headers.map(h => {
							const value = h.json && typeof h.json === 'object' ? h.json : {};
							const key = h.root;
							return [key, value[key] ?? value];
						})),
						...(results.json || {})
					}
				: results.json;
			payload = JSON.stringify(flat, null, 2);
			filename = `${results.rootElement.toLowerCase()}-abcs.json`;
		}
		const blob = new Blob([payload], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadSegmentJson(seg, idx) {
		const blob = new Blob([JSON.stringify(seg.json, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${seg.rootName.toLowerCase()}-abcs-segment${idx + 1}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadDebug() {
		if (!results) return;
		const lines = [];
		lines.push(`=== ABCS Converter Debug ===`);
		lines.push(`Mode              : ${isSegmentsMode ? 'All segments' : 'Single'}`);
		lines.push(`Root Element      : ${results.rootElement}`);
		lines.push(`Default Encoding  : ${results.encoding}`);
		lines.push(`Byte Order        : ${results.byteOrder}`);

		if (isSegmentsMode) {
			lines.push(`Total Bytes       : ${results.totalBytes}`);
			lines.push(`Segments          : ${results.segments.length}`);
			lines.push(`Preamble (${results.preambleLength} bytes):`);
			lines.push(results.preamble);
			lines.push(``);
			results.segments.forEach((s, i) => {
				lines.push(`--- Segment ${i + 1}: ${s.rootName} (${s.initiator} @ offset ${s.offset}, ${s.length} bytes) ---`);
				lines.push(`DECODED VIEW (${s.debug.detectedEncoding}):`);
				lines.push(s.debug.decodedView);
				lines.push(`JSON:`);
				lines.push(JSON.stringify(s.json, null, 2));
			lines.push(`FIELDS:`);
			(s.fields || []).forEach(f =>
				lines.push(`  ${f.path.padEnd(40)} value=${f.value}  xsdLength=${f.xsdLength ?? '—'}  valueLength=${f.valueLength ?? '—'}`)
			);

				lines.push(``);
			});
		} else {
			lines.push(`Total Bytes       : ${results.debug.totalBytes}`);
			lines.push(`Consumed Bytes    : ${results.debug.consumedBytes}`);
			lines.push(``);
			lines.push(`DECODED VIEW (${results.debug.detectedEncoding}):`);
			lines.push(results.debug.decodedView);
			lines.push(``);
			lines.push(`HEX DUMP:`);
			lines.push(results.debug.hexDump);
			lines.push(``);
			lines.push(`EBCDIC VIEW (reference):`);
			lines.push(results.debug.ebcdicView);
			lines.push(``);
			lines.push(`JSON:`);
			const debugJson = results.mode === 'header+single' && results.headers && results.headers.length
				? {
						...Object.fromEntries(results.headers.map(h => {
							const value = h.json && typeof h.json === 'object' ? h.json : {};
							return [h.root, value[h.root] ?? value];
						})),
						...(results.json || {})
					}
				: results.json;
			lines.push(JSON.stringify(debugJson, null, 2));
		lines.push(`FIELDS:`);
		(flatFields || []).forEach(f =>
			lines.push(`  ${f.path.padEnd(40)} value=${f.value}  xsdLength=${f.xsdLength ?? '—'}  valueLength=${f.valueLength ?? '—'}`)
		);

		}

		const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${isSegmentsMode ? 'abcs-segments' : results.rootElement.toLowerCase()}-abcs-debug.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function resetForm() {
		schemaFile = null;
		schemaText = '';
		schemaTexts = [];
		rootElement = '';
		availableRoots = [];
		schemaNotice = '';
		messageDirection = 'auto';
		mapSecondaryHeader = true;
		mergeSelection = [];
		binaryFile = null;
		binaryFileName = '';
		binaryFileSize = 0;
		inputMode = 'file';
		hexInput = '';
		base64Input = '';
		defaultEncoding = 'EBCDIC';
		byteOrder = 'bigEndian';
		stripPad = true;
		showDebug = true;
		byteOffset = 0;
		results = null;
		error = '';
		parseWarning = '';
		detectedMarkers = [];
		flatFields = [];
		missingTypes = [];
		selectedStoredFile = '';
	}

	// Warn before reload / back / forward / swipe / navigating away with unsaved data.
	// Note: locally-stored schema files are persisted, so they are NOT treated as
	// unsaved work — only the current session's uploads/inputs/results are.
	function hasUnsavedData() {
		return (
			Boolean(schemaFile) ||
			Boolean(binaryFile) ||
			hexInput.trim() !== '' ||
			base64Input.trim() !== '' ||
			Boolean(results)
		);
	}
	confirmOnLeave(hasUnsavedData);
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="bg-white shadow-lg border-b border-purple-100">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-purple-600 transition-all hover:bg-purple-100 hover:scale-110"
						onclick={() => {
							location.href = '/';
						}}
					>
						<Icon icon="mdi-light:arrow-left" class="h-6 w-6 transition-transform group-hover:-translate-x-1" />
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-3">
							<Icon icon="mdi-light:database" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
								ABCS Converter
							</h1>
							<p class="text-gray-600 mt-1">
								Convert ABCS segments (binary) to JSON using a DFDL XSD schema
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

		<!-- Schema & Root Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Schema & Root Element</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<!-- Support Schemas (uploaded by user, stored in localStorage) -->
					<div class="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
						<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:shield-check" class="h-5 w-5 text-indigo-600" />
								<span class="text-sm font-semibold text-gray-800">Support Schemas</span>
								<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
									{storedFiles.length} stored
								</span>
							</div>
							<p class="text-xs text-gray-500">
								Schemas are not shipped with this app. Upload the DFDL schemas your message uses — they are
								stored only in your browser (localStorage) and resolved automatically on convert.
							</p>
						</div>

						<input
							type="file"
							id="abcs-support-schemas"
							accept=".xsd,.xml"
							multiple
							onchange={handleSupportUpload}
							class="w-full px-4 py-2.5 border-2 border-indigo-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
						/>

						<!-- Dependency resolution progress (transitive) -->
					{#if dependencyInfo.resolved.length || dependencyInfo.missing.length}
						<div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
							<span class="font-semibold text-gray-700">Dependencies:</span>
							<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-mono">
								{dependencyInfo.resolved.length} resolved
							</span>
							{#if dependencyInfo.missing.length}
								<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono">
									{dependencyInfo.missing.length} missing
								</span>
							{:else}
								<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
									✓ all dependencies clear
								</span>
							{/if}
						</div>
					{/if}

					{#if storedFiles.length}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
								{#each storedFiles as sf (sf.name)}
									<div class="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-white border-gray-200">
										<div class="flex items-center space-x-1.5 min-w-0">
											<Icon icon="mdi-light:check-circle" class="h-4 w-4 shrink-0 text-green-600" />
											<span class="font-mono text-xs font-semibold text-gray-800 truncate">{sf.name}</span>
										</div>
										<button
											type="button"
											onclick={() => deleteStoredSchema(sf.name)}
											class="shrink-0 text-xs text-red-500 hover:text-red-700 font-medium"
											title="Remove {sf.name} from local storage"
										>
											Remove
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Conversion Rules (user-defined, persisted in localStorage) -->
					<div class="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
						<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:tune" class="h-5 w-5 text-purple-600" />
								<span class="text-sm font-semibold text-gray-800">Conversion Rules</span>
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={addHeaderLayer}
									class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
								>
									+ Add Header Layer
								</button>
								<button
									type="button"
									onclick={resetConversionRules}
									class="text-xs font-medium px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 transition-colors"
								>
									Reset
								</button>
							</div>
						</div>
						<p class="text-xs text-gray-500 mb-3">
							Describe how to recognise each header layer so the converter knows how to proceed. All values are
							stored only in your browser (localStorage) — never in the published code. Leave a pattern blank to
							skip that layer.
						</p>

						{#each conversionRules.headerLayers as layer}
							<div class="rounded-lg border border-purple-200 bg-white p-3 mb-3">
								<div class="flex items-center justify-between gap-2 mb-2">
									<input
										type="text"
										bind:value={layer.label}
										oninput={updateRule}
										placeholder="Layer name"
										class="font-semibold text-sm text-gray-800 bg-transparent border-b border-purple-200 focus:border-purple-500 focus:outline-none px-1 py-0.5 w-48"
									/>
									<button
										type="button"
										onclick={() => removeHeaderLayer(layer.id)}
										class="text-xs text-red-500 hover:text-red-700 font-medium"
										title="Remove this header layer"
									>
										Remove
									</button>
								</div>
						<label class="block mb-2">
							<span class="block text-xs text-gray-500 mb-1">Linked schema (optional — pick the uploaded schema for this layer)</span>
							<select
								bind:value={layer.sourceFile}
								onchange={() => onLayerSourceChange(layer)}
								class="w-full font-mono text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none"
							>
								<option value="">— Not linked (define the root pattern manually) —</option>
								{#each storedFiles as sf (sf.name)}
									<option value={sf.name}>{sf.name}</option>
								{/each}
							</select>
						</label>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<label class="block">
										<span class="block text-xs text-gray-500 mb-1">Root name starts with</span>
										<input
											type="text"
											bind:value={layer.rootPattern}
											oninput={updateRule}
											placeholder="e.g. ABCDEF"
											class="w-full font-mono text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none"
										/>
									</label>
									<label class="block">
										<span class="block text-xs text-gray-500 mb-1">Length field name</span>
										<input
											type="text"
											bind:value={layer.lengthField}
											oninput={updateRule}
											placeholder="Field that holds this layer's byte length"
											class="w-full font-mono text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none"
										/>
									</label>
									<label class="block">
										<span class="block text-xs text-gray-500 mb-1">Signature field (optional)</span>
										<input
											type="text"
											bind:value={layer.signatureField}
											oninput={updateRule}
											placeholder="Field that marks this layer"
											class="w-full font-mono text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none"
										/>
									</label>
									<label class="block">
										<span class="block text-xs text-gray-500 mb-1">Expected signature value (optional)</span>
										<input
											type="text"
											bind:value={layer.signatureValue}
											oninput={updateRule}
											placeholder="Expected value of the signature field"
											class="w-full font-mono text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none"
										/>
									</label>
								</div>
							</div>
						{/each}

						{#if !conversionRules.headerLayers.length}
							<p class="text-xs text-gray-500 italic">No header layers defined. Add one to tell the converter how to map headers.</p>
						{/if}
					</div>

					<!-- DFDL Schema File Upload -->
				<div>
					<label for="abcs-schema" class="block text-sm font-medium text-gray-700 mb-2">
						DFDL Schema File (.xml/.xsd)
					</label>

					{#if storedFiles.length > 0}
						<div class="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
							<label for="stored-files" class="block text-sm font-medium text-gray-700 mb-2">
								Or select a previously uploaded file:
							</label>
							<div class="flex gap-2">
								<select
									id="stored-files"
									bind:value={selectedStoredFile}
									onchange={() => selectStoredFile(selectedStoredFile)}
									class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
								>
									<option value="">-- Select stored file --</option>
									{#each storedFiles as file}
										<option value={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option>
									{/each}
								</select>
								{#if selectedStoredFile}
									<button
										onclick={() => deleteStoredFile(selectedStoredFile)}
										class="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm transition-all"
										title="Delete stored file"
									>
										Delete
									</button>
								{/if}
							</div>

							{#if storedFiles.length > 1}
								<div class="mt-4 pt-4 border-t border-indigo-200">
									<span class="block text-sm font-medium text-gray-700 mb-2">
										Merge schemas (header + body)
									</span>
									<div class="space-y-2">
										{#each storedFiles as file}
											<label class="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
												<input
													type="checkbox"
													checked={mergeSelection.includes(file.name)}
													onchange={(e) => {
														mergeSelection = e.target.checked
															? [...mergeSelection, file.name]
															: mergeSelection.filter(n => n !== file.name);
													}}
													class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
												/>
												<span class="font-mono text-xs">{file.name}</span>
											</label>
										{/each}
									</div>
									<div class="flex gap-2 mt-3">
										<button
											onclick={mergeSelectedFiles}
											class="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-sm font-semibold transition-all"
										>
											Merge selected
										</button>
										<button
											onclick={quickMergeHeaderAndBody}
											class="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 text-sm font-semibold transition-all"
										>
											Auto (header + body)
										</button>
									</div>
									<p class="mt-2 text-xs text-gray-500">
										Tick the header schema (e.g. <code class="font-mono bg-gray-100 px-1 rounded">transport header.xsd</code>) and the body schema
										(e.g. <code class="font-mono bg-gray-100 px-1 rounded">abcs.xml</code>), then Merge — both root sets become available in the dropdown.
									</p>
								</div>
							{/if}
						</div>
					{/if}

					<input
						type="file"
						id="abcs-schema"
						accept=".xml,.xsd"
						onchange={handleSchemaUpload}
						class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
					/>
					{#if schemaFile}
						<div class="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
								<p class="text-green-700 font-medium">
									Loaded: {schemaFile.name}
									{#if storedFiles.find(f => f.name === schemaFile.name)}
										<span class="text-green-600 text-xs">(stored locally)</span>
									{/if}
								</p>
							</div>
						</div>
					{/if}

					{#if schemaNotice}
						<div class="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:information" class="h-5 w-5 text-blue-600 shrink-0" />
								<p class="text-blue-700 text-sm font-medium">{schemaNotice}</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Missing Includes Warning -->
				{#if missingIncludes.length}
					<div class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-300">
						<div class="flex items-start space-x-3">
							<Icon icon="mdi:file-alert-outline" class="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
							<div>
								<p class="text-orange-900 font-semibold text-sm">Schema dependencies not uploaded:</p>
								<div class="flex flex-wrap gap-2 mt-2">
									{#each missingIncludes as f}
										<span class="font-mono text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-1 rounded">{f}</span>
									{/each}
								</div>
								<p class="text-orange-800 text-xs mt-2">
									Upload these files using the file input above — they will be auto-merged when converting.
									Without them, fields typed with definitions from these files will decode as raw text.
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Root Element -->
				<div>
					<label for="root-element" class="block text-sm font-medium text-gray-700 mb-2">
						Root Element
					</label>
					<SearchSelect
						id="root-element"
						bind:value={rootElement}
						options={rootOptions}
						disabled={availableRoots.length === 0}
						placeholder="-- Select root element --"
						searchPlaceholder="Search root elements…"
						emptyMessage="No matching root element"
					/>
					<p class="mt-2 text-xs text-gray-500">
						{#if availableRoots.length > 0}
							Auto-detected from the uploaded schema. Header roots (transport header / application header) are
							auto-mapped from the message front. Select the body root, e.g.
							<code class="font-mono bg-gray-100 px-1 rounded">error body</code>.
						{:else}
							Upload a schema file to populate the root elements.
						{/if}
					</p>
				</div>

				<!-- Message Direction -->
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Message Direction (header mapping)
					</span>
					<div class="grid grid-cols-3 gap-3">
						<label class="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={messageDirection}
								value="auto"
								class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<span class="text-gray-800 text-sm font-medium">Auto</span>
						</label>
						<label class="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 cursor-pointer hover:from-emerald-100 hover:to-teal-100 transition-all">
							<input
								type="radio"
								bind:group={messageDirection}
								value="request"
								class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
							/>
							<span class="text-gray-800 text-sm font-medium">Request</span>
						</label>
						<label class="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 cursor-pointer hover:from-sky-100 hover:to-blue-100 transition-all">
							<input
								type="radio"
								bind:group={messageDirection}
								value="response"
								class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300"
							/>
							<span class="text-gray-800 text-sm font-medium">Response</span>
						</label>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						{#if messageDirection === 'auto'}
							Auto-detects request vs response by trying <code class="font-mono bg-gray-100 px-1 rounded">transport header</code> (request) then
							<code class="font-mono bg-gray-100 px-1 rounded">transport header (response)</code> (response). The transport header always starts at the first
							character and is accepted when its <code class="font-mono bg-gray-100 px-1 rounded">the signature field</code> is <code class="font-mono bg-gray-100 px-1 rounded">the expected value</code> (len 5);
							<code class="font-mono bg-gray-100 px-1 rounded">the length field</code> is used to find the body start.
						{:else}
							Maps the <code class="font-mono bg-gray-100 px-1 rounded">{messageDirection === 'request' ? 'transport header' : 'transport header (response)'}</code> header
							first (it always starts at the first character), then parses the remaining bytes as the body. Requires both the header schema and the body schema to be loaded (see "Merge schemas" below).
						{/if}
					</p>
					<div class="mt-3 flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="map-abcs-header"
							bind:checked={mapSecondaryHeader}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="map-abcs-header" class="ml-3 block text-sm text-gray-700 font-medium">
							Also map the application header layer (<code class="font-mono bg-gray-100 px-1 rounded">application header</code>/<code class="font-mono bg-gray-100 px-1 rounded">application header (response)</code>, <code class="font-mono bg-gray-100 px-1 rounded">the length field</code>) after the transport header
						</label>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						The application header layer is auto-detected: it is only mapped when its <code class="font-mono bg-gray-100 px-1 rounded">the length field</code>
						is a sane length, so messages without it (e.g. starting directly with the transport header) still parse correctly.
						The message order is <code class="font-mono bg-gray-100 px-1 rounded">transport header</code> → <code class="font-mono bg-gray-100 px-1 rounded">application header</code> → <code class="font-mono bg-gray-100 px-1 rounded">ABCSBody</code>.
					</p>
				</div>
			</div>
		</section>


		<!-- Binary Input Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:edit" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Binary Segment Input</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<!-- Input mode selector -->
				<div>
					<div class="block text-sm font-medium text-gray-700 mb-3">Input Source</div>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="file"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:file" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Binary File (.bin)</span>
							</div>
						</label>
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="hex"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi:hexagon-multiple-outline" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Hex String</span>
							</div>
						</label>
						<label class="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all">
							<input
								type="radio"
								bind:group={inputMode}
								value="base64"
								class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:lock-open" class="h-5 w-5 text-indigo-600" />
								<span class="text-gray-800 font-medium">Base64 String</span>
							</div>
						</label>
					</div>
				</div>

				<!-- Binary file upload -->
				{#if inputMode === 'file'}
					<div>
						<label for="abcs-binary" class="block text-sm font-medium text-gray-700 mb-2">
							Binary Segment File (.bin)
						</label>
						<input
							type="file"
							id="abcs-binary"
							onchange={handleBinaryUpload}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
						/>
						{#if binaryFile}
							<div class="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
									<p class="text-green-700 font-medium">
										Loaded: {binaryFileName} ({(binaryFileSize / 1024).toFixed(1)} KB)
									</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Hex input -->
				{#if inputMode === 'hex'}
					<div>
						<label for="hex-input" class="block text-sm font-medium text-gray-700 mb-2">
							Hex String (e.g. F1F2F3F4...)
						</label>
						<textarea
							id="hex-input"
							bind:value={hexInput}
							placeholder="Enter hex encoded binary data..."
							class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
						></textarea>
					</div>
				{/if}

				<!-- Base64 input -->
				{#if inputMode === 'base64'}
					<div>
						<label for="base64-input" class="block text-sm font-medium text-gray-700 mb-2">
							Base64 String (or X'...' hex wrapper)
						</label>
						<textarea
							id="base64-input"
							bind:value={base64Input}
							placeholder="Enter base64 encoded data, or X'C1C2C3...'"
							class="w-full h-32 rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
						></textarea>
					</div>
				{/if}
			</div>
		</section>


		<!-- Options Section -->
		<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Parsing Options</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="default-encoding" class="block text-sm font-medium text-gray-700 mb-2">
							Default Encoding
						</label>
						<select
							id="default-encoding"
							bind:value={defaultEncoding}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
						>
							<option value="AUTO">Auto-Detect (EBCDIC vs ASCII)</option>
							<option value="EBCDIC">EBCDIC (CP037)</option>
							<option value="ASCII">ASCII</option>
							<option value="UTF-8">UTF-8</option>
							<option value="ISO-8859-1">ISO-8859-1</option>
						</select>
						<p class="mt-2 text-xs text-gray-500">
							Auto-Detect inspects the bytes and picks EBCDIC or ASCII automatically.
							Otherwise used when the schema does not specify <code class="font-mono bg-gray-100 px-1 rounded">dfdl:encoding</code>.
						</p>
					</div>

					<div>
						<label for="byte-order" class="block text-sm font-medium text-gray-700 mb-2">
							Default Byte Order
						</label>
						<select
							id="byte-order"
							bind:value={byteOrder}
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
						>
							<option value="bigEndian">Big Endian (Network)</option>
							<option value="littleEndian">Little Endian</option>
						</select>
						<p class="mt-2 text-xs text-gray-500">
							Used for binary numeric fields when <code class="font-mono bg-gray-100 px-1 rounded">dfdl:byteOrder</code> is not set.
						</p>
					</div>

					<div>
						<label for="byte-offset" class="block text-sm font-medium text-gray-700 mb-2">
							Start Byte Offset
						</label>
						<input
							type="number"
							id="byte-offset"
							bind:value={byteOffset}
							min="0"
							step="1"
							class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all font-mono"
						/>
						<p class="mt-2 text-xs text-gray-500">
							Skip this many bytes before parsing. Use the byte offset of a
							<code class="font-mono bg-gray-100 px-1 rounded">*XXX</code>/<code class="font-mono bg-gray-100 px-1 rounded">..XX</code>
							record marker (shown in the diagnostic below) to parse a single record inside a multi-record
							message. 0 = start at the beginning.
						</p>
					</div>


					<div class="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="strip-pad"
							bind:checked={stripPad}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="strip-pad" class="ml-3 block text-sm text-gray-700 font-medium">
							Strip trailing NULs and whitespace from values
						</label>
					</div>

					<div class="flex items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
						<input
							type="checkbox"
							id="show-debug"
							bind:checked={showDebug}
							class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="show-debug" class="ml-3 block text-sm text-gray-700 font-medium">
							Show debug information (hex dump & EBCDIC view)
						</label>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						onclick={processParsing}
						disabled={loading}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:play" class="h-4 w-4" />
							<span>{#if loading}Converting...{:else}Convert Segment to JSON{/if}</span>
						</span>
					</button>

					<button
						onclick={resetForm}
						class="group relative overflow-hidden rounded-lg bg-gray-500 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-600 hover:shadow-lg"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:refresh" class="h-4 w-4" />
							<span>Reset</span>
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

		{#if parseWarning}
			<section class="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
				<div class="bg-gradient-to-r from-amber-500 to-yellow-500 p-4">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:alert" class="h-5 w-5 text-white" />
						<h3 class="text-lg font-bold text-white">Parse Warning</h3>
					</div>
				</div>
				<div class="p-6">
					<div class="flex items-start space-x-3">
						<div class="rounded-full bg-amber-100 p-2 shrink-0">
							<Icon icon="mdi-light:alert-circle" class="h-6 w-6 text-amber-600" />
						</div>
						<p class="text-amber-800 font-medium">{parseWarning}</p>
					</div>
				</div>
			</section>
		{/if}


		<!-- Missing Types / Included Schemas Warning -->
		{#if missingTypes.length}
			<section class="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
				<div class="bg-gradient-to-r from-orange-500 to-red-500 p-4">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi:file-alert-outline" class="h-5 w-5 text-white" />
						<h3 class="text-lg font-bold text-white">Missing Schema Dependencies</h3>
					</div>
				</div>
				<div class="p-6 space-y-3">
					<p class="text-orange-900 font-medium">
						The loaded schema references types that were not found. This usually means the
						<code class="font-mono bg-orange-100 px-1 rounded">xsd:include</code> /
						<code class="font-mono bg-orange-100 px-1 rounded">xsd:import</code> files haven't been uploaded yet.
						Upload each missing file — it will be auto-merged with the active schema.
					</p>
					<div class="bg-white rounded-xl border border-orange-200 overflow-hidden">
						<table class="w-full text-sm">
							<thead class="bg-orange-50">
								<tr>
									<th class="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Field</th>
									<th class="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Missing Type</th>
									<th class="px-4 py-2 text-left text-xs font-semibold text-orange-700 uppercase">Effect</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-orange-100">
								{#each missingTypes.slice(0, 20) as mt}
									<tr class="hover:bg-orange-50">
										<td class="px-4 py-2 font-mono text-gray-700">{mt.elementName}</td>
										<td class="px-4 py-2 font-mono text-red-600 font-semibold">{mt.typeName}</td>
										<td class="px-4 py-2 text-gray-500 text-xs">decoded as raw string</td>
									</tr>
								{/each}
								{#if missingTypes.length > 20}
									<tr>
										<td colspan="3" class="px-4 py-2 text-xs text-gray-400 italic">
											…and {missingTypes.length - 20} more
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
					<p class="text-xs text-orange-700 mt-1">
						For this schema (<code class="font-mono bg-orange-100 px-1 rounded">the error schema</code>), upload and store:
						<strong>the application header schema</strong>, <strong>the data-types schema</strong>, and a transport header schema
						(<strong>transport header.xsd</strong> / <strong>transport header (response).xsd</strong>), then click
						<em>Auto (header + body)</em> to merge them all before converting.
					</p>
				</div>
			</section>
		{/if}

		<!-- Results Section -->
		{#if results}
			<section class="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
				<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Conversion Results</h2>
						</div>
						<div class="flex gap-2">
							<button
								onclick={downloadJson}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:download" class="h-4 w-4" />
									<span>Download JSON</span>
								</span>
							</button>
							<button
								onclick={downloadDebug}
								class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<span class="relative z-10 flex items-center space-x-2">
									<Icon icon="mdi-light:download" class="h-4 w-4" />
									<span>Download Debug</span>
								</span>
							</button>
						</div>
					</div>
				</div>
				<div class="p-6 space-y-6">
					<!-- Parsing Info -->
					<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
						<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
							<Icon icon="mdi-light:information" class="h-5 w-5 text-indigo-600" />
							<span>Conversion Information</span>
						</h3>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Root Element:</span>
								<div class="text-gray-900 mt-1 font-mono">
									{#if isSegmentsMode}All segments{:else}{results.rootElement}{/if}
								</div>
							</div>
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Total Bytes:</span>
								<div class="text-gray-900 mt-1">{isSegmentsMode ? results.totalBytes : results.debug.totalBytes}</div>
							</div>
							{#if isSegmentsMode}
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<span class="font-medium text-indigo-700">Segments:</span>
									<div class="text-gray-900 mt-1">{results.segments.length}</div>
								</div>
							{:else}
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<span class="font-medium text-indigo-700">Consumed Bytes:</span>
									<div class="text-gray-900 mt-1">{results.debug.consumedBytes}</div>
								</div>
							{/if}
							<div class="bg-white rounded-lg p-3 border border-indigo-100">
								<span class="font-medium text-indigo-700">Fields Parsed:</span>
								<div class="text-gray-900 mt-1">{flatFields.length}</div>
							</div>
						</div>
					<p class="text-xs text-indigo-700/80 mt-3 flex items-center gap-1.5">
						<Icon icon="mdi-light:information" class="h-4 w-4 shrink-0" />
						<span>
							DFDL/Daffodil-compatible parsing: honors <code class="font-mono bg-white px-1 rounded">dfdl:lengthUnits</code> (bytes/characters/bits),
							field-level <code class="font-mono bg-white px-1 rounded">initiator</code>/<code class="font-mono bg-white px-1 rounded">terminator</code> (in the field's encoding),
							<code class="font-mono bg-white px-1 rounded">trimKind</code>/<code class="font-mono bg-white px-1 rounded">trimValue</code>,
							IBM packed-decimal (COMP-3) fields, hex-binary filler fields, and
							<code class="font-mono bg-white px-1 rounded">xsd:choice</code> (first matching branch, like Daffodil).
						</span>
					</p>

					</div>


					<!-- Header Mapping -->
					{#if results.headers && results.headers.length}
						<div class="space-y-4">
							{#each results.headers as h, hi}
								<div class="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden">
									<div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200 flex items-center justify-between">
										<div class="flex items-center space-x-3">
											<Icon icon="mdi:package-variant-closed" class="h-5 w-5 text-indigo-600 shrink-0" />
											<div>
												<div class="font-semibold text-gray-800">
													Mapped Header {hi + 1}: <span class="font-mono text-indigo-700">{h.root}</span>
													<span class="ml-2 inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
														{h.layer?.label ? h.layer.label : (messageDirection === 'auto' ? (h.declaredSane ? 'auto' : '') : messageDirection)}
													</span>
												</div>
												<div class="text-xs text-gray-500 font-mono">
													{h.length} bytes (declared {h.declaredLength ?? '—'}) · {h.consumedBytes} consumed · {h.debug.detectedEncoding}
													{#if h.layer && h.layer.signatureField}
<span class="ml-2 {h.signatureOk ? 'text-green-600' : 'text-red-500 font-semibold'}">
{h.layer.signatureField} = {JSON.stringify(h.signatureRaw)}{h.signatureOk ? ' ✓' : ' ✗ (expected ' + h.layer.signatureValue + ')'}
</span>
{/if}
													
												</div>
											</div>
										</div>
									</div>
									<pre class="text-xs bg-gray-50 p-4 overflow-x-auto max-h-72 overflow-y-auto font-mono whitespace-pre">{JSON.stringify(h.json, null, 2)}</pre>
								</div>
							{/each}
						</div>
					{/if}


					<!-- JSON Output -->
					{#if isSegmentsMode}
						{#if results.segments.length === 0}
							<div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:alert" class="h-5 w-5 text-yellow-600 shrink-0" />
									<p class="text-yellow-800 text-sm font-medium">
										No segments were detected. The schema root elements have no matching initiators in this data. Check that the schema roots declare <code class="font-mono bg-white px-1 rounded">dfdl:initiator</code> (e.g. <code class="font-mono bg-white px-1 rounded">..K1</code>), or pick a single root element and set the <em>Start Byte Offset</em> below.
									</p>
								</div>
							</div>
							{#if detectedMarkers.length > 0}
								<div class="bg-white/60 rounded-lg p-3 border border-yellow-200">
									<p class="text-yellow-800 text-xs font-semibold mb-2">
										Record markers found in the data (no schema root matched these):
									</p>
									<div class="flex flex-wrap gap-2">
										{#each detectedMarkers as mk}
											<span class="font-mono text-[11px] bg-yellow-100 text-yellow-900 px-2 py-1 rounded">
												{mk.text} @ byte {mk.position}
											</span>
										{/each}
									</div>
									<p class="text-yellow-800 text-xs mt-2">
										To parse a record at one of these markers, pick the matching root element and enter that byte
										offset in <em>Start Byte Offset</em> (note: if the marker is the record's initiator, add its
										length, e.g. <code class="font-mono bg-white px-1 rounded">*DSP</code> = 4 bytes).
									</p>
								</div>
							{/if}


						{/if}
						{#each results.segments as seg, idx}
							<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
								<div class="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center justify-between">
									<div class="flex items-center space-x-3">
										<Icon icon="mdi:code-json" class="h-5 w-5 text-indigo-600 shrink-0" />
										<div>
											<div class="font-semibold text-gray-800">
												Segment {idx + 1}: <span class="font-mono text-indigo-700">{seg.rootName}</span>
											</div>
											<div class="text-xs text-gray-500 font-mono">
												{seg.initiator} @ byte {seg.offset} · {seg.length} bytes
											</div>
										</div>
									</div>
									<button
										onclick={() => downloadSegmentJson(seg, idx)}
										class="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-600"
									>
										Download
									</button>
								</div>
								<pre class="text-xs bg-gray-50 p-4 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre">{JSON.stringify(seg.json, null, 2)}</pre>
							</div>
						{/each}
					{:else}
						<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
							<h3 class="text-lg font-semibold text-gray-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center space-x-2">
								<Icon icon="mdi:code-json" class="h-5 w-5 text-indigo-600" />
								<span>JSON Infoset</span>
							</h3>
							<pre class="text-xs bg-gray-50 p-4 rounded border-b border-gray-200 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre">{JSON.stringify(
								results.mode === 'header+single' && results.headers && results.headers.length
									? {
											...Object.fromEntries(results.headers.map(h => {
												const value = h.json && typeof h.json === 'object' ? h.json : {};
												return [h.root, value[h.root] ?? value];
											})),
											...(results.json || {})
										}
									: results.json,
								null, 2)}</pre>
						</div>
					{/if}

					<!-- Flattened Fields -->
					<div class="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
						<h3 class="text-lg font-semibold text-gray-800 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-gray-200 flex items-center space-x-2">
							<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
							<span>Parsed Fields</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Field Path</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Value</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Length (XSD)</th>
										<th class="px-4 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">Value Length</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each flatFields as field}
										<tr class="hover:bg-indigo-50 transition-colors">
											<td class="px-4 py-3 text-sm font-mono text-gray-700">{field.path}</td>
											<td class="px-4 py-3 text-sm text-indigo-600 font-mono font-semibold">{field.value}</td>
											<td class="px-4 py-3 text-sm font-mono text-gray-700">
												{#if field.xsdLength != null}{field.xsdLength}{:else}<span class="text-gray-400">—</span>{/if}
											</td>
											<td class="px-4 py-3 text-sm font-mono text-gray-700">
												{#if field.valueLength != null}{field.valueLength}{:else}<span class="text-gray-400">—</span>{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Debug Information -->
					{#if showDebug}
						<div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
							<h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
								<Icon icon="mdi-light:bug" class="h-5 w-5 text-indigo-600" />
								<span>Debug Information</span>
							</h3>
							<div class="space-y-4">
								<div class="bg-white rounded-lg p-3 border border-indigo-100">
									<h4 class="font-medium text-gray-700 mb-2">
										Detected Encoding: <span class="font-mono text-indigo-600">{isSegmentsMode ? results.detectedEncoding : results.debug.detectedEncoding}</span>
									</h4>
								</div>
								{#if isSegmentsMode}
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">
											Preamble (before first segment, {results.preambleLength} bytes):
										</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.preamble}</pre>
									</div>
									{#each results.segments as seg, idx}
										<div class="bg-white rounded-lg p-3 border border-indigo-100">
											<h4 class="font-medium text-gray-700 mb-2">
												Segment {idx + 1}: <span class="font-mono text-indigo-600">{seg.rootName}</span>
												<span class="text-gray-500 font-mono text-xs">({seg.initiator} @ byte {seg.offset}, {seg.length} bytes)</span>
											</h4>
											<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{seg.debug.decodedView}</pre>
										</div>
									{/each}
								{:else}
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">Decoded View:</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.decodedView}</pre>
									</div>
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">Hex Dump:</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.hexDump}</pre>
									</div>
									<div class="bg-white rounded-lg p-3 border border-indigo-100">
										<h4 class="font-medium text-gray-700 mb-2">EBCDIC View (reference):</h4>
										<pre class="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto max-h-32 overflow-y-auto font-mono break-all">{results.debug.ebcdicView}</pre>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</main>

