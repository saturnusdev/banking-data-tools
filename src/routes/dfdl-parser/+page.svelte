<script>
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';
	import { confirmOnLeave } from '#lib/navigation-guard';

	// EBCDIC Hex Table
	const ebcdicTable = {
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
		'0D': '\r',
		'0E': '<SO>',
		'0F': '<SI>',
		'10': '<DLE>',
		'11': '<DC1>',
		'12': '<DC2>',
		'13': '<DC3>',
		'14': '<RES/ENP>',
		'15': '<NL>',
		'16': '<BS>',
		'17': '<POC>',
		'18': '<CAN>',
		'19': '<EM>',
		'1A': '<UBS>',
		'1B': '<CU1>',
		'1C': '<IFS>',
		'1D': '<IGS>',
		'1E': '<IRS>',
		'1F': '<ITB/IUS>',
		'20': '<DS>',
		'21': '<SOS>',
		'22': '<FS>',
		'23': '<WUS>',
		'24': '<BYP/INP>',
		'25': '<LF>',
		'26': '<ETB>',
		'27': '<ESC>',
		'28': '<SA>',
		'29': '<SFE>',
		'2A': '<SM/SW>',
		'2B': '<CSP>',
		'2C': '<MFA>',
		'2D': '<ENQ>',
		'2E': '<ACK>',
		'2F': '<BEL>',
		'30': '',
		'31': '',
		'32': '<SYN>',
		'33': '<IR>',
		'34': '<PP>',
		'35': '<TRN>',
		'36': '<NBS>',
		'37': '<EOT>',
		'38': '<SBS>',
		'39': '<IT>',
		'3A': '<RFF>',
		'3B': '<CU3>',
		'3C': '<DC4>',
		'3D': '<NAK>',
		'3E': '',
		'3F': '<SUB>',
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
		A1: '~',
		A2: 's',
		A3: 't',
		A4: 'u',
		A5: 'v',
		A6: 'w',
		A7: 'x',
		A8: 'y',
		A9: 'z',
		C1: 'A',
		C2: 'B',
		C3: 'C',
		C4: 'D',
		C5: 'E',
		C6: 'F',
		C7: 'G',
		C8: 'H',
		C9: 'I',
		D1: 'J',
		D2: 'K',
		D3: 'L',
		D4: 'M',
		D5: 'N',
		D6: 'O',
		D7: 'P',
		D8: 'Q',
		D9: 'R',
		E2: 'S',
		E3: 'T',
		E4: 'U',
		E5: 'V',
		E6: 'W',
		E7: 'X',
		E8: 'Y',
		E9: 'Z',
		F0: '0',
		F1: '1',
		F2: '2',
		F3: '3',
		F4: '4',
		F5: '5',
		F6: '6',
		F7: '7',
		F8: '8',
		F9: '9'
	};

	let base64Input = '';
	let dfdlFile = null;
	let headerLength = 688;
	let stripTrailing = false;
	let useHeader = false;
	let headerFile = null;
	let dataTypeFile = null;
	let dspHeaderFile = null;
	let headerResolvedLength = null;
	let results = null;
	let loading = false;
	let error = '';
	let storedFiles = [];
	let selectedStoredFile = '';
	let parseType = 'response'; // 'request' or 'response'

	// Stored header schema files (DSP header, MBase header, DataTypes)
	let storedDspHeaders = [];
	let storedMbaseHeaders = [];
	let storedDataTypes = [];
	let selectedStoredDsp = '';
	let selectedStoredMbase = '';
	let selectedStoredDatatype = '';

	// Load stored files on component mount
	onMount(() => {
		loadStoredFiles();
		loadStoredHeaders();
	});

	function loadStoredFiles() {
		const stored = localStorage.getItem('dfdl-files');
		if (stored) {
			storedFiles = JSON.parse(stored);
		}
	}

	function saveStoredFiles() {
		localStorage.setItem('dfdl-files', JSON.stringify(storedFiles));
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

		// Check if file already exists
		const existingIndex = storedFiles.findIndex((f) => f.name === file.name);
		if (existingIndex !== -1) {
			// Update existing file
			storedFiles[existingIndex] = fileInfo;
		} else {
			// Add new file
			storedFiles.push(fileInfo);
		}

		saveStoredFiles();
		return fileInfo;
	}

	function selectStoredFile(fileName) {
		const file = storedFiles.find((f) => f.name === fileName);
		if (file) {
			// Create a File object from stored content
			const blob = new Blob([file.content], { type: 'application/xml' });
			dfdlFile = new File([blob], file.name, { type: 'application/xml' });
			selectedStoredFile = fileName;
			error = '';
		}
	}

	function deleteStoredFile(fileName) {
		storedFiles = storedFiles.filter((f) => f.name !== fileName);
		saveStoredFiles();
		if (selectedStoredFile === fileName) {
			selectedStoredFile = '';
			dfdlFile = null;
		}
	}

	// ---- Stored header schema files (DSP header, MBase header, DataTypes) ----
	function getStoredHeaderKey(kind) {
		if (kind === 'dsp') return 'dfdl-dspheaders';
		if (kind === 'mbase') return 'dfdl-mbaseheaders';
		return 'dfdl-datatypes';
	}

	function getStoredHeaderList(kind) {
		if (kind === 'dsp') return storedDspHeaders;
		if (kind === 'mbase') return storedMbaseHeaders;
		return storedDataTypes;
	}

	function loadStoredHeaders() {
		const dsp = localStorage.getItem('dfdl-dspheaders');
		if (dsp) storedDspHeaders = JSON.parse(dsp);
		const mbase = localStorage.getItem('dfdl-mbaseheaders');
		if (mbase) storedMbaseHeaders = JSON.parse(mbase);
		const dt = localStorage.getItem('dfdl-datatypes');
		if (dt) storedDataTypes = JSON.parse(dt);
	}

	function saveStoredHeaderKind(kind) {
		localStorage.setItem(getStoredHeaderKey(kind), JSON.stringify(getStoredHeaderList(kind)));
	}

	async function storeHeaderFile(kind, file) {
		const fileContent = await file.text();
		const fileInfo = {
			name: file.name,
			content: fileContent,
			size: file.size,
			lastModified: file.lastModified,
			uploadedAt: new Date().toISOString()
		};
		const list = getStoredHeaderList(kind);
		const existingIndex = list.findIndex((f) => f.name === file.name);
		if (existingIndex !== -1) {
			list[existingIndex] = fileInfo;
		} else {
			list.push(fileInfo);
		}
		saveStoredHeaderKind(kind);
		return fileInfo;
	}

	function selectStoredHeaderFile(kind, fileName) {
		const file = getStoredHeaderList(kind).find((f) => f.name === fileName);
		if (file) {
			const blob = new Blob([file.content], { type: 'application/xml' });
			const newFile = new File([blob], file.name, { type: 'application/xml' });
			if (kind === 'dsp') {
				dspHeaderFile = newFile;
				selectedStoredDsp = fileName;
			} else if (kind === 'mbase') {
				headerFile = newFile;
				selectedStoredMbase = fileName;
			} else {
				dataTypeFile = newFile;
				selectedStoredDatatype = fileName;
			}
			error = '';
			recomputeHeaderResolvedLength();
		}
	}

	function deleteStoredHeaderFile(kind, fileName) {
		const list = getStoredHeaderList(kind).filter((f) => f.name !== fileName);
		if (kind === 'dsp') {
			storedDspHeaders = list;
			if (selectedStoredDsp === fileName) {
				selectedStoredDsp = '';
				dspHeaderFile = null;
			}
		} else if (kind === 'mbase') {
			storedMbaseHeaders = list;
			if (selectedStoredMbase === fileName) {
				selectedStoredMbase = '';
				headerFile = null;
			}
		} else {
			storedDataTypes = list;
			if (selectedStoredDatatype === fileName) {
				selectedStoredDatatype = '';
				dataTypeFile = null;
			}
		}
		saveStoredHeaderKind(kind);
	}

	function hexToEBCDIC(hexStr) {
		let output = '';
		for (let i = 0; i < hexStr.length; i += 2) {
			const byte = hexStr.substr(i, 2).toUpperCase();
			output += ebcdicTable[byte] || '.';
		}
		return output;
	}

	async function parseDFDLXML(xmlContent) {
		try {
			// Use DOMParser for browser compatibility instead of xml2js
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

			// Check for XML parsing errors
			const parseError = xmlDoc.getElementsByTagName('parsererror');
			if (parseError.length > 0) {
				throw new Error('Invalid XML format');
			}

			// Find complexType elements
			const complexTypes = xmlDoc.getElementsByTagName('xsd:complexType');
			let targetType = null;

			// Search for RQTYPE or RSTYPE based on parseType
			const searchType = parseType === 'request' ? 'rqtype' : 'rstype';

			for (let i = 0; i < complexTypes.length; i++) {
				const complexType = complexTypes[i];
				const name = complexType.getAttribute('name');
				if (name && name.toLowerCase().includes(searchType)) {
					targetType = complexType;
					break;
				}
			}

			if (!targetType) {
				throw new Error(`No ${searchType.toUpperCase()} found in DFDL schema`);
			}

			// Get sequence elements
			const sequences = targetType.getElementsByTagName('xsd:sequence');
			if (sequences.length === 0) {
				throw new Error(`No xsd:sequence found in ${searchType.toUpperCase()}`);
			}

			const elements = sequences[0].getElementsByTagName('xsd:element');
			const elementArray = [];

			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				const name = element.getAttribute('name');
				const length = element.getAttribute('dfdl:length');

				elementArray.push({
					$: {
						name: name,
						'dfdl:length': length || '26'
					}
				});
			}

			return elementArray;
		} catch (err) {
			throw new Error(`Failed to parse DFDL XML: ${err.message}`);
		}
	}

	async function processParsing() {
		if (!base64Input.trim()) {
			error = 'Please enter base64 input';
			return;
		}

		if (!dfdlFile) {
			error = 'Please upload a DFDL schema file';
			return;
		}

		loading = true;
		error = '';
		results = null;

		try {
			// Parse DFDL schema
			const dfdlContent = await dfdlFile.text();
			const schemaFields = await parseDFDLXML(dfdlContent);

			// Decode base64 and convert to hex
			const responseDecoded = atob(base64Input);
			const cleaned = responseDecoded.replace(/X'/g, '').replace(/'/g, '');

			// Resolve the header lengths (DSP header map -> MBase header map -> body map)
			const headerInfo = await resolveHeaderLength();
			headerLength = headerInfo.length;

			// Convert hex to EBCDIC
			const ebcdicText = hexToEBCDIC(cleaned);

			// Expected body length = sum of DFDL schema field lengths
			const expectedBodyLength = schemaFields.reduce(
				(sum, el) => sum + (parseInt(el['$']['dfdl:length'] || '26') || 0),
				0
			);

			// Split the body from the END: count expectedBodyLength characters from the right so
			// the body is aligned to the end of the message. The header (DSP + MBase) is the part
			// before the body.
			const bodyStart = Math.max(0, ebcdicText.length - expectedBodyLength);
			const body = ebcdicText.slice(bodyStart);
			const headerEbcdic = ebcdicText.slice(0, bodyStart);

			// 1. Parse the DSP header fields (name and length map, parsed first)
			const dspHeaderFields = {};
			if (headerInfo.dspFields.length > 0) {
				let dspCursor = 0;
				for (const hf of headerInfo.dspFields) {
					const rawValue = headerEbcdic.substring(dspCursor, dspCursor + hf.length);
					dspHeaderFields[hf.name] = {
						value: rawValue,
						rawValue: rawValue,
						length: rawValue.length,
						expectedLength: hf.length
					};
					dspCursor += hf.length;
				}
			}

			// 2. Parse the MBase header fields (after the DSP header)
			const headerFields = {};
			if (headerInfo.fields.length > 0) {
				let headerCursor = headerInfo.dspLength;
				for (const hf of headerInfo.fields) {
					const rawValue = headerEbcdic.substring(headerCursor, headerCursor + hf.length);
					headerFields[hf.name] = {
						value: rawValue,
						rawValue: rawValue,
						length: rawValue.length,
						expectedLength: hf.length
					};
					headerCursor += hf.length;
				}
			}

			// 3. Parse fields based on DFDL schema
			let cursor = 0;
			const fields = {};

			for (const el of schemaFields) {
				const name = el['$'].name;
				const len = parseInt(el['$']['dfdl:length'] || '26');
				const rawValue = body.substring(cursor, cursor + len);
				const value = stripTrailing ? rawValue.trim().replace(/^0+/, '') || '0' : rawValue;
				fields[name] = {
					value: value,
					rawValue: rawValue,
					length: rawValue.length,
					expectedLength: len
				};
				cursor += len;
			}

			results = {
				parsingInfo: {
					responseLength: base64Input.length,
					headerLength: headerLength,
					dspHeaderLength: headerInfo.dspLength,
					mbaseHeaderLength: headerInfo.mbaseLength,
					bodyLength: body.length,
					expectedBodyLength: expectedBodyLength,
					stripTrailing: stripTrailing,
					useHeader: useHeader,
					dspHeaderFileName: dspHeaderFile ? dspHeaderFile.name : '',
					headerFileName: headerFile ? headerFile.name : '',
					dataTypeFileName: dataTypeFile ? dataTypeFile.name : '',
					dspHeaderFieldsCount: Object.keys(dspHeaderFields).length,
					headerFieldsCount: Object.keys(headerFields).length
				},
				fields: fields,
				headerFields: headerFields,
				dspHeaderFields: dspHeaderFields,
				debugInfo: {
					base64Input: base64Input,
					decodedHex: cleaned,
					ebcdicFull: ebcdicText,
					ebcdicBody: body,
					ebcdicHeader: headerEbcdic,
					ebcdicDspHeader: headerEbcdic.slice(0, headerInfo.dspLength),
					ebcdicMbaseHeader: headerEbcdic.slice(headerInfo.dspLength),
					headerContent: headerInfo.content,
					dspHeaderContent: headerInfo.dspContent
				}
			};
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleFileUpload(event) {
		const file = event.target.files[0];
		if (file && (file.name.endsWith('.xml') || file.name.endsWith('.xsd'))) {
			dfdlFile = file;
			await storeFile(file);
			selectedStoredFile = file.name;
			error = '';
		} else {
			error = 'Please upload a valid XML/XSD DFDL schema file';
		}
	}

	async function recomputeHeaderResolvedLength() {
		headerResolvedLength = null;
		if (useHeader && (headerFile || dspHeaderFile)) {
			try {
				const info = await resolveHeaderLength();
				headerResolvedLength = info.length;
			} catch (e) {
				// Validation happens on parse; ignore here
			}
		}
	}

	async function handleHeaderUpload(event) {
		const file = event.target.files[0];
		if (file) {
			headerFile = file;
			error = '';
			await storeHeaderFile('mbase', file);
			selectedStoredMbase = file.name;
			await recomputeHeaderResolvedLength();
		}
	}

	async function handleDataTypeUpload(event) {
		const file = event.target.files[0];
		if (file) {
			dataTypeFile = file;
			error = '';
			await storeHeaderFile('datatype', file);
			selectedStoredDatatype = file.name;
			await recomputeHeaderResolvedLength();
		}
	}

	async function handleDSPHeaderUpload(event) {
		const file = event.target.files[0];
		if (file) {
			dspHeaderFile = file;
			error = '';
			await storeHeaderFile('dsp', file);
			selectedStoredDsp = file.name;
			await recomputeHeaderResolvedLength();
		}
	}

	// Resolve the length of an element type from the schema document (used for header elements
	// that do not declare an explicit dfdl:length).
	function resolveTypeLengthInDoc(xmlDoc, typeName) {
		if (!typeName) return NaN;
		const findLength = (el) => {
			const len = el.getAttribute('dfdl:length');
			return len ? parseInt(len, 10) : NaN;
		};
		const simpleTypes = xmlDoc.getElementsByTagName('xsd:simpleType');
		for (let i = 0; i < simpleTypes.length; i++) {
			if (simpleTypes[i].getAttribute('name') === typeName) return findLength(simpleTypes[i]);
		}
		const complexTypes = xmlDoc.getElementsByTagName('xsd:complexType');
		for (let i = 0; i < complexTypes.length; i++) {
			if (complexTypes[i].getAttribute('name') === typeName) return findLength(complexTypes[i]);
		}
		return NaN;
	}

	// Parse the header XSD schema (e.g. MBaseHeader.xsd) and compute the total header length by
	// summing the dfdl:length of every element in the header complex type sequence (starting from
	// the first character). Elements without an explicit length default to 26 (matching the body
	// field parsing and the SIBS timestamp definition).
	async function parseHeaderXSD(xmlContent, dataTypesDoc = null) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
		if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
			throw new Error('Invalid header XML format');
		}

		const complexTypes = xmlDoc.getElementsByTagName('xsd:complexType');
		let targetType = null;
		for (let i = 0; i < complexTypes.length; i++) {
			const name = complexTypes[i].getAttribute('name');
			if (name && name.toLowerCase().includes('header')) {
				targetType = complexTypes[i];
				break;
			}
		}
		if (!targetType)
			throw new Error('No header complexType (e.g. MBaseHeaderType) found in header schema');

		const sequences = targetType.getElementsByTagName('xsd:sequence');
		if (sequences.length === 0) throw new Error('No xsd:sequence found in the header type');

		const elements = sequences[0].getElementsByTagName('xsd:element');
		const fields = [];
		let totalLength = 0;

		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			const name = element.getAttribute('name');
			const lengthAttr = element.getAttribute('dfdl:length');
			let length = lengthAttr ? parseInt(lengthAttr, 10) : NaN;
			if (isNaN(length)) {
				const typeName = element.getAttribute('type');
				length = resolveTypeLengthInDoc(xmlDoc, typeName);
				// If the type is not defined in the header schema, resolve it from the
				// attached DFDL DataType standard schema (e.g. DataTypes.xsd)
				if (isNaN(length) && dataTypesDoc) {
					length = resolveTypeLengthInDoc(dataTypesDoc, typeName);
				}
			}
			if (isNaN(length)) length = 26;

			fields.push({ name, length });
			totalLength += length;
		}

		return { fields, totalLength };
	}

	// Find the direct xsd:sequence child of an element (for nested complex types).
	function findDirectSequence(element) {
		const children = element.childNodes;
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			if (node.nodeType !== 1) continue;
			if (node.localName === 'complexType') {
				const ctChildren = node.childNodes;
				for (let j = 0; j < ctChildren.length; j++) {
					const ctNode = ctChildren[j];
					if (ctNode.nodeType === 1 && ctNode.localName === 'sequence') return ctNode;
				}
			}
		}
		return null;
	}

	// Recursively flatten a sequence into leaf fields {name, length} (name and length map),
	// descending into nested complex types and resolving type-based lengths.
	function collectFieldsFromSequence(sequenceEl, fields, dataTypesDoc, schemaDoc) {
		const children = sequenceEl.childNodes;
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			if (node.nodeType !== 1) continue;
			if (node.localName !== 'element') continue;
			const name = node.getAttribute('name');
			const lengthAttr = node.getAttribute('dfdl:length');
			if (lengthAttr) {
				const len = parseInt(lengthAttr, 10);
				fields.push({ name, length: isNaN(len) ? 26 : len });
				continue;
			}
			const nestedSeq = findDirectSequence(node);
			if (nestedSeq) {
				collectFieldsFromSequence(nestedSeq, fields, dataTypesDoc, schemaDoc);
				continue;
			}
			const typeName = node.getAttribute('type');
			let len = resolveTypeLengthInDoc(schemaDoc, typeName);
			if (isNaN(len) && dataTypesDoc) len = resolveTypeLengthInDoc(dataTypesDoc, typeName);
			if (isNaN(len)) len = 26;
			fields.push({ name, length: len });
		}
	}

	// Parse the DSP header schema (e.g. DSPHeader.xsd). Uses DSPHeader for requests and
	// DSPHeaderResponse for responses, then flattens all fields by name and length.
	async function parseDSPHeaderXSD(xmlContent, dataTypesDoc = null) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
		if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
			throw new Error('Invalid DSP header XML format');
		}

		const rootName = parseType === 'request' ? 'DSPHeader' : 'DSPHeaderResponse';
		const elements = xmlDoc.getElementsByTagName('xsd:element');
		let rootEl = null;
		for (let i = 0; i < elements.length; i++) {
			if (elements[i].getAttribute('name') === rootName) {
				rootEl = elements[i];
				break;
			}
		}
		if (!rootEl) throw new Error(`No "${rootName}" element found in DSP header schema`);

		const sequence = findDirectSequence(rootEl);
		if (!sequence) throw new Error('No xsd:sequence found in the DSP header');

		const fields = [];
		collectFieldsFromSequence(sequence, fields, dataTypesDoc, xmlDoc);
		const totalLength = fields.reduce((sum, f) => sum + f.length, 0);
		return { fields, totalLength };
	}

	// Resolve the length of a raw (non-schema) header file by content: X'...' hex, plain hex,
	// base64, or raw byte length.
	function resolveRawHeaderLength(content) {
		const trimmed = content.trim();
		if (trimmed.includes("X'")) {
			return Math.floor(trimmed.replace(/X'/g, '').replace(/'/g, '').replace(/\s/g, '').length / 2);
		}
		if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
			return trimmed.length / 2;
		}
		try {
			return atob(trimmed).length;
		} catch (e) {
			return content.length;
		}
	}

	// Determine the effective header length from the uploaded header files (DSP + MBase).
	// The full DFDL parse is: DSP header map -> MBase header map -> body map.
	// When "Use Header" is disabled the manual Header Length value is used instead.
	async function resolveHeaderLength() {
		if (!useHeader) {
			return {
				length: headerLength,
				content: '',
				fields: [],
				dspFields: [],
				dspContent: '',
				dspLength: 0,
				mbaseLength: 0
			};
		}

		// Optionally load the attached DFDL DataType standard schema (DataTypes.xsd) so that
		// header elements without an explicit dfdl:length can be resolved by their type
		let dataTypesDoc = null;
		if (dataTypeFile) {
			try {
				dataTypesDoc = new DOMParser().parseFromString(await dataTypeFile.text(), 'text/xml');
			} catch (e) {
				// Fall back to defaults if the DataType schema cannot be parsed
			}
		}

		// 1. DSP header map (DSPHeader.xsd) - parsed first
		let dspFields = [];
		let dspContent = '';
		let dspLength = 0;
		if (dspHeaderFile) {
			dspContent = await dspHeaderFile.text();
			const dspSchema = await parseDSPHeaderXSD(dspContent, dataTypesDoc);
			dspFields = dspSchema.fields;
			dspLength = dspSchema.totalLength;
		}

		// 2. MBase header map (MBaseHeader.xsd) - parsed second
		let mbaseFields = [];
		let mbaseContent = '';
		let mbaseLength = 0;
		if (headerFile) {
			mbaseContent = await headerFile.text();
			const trimmed = mbaseContent.trim();
			const looksLikeSchema =
				/\.xsd$/i.test(headerFile.name) ||
				/\.xml$/i.test(headerFile.name) ||
				trimmed.startsWith('<?xml') ||
				trimmed.includes('<xsd:');
			if (looksLikeSchema) {
				const mbaseSchema = await parseHeaderXSD(mbaseContent, dataTypesDoc);
				mbaseFields = mbaseSchema.fields;
				mbaseLength = mbaseSchema.totalLength;
			} else {
				// Raw header file (hex/base64/raw)
				mbaseLength = resolveRawHeaderLength(mbaseContent);
			}
		}

		if (!dspHeaderFile && !headerFile) {
			throw new Error(
				'Please upload a DSP header and/or MBase header file when "Use Header" is enabled'
			);
		}

		return {
			length: dspLength + mbaseLength,
			dspLength,
			mbaseLength,
			content: mbaseContent,
			dspContent,
			fields: mbaseFields,
			dspFields
		};
	}

	function downloadResults() {
		if (!results) return;

		const resultLines = [];
		const parseTypeName = parseType === 'request' ? 'REQUEST' : 'RESPONSE';
		const schemaType = parseType === 'request' ? 'RQTYPE' : 'RSTYPE';

		resultLines.push(`PARSING ----------------------: Base64 Input`);
		resultLines.push(`USING DFDL -------------------: ${schemaType}`);
		resultLines.push(`RESPONSE HEADER LENGTH--------: ${results.parsingInfo.headerLength}`);
		if (results.parsingInfo.useHeader) {
			resultLines.push(`DSP HEADER LENGTH -------------: ${results.parsingInfo.dspHeaderLength}`);
			resultLines.push(`MBASE HEADER LENGTH -----------: ${results.parsingInfo.mbaseHeaderLength}`);
		}
		resultLines.push(
			`USE HEADER ---------------------: ${results.parsingInfo.useHeader ? 'Yes' : 'No'}${results.parsingInfo.useHeader && results.parsingInfo.headerFileName ? ` (${results.parsingInfo.headerFileName})` : ''}`
		);
		if (results.parsingInfo.dataTypeFileName) {
			resultLines.push(`HEADER DATA TYPE SCHEMA -------: ${results.parsingInfo.dataTypeFileName}`);
		}
		resultLines.push(`DFDL BODY LENGTH -------------: ${results.parsingInfo.expectedBodyLength}`);
		resultLines.push(`ACTUAL RESPONSE BODY LENGTH --: ${results.parsingInfo.bodyLength}`);
		resultLines.push(`TRAILING SPACE & 0 -----------: ${results.parsingInfo.stripTrailing}\n`);

		if (results.dspHeaderFields && Object.keys(results.dspHeaderFields).length > 0) {
			resultLines.push(`DSP HEADER FIELDS --------------:\n`);
			for (const [k, v] of Object.entries(results.dspHeaderFields)) {
				resultLines.push(`${k.padEnd(16)}: ${v.value} (length : ${v.length})`);
			}
			resultLines.push('');
		}

		if (results.headerFields && Object.keys(results.headerFields).length > 0) {
			resultLines.push(`HEADER FIELDS ------------------:\n`);
			for (const [k, v] of Object.entries(results.headerFields)) {
				resultLines.push(`${k.padEnd(16)}: ${v.value} (length : ${v.length})`);
			}
			resultLines.push('');
		}

		for (const [k, v] of Object.entries(results.fields)) {
			const value = results.parsingInfo.stripTrailing
				? v.value.trim().replace(/^0+/, '') || '0'
				: v.value;
			resultLines.push(`${k.padEnd(16)}: ${value} (length : ${v.length})`);
		}

		resultLines.push(`\n\nESB_PROVIDER_RES_AUDITIN BASE64 : \n${results.debugInfo.base64Input}`);
		resultLines.push(
			`\n\nESB_PROVIDER_RES_AUDITIN BASE64 DECODE : \n${results.debugInfo.decodedHex}`
		);
		resultLines.push(`\n\nEBCDIC OUTPUT FULL : \n${results.debugInfo.ebcdicFull}`);
		if (results.parsingInfo.useHeader) {
			if (results.debugInfo.ebcdicDspHeader) {
				resultLines.push(`\n\nEBCDIC OUTPUT DSP HEADER : \n${results.debugInfo.ebcdicDspHeader}`);
			}
			if (results.debugInfo.ebcdicMbaseHeader) {
				resultLines.push(
					`\n\nEBCDIC OUTPUT MBASE HEADER : \n${results.debugInfo.ebcdicMbaseHeader}`
				);
			}
		}
		resultLines.push(`\n\nEBCDIC OUTPUT RES BODY : \n${results.debugInfo.ebcdicBody}`);

		const blob = new Blob([resultLines.join('\n')], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `dfdl-${parseType.toLowerCase()}-results.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function resetForm() {
		base64Input = '';
		dfdlFile = null;
		headerLength = 688;
		stripTrailing = false;
		useHeader = false;
		headerFile = null;
		dataTypeFile = null;
		dspHeaderFile = null;
		headerResolvedLength = null;
		results = null;
		error = '';
		selectedStoredFile = '';
		selectedStoredDsp = '';
		selectedStoredMbase = '';
		selectedStoredDatatype = '';
	}

	// Warn before reload / back / forward / swipe / navigating away with unsaved data.
	// Note: locally-stored schema/header files are persisted, so they are NOT
	// treated as unsaved work — only the current session's inputs/results are.
	function hasUnsavedData() {
		return Boolean(dfdlFile) || Boolean(results) || base64Input.trim() !== '';
	}
	confirmOnLeave(hasUnsavedData);
</script>

<main class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
	<!-- Header Section -->
	<header class="border-b border-purple-100 bg-white shadow-lg">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<button
						class="group rounded-full p-2 text-purple-600 transition-all hover:scale-110 hover:bg-purple-100"
						onclick={() => {
							location.href = '/';
						}}
					>
						<Icon
							icon="mdi-light:arrow-left"
							class="h-6 w-6 transition-transform group-hover:-translate-x-1"
						/>
					</button>
					<div class="flex items-center space-x-3">
						<div class="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-3">
							<Icon icon="mdi-light:database" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1
								class="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent"
							>
								DFDL Parser
							</h1>
							<p class="mt-1 text-gray-600">
								Parse base64 encoded data using DFDL schema with EBCDIC conversion
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
		<!-- Parse Type Selection Section -->
		<section class="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:toggle-switch" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Parse Type</h2>
				</div>
			</div>
			<div class="p-6">
				<fieldset class="space-y-4">
					<legend class="mb-4 text-lg font-medium text-gray-700">Select parsing mode</legend>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<label
							class="flex cursor-pointer items-center space-x-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 transition-all hover:from-indigo-100 hover:to-purple-100"
						>
							<input
								type="radio"
								bind:group={parseType}
								value="request"
								class="h-5 w-5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:arrow-up" class="h-5 w-5 text-indigo-600" />
								<span class="font-medium text-gray-800">Request (RQTYPE)</span>
							</div>
						</label>
						<label
							class="flex cursor-pointer items-center space-x-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 transition-all hover:from-indigo-100 hover:to-purple-100"
						>
							<input
								type="radio"
								bind:group={parseType}
								value="response"
								class="h-5 w-5 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:arrow-down" class="h-5 w-5 text-indigo-600" />
								<span class="font-medium text-gray-800">Response (RSTYPE)</span>
							</div>
						</label>
					</div>
				</fieldset>
			</div>
		</section>
		<!-- Input Section -->
		<section class="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:edit" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Data Input</h2>
				</div>
			</div>
			<div class="space-y-6 p-6">
				<!-- Base64 Input -->
				<div>
					<label for="base64-input" class="mb-2 block text-sm font-medium text-gray-700">
						Base64 Input
					</label>
					<textarea
						id="base64-input"
						bind:value={base64Input}
						placeholder="Enter base64 encoded data..."
						class="h-32 w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
					></textarea>
				</div>

				<!-- DFDL File Upload -->
				<div>
					<label for="dfdl-file" class="mb-2 block text-sm font-medium text-gray-700">
						DFDL Schema File (.xml/.xsd)
					</label>

					<!-- Stored Files Dropdown -->
					{#if storedFiles.length > 0}
						<div
							class="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
						>
							<label for="stored-files" class="mb-2 block text-sm font-medium text-gray-700">
								Or select a previously uploaded file:
							</label>
							<div class="flex gap-2">
								<select
									id="stored-files"
									bind:value={selectedStoredFile}
									onchange={() => selectStoredFile(selectedStoredFile)}
									class="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
								>
									<option value="">-- Select stored file --</option>
									{#each storedFiles as file}
										<option value={file.name}
											>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option
										>
									{/each}
								</select>
								{#if selectedStoredFile}
									<button
										onclick={() => deleteStoredFile(selectedStoredFile)}
										class="rounded-xl bg-red-500 px-4 py-3 text-sm text-white transition-all hover:bg-red-600"
										title="Delete stored file"
									>
										Delete
									</button>
								{/if}
							</div>
						</div>
					{/if}

					<!-- File Upload -->
					<input
						type="file"
						id="dfdl-file"
						accept=".xml,.xsd"
						onchange={handleFileUpload}
						class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
					/>
					{#if dfdlFile}
						<div class="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
							<div class="flex items-center space-x-2">
								<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
								<p class="font-medium text-green-700">
									Loaded: {dfdlFile.name}
									{#if storedFiles.find((f) => f.name === dfdlFile.name)}
										<span class="text-xs text-green-600">(stored locally)</span>
									{/if}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Options Section -->
		<section class="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:cog" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">Parsing Options</h2>
				</div>
			</div>
			<div class="space-y-6 p-6">
				<!-- Use Header Checkbox (MBaseHeader) -->
				<div
					class="flex items-center rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
				>
					<input
						type="checkbox"
						id="use-header"
						bind:checked={useHeader}
						class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
					<label for="use-header" class="ml-3 block text-sm font-medium text-gray-700">
						Use Header (DSP Header + MBaseHeader)
					</label>
				</div>

				{#if useHeader}
					<!-- DSP Header File Upload (parsed first) -->
					<div>
						{#if storedDspHeaders.length > 0}
							<div
								class="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
							>
								<label for="stored-dsp" class="mb-2 block text-sm font-medium text-gray-700">
									Or select a previously stored DSP header:
								</label>
								<div class="flex gap-2">
									<select
										id="stored-dsp"
										bind:value={selectedStoredDsp}
										onchange={() => selectStoredHeaderFile('dsp', selectedStoredDsp)}
										class="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
									>
										<option value="">-- Select stored DSP header --</option>
										{#each storedDspHeaders as file}
											<option value={file.name}
												>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option
											>
										{/each}
									</select>
									{#if selectedStoredDsp}
										<button
											onclick={() => deleteStoredHeaderFile('dsp', selectedStoredDsp)}
											class="rounded-xl bg-red-500 px-4 py-3 text-sm text-white transition-all hover:bg-red-600"
											title="Delete stored DSP header"
										>
											Delete
										</button>
									{/if}
								</div>
							</div>
						{/if}
						<label for="dsp-header-file" class="mb-2 block text-sm font-medium text-gray-700">
							DSP Header Schema (DSPHeader.xsd) — parsed first
						</label>
						<input
							type="file"
							id="dsp-header-file"
							onchange={handleDSPHeaderUpload}
							class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
						/>
						{#if dspHeaderFile}
							<div class="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
									<p class="font-medium text-green-700">
										Loaded: {dspHeaderFile.name} ({dspHeaderFile.size} bytes)
										{#if storedDspHeaders.find((f) => f.name === dspHeaderFile.name)}
											<span class="text-xs text-green-600">(stored locally)</span>
										{/if}
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Header File Upload -->
					<div>
						{#if storedMbaseHeaders.length > 0}
							<div
								class="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
							>
								<label for="stored-mbase" class="mb-2 block text-sm font-medium text-gray-700">
									Or select a previously stored MBase header:
								</label>
								<div class="flex gap-2">
									<select
										id="stored-mbase"
										bind:value={selectedStoredMbase}
										onchange={() => selectStoredHeaderFile('mbase', selectedStoredMbase)}
										class="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
									>
										<option value="">-- Select stored MBase header --</option>
										{#each storedMbaseHeaders as file}
											<option value={file.name}
												>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option
											>
										{/each}
									</select>
									{#if selectedStoredMbase}
										<button
											onclick={() => deleteStoredHeaderFile('mbase', selectedStoredMbase)}
											class="rounded-xl bg-red-500 px-4 py-3 text-sm text-white transition-all hover:bg-red-600"
											title="Delete stored MBase header"
										>
											Delete
										</button>
									{/if}
								</div>
							</div>
						{/if}
						<label for="header-file" class="mb-2 block text-sm font-medium text-gray-700">
							Header File (MBaseHeader)
						</label>
						<input
							type="file"
							id="header-file"
							onchange={handleHeaderUpload}
							class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
						/>
						{#if headerFile}
							<div class="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
									<p class="font-medium text-green-700">
										Loaded: {headerFile.name} ({headerFile.size} bytes)
										{#if storedMbaseHeaders.find((f) => f.name === headerFile.name)}
											<span class="text-xs text-green-600">(stored locally)</span>
										{/if}
										{#if headerResolvedLength !== null}
											<span class="ml-2 text-xs font-semibold text-green-600">
												Header Length: {headerResolvedLength}
											</span>
										{/if}
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Header Data Type Schema (DFDL DataType standard, e.g. DataTypes.xsd) -->
					<div>
						{#if storedDataTypes.length > 0}
							<div
								class="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
							>
								<label for="stored-datatype" class="mb-2 block text-sm font-medium text-gray-700">
									Or select a previously stored DataType schema:
								</label>
								<div class="flex gap-2">
									<select
										id="stored-datatype"
										bind:value={selectedStoredDatatype}
										onchange={() => selectStoredHeaderFile('datatype', selectedStoredDatatype)}
										class="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
									>
										<option value="">-- Select stored DataType schema --</option>
										{#each storedDataTypes as file}
											<option value={file.name}
												>{file.name} ({(file.size / 1024).toFixed(1)} KB)</option
											>
										{/each}
									</select>
									{#if selectedStoredDatatype}
										<button
											onclick={() => deleteStoredHeaderFile('datatype', selectedStoredDatatype)}
											class="rounded-xl bg-red-500 px-4 py-3 text-sm text-white transition-all hover:bg-red-600"
											title="Delete stored DataType schema"
										>
											Delete
										</button>
									{/if}
								</div>
							</div>
						{/if}
						<label for="header-data-type" class="mb-2 block text-sm font-medium text-gray-700">
							Header Data Type Schema (DFDL DataType standard, e.g. DataTypes.xsd)
						</label>
						<input
							type="file"
							id="header-data-type"
							onchange={handleDataTypeUpload}
							class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
						/>
						{#if dataTypeFile}
							<div class="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
								<div class="flex items-center space-x-2">
									<Icon icon="mdi-light:check-circle" class="h-5 w-5 text-green-600" />
									<p class="font-medium text-green-700">
										Loaded: {dataTypeFile.name} ({dataTypeFile.size} bytes)
										{#if storedDataTypes.find((f) => f.name === dataTypeFile.name)}
											<span class="text-xs text-green-600">(stored locally)</span>
										{/if}
										<span class="ml-2 text-xs font-semibold text-green-600"
											>Type length resolution enabled</span
										>
									</p>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Header Length Input (hidden when "Use Header" is enabled) -->
					<div>
						<label for="header-length" class="mb-2 block text-sm font-medium text-gray-700">
							Header Length
						</label>
						<input
							type="number"
							id="header-length"
							bind:value={headerLength}
							class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
						/>
					</div>
				{/if}

				<!-- Strip Trailing Checkbox -->
				<div
					class="flex items-center rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
				>
					<input
						type="checkbox"
						id="strip-trailing"
						bind:checked={stripTrailing}
						class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
					/>
					<label for="strip-trailing" class="ml-3 block text-sm font-medium text-gray-700">
						Strip trailing zeros and whitespace
					</label>
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col gap-4 sm:flex-row">
					<button
						onclick={processParsing}
						disabled={loading}
						class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
					>
						<span class="relative z-10 flex items-center space-x-2">
							<Icon icon="mdi-light:play" class="h-4 w-4" />
							<span
								>{#if loading}Processing...{:else}Parse Data{/if}</span
							>
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
			<section
				class="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-rose-50 shadow-xl"
			>
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
						<p class="font-medium text-red-800">{error}</p>
					</div>
				</div>
			</section>
		{/if}
		<!-- Results Section -->
		{#if results}
			<section class="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl">
				<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:file-document" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Parsing Results</h2>
						</div>
						<button
							onclick={downloadResults}
							class="group relative overflow-hidden rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							<span class="relative z-10 flex items-center space-x-2">
								<Icon icon="mdi-light:download" class="h-4 w-4" />
								<span>Download Results</span>
							</span>
						</button>
					</div>
				</div>
				<div class="space-y-6 p-6">
					<!-- Parsing Info -->
					<div
						class="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
					>
						<h3 class="mb-4 flex items-center space-x-2 text-lg font-semibold text-gray-800">
							<Icon icon="mdi-light:information" class="h-5 w-5 text-indigo-600" />
							<span>Parsing Information</span>
						</h3>
						<div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Parse Type:</span>
								<div class="mt-1 text-gray-900">
									{parseType === 'request' ? 'Request (RQTYPE)' : 'Response (RSTYPE)'}
								</div>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Header Length:</span>
								<div class="mt-1 text-gray-900">
									{results.parsingInfo.headerLength}
									{#if results.parsingInfo.useHeader && results.parsingInfo.dspHeaderLength > 0}
										<span class="text-xs text-gray-400">
											(DSP {results.parsingInfo.dspHeaderLength} + MBase {results.parsingInfo
												.mbaseHeaderLength})
										</span>
									{/if}
								</div>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Body Length:</span>
								<div class="mt-1 text-gray-900">{results.parsingInfo.bodyLength}</div>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Strip Trailing:</span>
								<div class="mt-1 text-gray-900">
									{results.parsingInfo.stripTrailing ? 'Yes' : 'No'}
								</div>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Use Header:</span>
								<div class="mt-1 text-gray-900">
									{results.parsingInfo.useHeader ? 'Yes' : 'No'}
									{#if results.parsingInfo.useHeader && results.parsingInfo.headerFileName}
										<span class="text-xs text-gray-400">({results.parsingInfo.headerFileName})</span
										>
									{/if}
									{#if results.parsingInfo.useHeader && results.parsingInfo.dspHeaderFileName}
										<div class="mt-1 text-xs text-gray-400">
											DSP: {results.parsingInfo.dspHeaderFileName}
										</div>
									{/if}
									{#if results.parsingInfo.useHeader && results.parsingInfo.dataTypeFileName}
										<div class="mt-1 text-xs text-gray-400">
											Type: {results.parsingInfo.dataTypeFileName}
										</div>
									{/if}
								</div>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<span class="font-medium text-indigo-700">Fields Parsed:</span>
								<div class="mt-1 text-gray-900">{Object.keys(results.fields).length}</div>
							</div>
						</div>
					</div>

					<!-- DSP Header Fields -->
					{#if results.dspHeaderFields && Object.keys(results.dspHeaderFields).length > 0}
						<div class="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
							<h3
								class="flex items-center space-x-2 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-lg font-semibold text-gray-800"
							>
								<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
								<span>DSP Header Fields</span>
							</h3>
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
										<tr>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Field Name</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Value</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Raw Value</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Length</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Expected</th
											>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200 bg-white">
										{#each Object.entries(results.dspHeaderFields) as [name, field]}
											<tr class="transition-colors hover:bg-indigo-50">
												<td class="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
												<td class="px-4 py-3 font-mono text-sm font-semibold text-indigo-600"
													>{field.value}</td
												>
												<td class="px-4 py-3 font-mono text-xs text-gray-400">{field.rawValue}</td>
												<td class="px-4 py-3 text-sm text-gray-600">{field.length}</td>
												<td class="px-4 py-3 text-sm text-gray-600">{field.expectedLength}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<!-- Header Fields -->
					{#if results.headerFields && Object.keys(results.headerFields).length > 0}
						<div class="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
							<h3
								class="flex items-center space-x-2 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-lg font-semibold text-gray-800"
							>
								<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
								<span>Header Fields (MBaseHeader)</span>
							</h3>
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
										<tr>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Field Name</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Value</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Raw Value</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Length</th
											>
											<th
												class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
												>Expected</th
											>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200 bg-white">
										{#each Object.entries(results.headerFields) as [name, field]}
											<tr class="transition-colors hover:bg-indigo-50">
												<td class="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
												<td class="px-4 py-3 font-mono text-sm font-semibold text-indigo-600"
													>{field.value}</td
												>
												<td class="px-4 py-3 font-mono text-xs text-gray-400">{field.rawValue}</td>
												<td class="px-4 py-3 text-sm text-gray-600">{field.length}</td>
												<td class="px-4 py-3 text-sm text-gray-600">{field.expectedLength}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<!-- Parsed Fields -->
					<div class="overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
						<h3
							class="flex items-center space-x-2 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-lg font-semibold text-gray-800"
						>
							<Icon icon="mdi-light:format-list-bulleted" class="h-5 w-5 text-indigo-600" />
							<span>Parsed Fields</span>
						</h3>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gradient-to-r from-indigo-50 to-purple-50">
									<tr>
										<th
											class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
											>Field Name</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
											>Value</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
											>Raw Value</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
											>Length</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-indigo-700 uppercase"
											>Expected</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each Object.entries(results.fields) as [name, field]}
										<tr class="transition-colors hover:bg-indigo-50">
											<td class="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
											<td class="px-4 py-3 font-mono text-sm font-semibold text-indigo-600"
												>{field.value}</td
											>
											<td class="px-4 py-3 font-mono text-sm text-xs text-gray-400"
												>{field.rawValue}</td
											>
											<td class="px-4 py-3 text-sm text-gray-600">{field.length}</td>
											<td class="px-4 py-3 text-sm text-gray-600">{field.expectedLength}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Debug Information -->
					<div
						class="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4"
					>
						<h3 class="mb-4 flex items-center space-x-2 text-lg font-semibold text-gray-800">
							<Icon icon="mdi-light:bug" class="h-5 w-5 text-indigo-600" />
							<span>Debug Information</span>
						</h3>
						<div class="space-y-4">
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<h4 class="mb-2 font-medium text-gray-700">Decoded Hex:</h4>
								<pre
									class="overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs">{results
										.debugInfo.decodedHex}</pre>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<h4 class="mb-2 font-medium text-gray-700">EBCDIC Full Output:</h4>
								<pre
									class="max-h-32 overflow-x-auto overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs">{results
										.debugInfo.ebcdicFull}</pre>
							</div>
							<div class="rounded-lg border border-indigo-100 bg-white p-3">
								<h4 class="mb-2 font-medium text-gray-700">EBCDIC Body:</h4>
								<pre
									class="max-h-32 overflow-x-auto overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs">{results
										.debugInfo.ebcdicBody}</pre>
							</div>
						</div>
					</div>
				</div>
			</section>
		{/if}
	</div>
</main>
