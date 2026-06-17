// Base64 and XML processing utilities

/**
 * Decode base64 string (handles both standard and URL-safe encoding)
 * @param {string} str - Base64 string to decode
 * @returns {string} - Decoded string
 */
export function decodeBase64(str) {
	const cleaned = str.replace(/\s+/g, '');
	const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
	return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Check if a string is valid base64 with enhanced validation
 * @param {string} str - String to check
 * @returns {boolean} - True if valid base64 with meaningful content
 */
export function isBase64(str) {
	if (!str) return false;

	const cleaned = str.replace(/\s+/g, '');

	// Allow shorter strings (minimum 4 characters for meaningful base64)
	if (cleaned.length < 5) return false;

	// standard + url safe
	if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(cleaned)) {
		return false;
	}

	const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);

	try {
		const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));

		if (!binary.length) return false;

		if (!isValidText(binary) && !looksBinary(binary)) {
			return false;
		}
		// Detect printable ratio
		let printable = 0;
		let zeroBytes = 0;

		for (let i = 0; i < binary.length; i++) {
			const c = binary.charCodeAt(i);

			if (c === 0) zeroBytes++;

			if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)) {
				printable++;
			}
		}

		const printableRatio = printable / binary.length;
		const zeroRatio = zeroBytes / binary.length;

		// text OR binary signature
		const looksBinary =
			binary.startsWith('%PDF') ||
			binary.startsWith('PK') ||
			binary.startsWith('\x89PNG') ||
			binary.startsWith('GIF8') ||
			binary.startsWith('\xFF\xD8\xFF');

		return printableRatio > 0.6 || looksBinary || zeroRatio > 0;
	} catch {
		return false;
	}
}

/**
 * Check if decoded text is meaningful and readable
 * @param {string} text - Text to validate
 * @returns {boolean} - True if text is meaningful
 */
export function isValidText(text) {
	if (!text || text.length < 2) return false;

	const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

	if (!cleaned.length) return false;

	// NEW:
	// accept meaningful numeric strings
	if (/^\d{4,}$/.test(cleaned)) {
		return true;
	}

	// printable ratio
	const printable = (cleaned.match(/[\x20-\x7E]/g) || []).length;

	const printableRatio = printable / cleaned.length;

	if (printableRatio < 0.85) return false;

	// must contain alphanumeric
	if (!/[A-Za-z0-9]/.test(cleaned)) return false;

	// weird symbol ratio
	const symbolCount = (cleaned.match(/[^A-Za-z0-9\s.,:;!?()[\]{}"'@#%&*+=/_-]/g) || []).length;

	if (symbolCount / cleaned.length > 0.2) return false;

	// repeated pattern
	if (/^(.{1,4})\1+$/.test(cleaned)) return false;

	// readable structure
	const hasReadablePattern =
		/[aeiouAEIOU]/.test(cleaned) ||
		/\s/.test(cleaned) ||
		/[._:@/-]/.test(cleaned) ||
		/[{}[\]<>:=,"']/.test(cleaned) ||
		/^\d+$/.test(cleaned); // NEW

	if (!hasReadablePattern && cleaned.length > 8) {
		return false;
	}

	return true;
}

/**
 * Check if binary data has known file signatures
 * @param {string} binary - Binary data to check
 * @returns {boolean} - True if has known binary signature
 */
function looksBinary(binary) {
	return (
		binary.startsWith('%PDF') ||
		binary.startsWith('PK') ||
		binary.startsWith('\x89PNG') ||
		binary.startsWith('GIF8') ||
		binary.startsWith('\xFF\xD8\xFF')
	);
}

/**
 * Extract data from XML string with proper element separation
 * @param {string} xmlString - XML string to parse
 * @returns {object} - Extracted data with elements and values
 */
export function extractXmlData(xmlString) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

	// Check for parsing errors
	const parserError = xmlDoc.querySelector('parsererror');
	if (parserError) {
		throw new Error('Invalid XML format');
	}

	const extractedData = {
		originalXml: xmlString,
		extractedValues: {},
		elements: []
	};

	// Extract all elements and their values
	function extractElement(element, path = '') {
		const elementName = element.tagName;
		const currentPath = path ? `${path}.${elementName}` : elementName;

		// Get element value (only direct text content, not from children)
		let directTextContent = '';
		for (let i = 0; i < element.childNodes.length; i++) {
			const node = element.childNodes[i];
			if (node.nodeType === Node.TEXT_NODE) {
				directTextContent += node.textContent;
			}
		}
		directTextContent = directTextContent.trim();

		// Get attributes
		const attributes = {};
		for (let i = 0; i < element.attributes.length; i++) {
			const attr = element.attributes[i];
			attributes[attr.name] = attr.value;
		}

		const elementData = {
			name: elementName,
			path: currentPath,
			value: directTextContent,
			attributes: attributes,
			children: []
		};

		// Process child elements
		for (let i = 0; i < element.children.length; i++) {
			const childData = extractElement(element.children[i], currentPath);
			elementData.children.push(childData);
		}

		// Store in extracted values map only if this element has direct text content
		if (directTextContent) {
			extractedData.extractedValues[currentPath] = directTextContent;
		}

		extractedData.elements.push(elementData);
		return elementData;
	}

	// Start extraction from root
	const root = xmlDoc.documentElement;
	extractElement(root);

	return extractedData;
}

/**
 * Remap XML structure with optional base64 value replacement
 * @param {object} extractedData - Extracted XML data
 * @param {Array} base64Values - Array of base64 value objects
 * @returns {string} - Remapped XML string
 */
export function remapXmlStructure(extractedData, base64Values = []) {
	let result = '';

	// Create a map of base64 values for quick lookup
	const base64Map = {};
	for (const base64Item of base64Values) {
		base64Map[base64Item.path] = base64Item.value;
	}

	function buildXml(elementData, indent = 0) {
		const indentStr = '  '.repeat(indent);
		let xml = '';

		// Build opening tag with attributes
		xml += `${indentStr}<${elementData.name}`;
		if (Object.keys(elementData.attributes).length > 0) {
			for (const [attrName, attrValue] of Object.entries(elementData.attributes)) {
				xml += ` ${attrName}="${attrValue}"`;
			}
		}
		xml += '>';

		// Add value if present
		if (elementData.value) {
			let displayValue = elementData.value;

			// Check if this value is base64 and should be decoded
			if (base64Map[elementData.path]) {
				try {
					const decoded = atob(elementData.value);
					displayValue = `${decoded}`;
				} catch {
					displayValue = elementData.value; // Fallback to original if decode fails
				}
			}

			xml += displayValue;
		}

		// Add children
		if (elementData.children.length > 0) {
			xml += '\n';
			for (const child of elementData.children) {
				xml += buildXml(child, indent + 1);
			}
			xml += `${indentStr}`;
		}

		// Add closing tag
		xml += `</${elementData.name}>\n`;

		return xml;
	}

	// Build XML from extracted data
	for (const element of extractedData.elements) {
		if (element.path === element.name) {
			// Root elements only
			result += buildXml(element);
		}
	}

	return result.trim();
}

/**
 * Validate and check extracted XML values
 * @param {object} extractedData - Extracted XML data
 * @returns {object} - Validation results with base64 values
 */
export function checkAndValidateValues(extractedData) {
	const validationResults = {
		totalElements: extractedData.elements.length,
		elementsWithValues: 0,
		elementsWithAttributes: 0,
		emptyElements: [],
		suspiciousValues: [],
		base64Values: []
	};

	for (const element of extractedData.elements) {
		// Check for values
		if (element.value) {
			validationResults.elementsWithValues++;

			// Check for base64 patterns only
			if (element.value) {
				if (isBase64(element.value)) {
					validationResults.base64Values.push({
						path: element.path,
						value: element.value,
						isValidBase64: true
					});
				}
			}
		} else {
			validationResults.emptyElements.push(element.path);
		}

		// Check for attributes
		if (Object.keys(element.attributes).length > 0) {
			validationResults.elementsWithAttributes++;
		}
	}

	return validationResults;
}

/**
 * Detect content type of text
 * @param {string} text - Text to analyze
 * @returns {string} - Content type (JSON, XML, Plain Text, or Invalid Format)
 */
export function detectContentType(text) {
	const trimmed = text.trim();

	if (trimmed.length > 10 && isBase64(trimmed)) {
		return 'Base64';
	}

	// Check for JSON
	if (trimmed.startsWith('{') && trimmed.endsWith('}') && isJson(trimmed)) {
		return 'JSON';
	}

	// Check for XML
	if ((trimmed.startsWith('<?xml') || trimmed.startsWith('<')) && isXml(trimmed)) {
		return 'XML';
	}

	// If not JSON or XML, treat as plain text
	return 'Plain Text';
}

/**
 * Check if string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean} - True if valid JSON
 */
function isJson(str) {
	try {
		const parsed = JSON.parse(str);
		return typeof parsed === 'object' && parsed !== null;
	} catch {
		return false;
	}
}

/**
 * Check if string is XML
 * @param {string} str - String to check
 * @returns {boolean} - True if valid XML
 */
function isXml(str) {
	const trimmed = str.trim();

	// Check for XML declaration or DOCTYPE
	const xmlDeclRegex = /^\s*<\?xml|<!DOCTYPE[^>]*>/;
	if (xmlDeclRegex.test(trimmed)) return true;

	// Check for SOAP envelope
	const soapRegex = /<\w+:[^>]+>/;
	if (soapRegex.test(trimmed)) return true;

	// Check for XML tags with attributes
	const tagWithAttrRegex = /<\w+:\w+[^>]*>/;
	if (tagWithAttrRegex.test(trimmed)) return true;

	// Check for regular XML tags
	const tagRegex = /<[^>]+>/g;
	const matches = trimmed.match(tagRegex);
	if (matches && matches.length > 0) return true;

	return false;
}

/**
 * Check if string is URL encoded
 * @param {string} str - String to check
 * @returns {boolean} - True if URL encoded
 */
function isUrlEncoded(str) {
	try {
		return decodeURIComponent(str) !== str;
	} catch {
		return false;
	}
}

/**
 * Check if string represents binary data
 * @param {string} str - String to check
 * @returns {boolean} - True if binary data pattern
 */
function isBinaryData(str) {
	// Check for hex patterns
	const hexRegex = /^[0-9A-Fa-f\s]+$/;
	if (hexRegex.test(str) && str.length > 10) return true;

	// Check for binary patterns
	const binaryRegex = /^[01\s]+$/;
	if (binaryRegex.test(str) && str.length > 10) return true;

	return false;
}

/**
 * Check if string is key-value format
 * @param {string} str - String to check
 * @returns {boolean} - True if key-value format
 */
function isKey_value(str) {
	// Check for key=value patterns
	const kvRegex = /^[\w-]+=[^&\n]+(&[\w-]+=[^&\n]+)*$/;
	return kvRegex.test(str);
}

/**
 * Check if string is hex value (either X'...' format or raw hex)
 * @param {string} str - String to check
 * @returns {object} - Object with isHex boolean and extracted hex string
 */
export function isHexValue(str) {
	const trimmed = str.trim();
	
	// Check for X'...' format
	const xFormatMatch = trimmed.match(/^X'([0-9A-Fa-f]+)'$/);
	if (xFormatMatch) {
		return { isHex: true, hexValue: xFormatMatch[1] };
	}
	
	// Check for raw hex (only hex characters, even length, reasonable length)
	const hexRegex = /^[0-9A-Fa-f]+$/;
	if (hexRegex.test(trimmed) && trimmed.length >= 2 && trimmed.length % 2 === 0) {
		return { isHex: true, hexValue: trimmed };
	}
	
	return { isHex: false, hexValue: '' };
}

/**
 * Clean JSON string to handle common formatting issues
 * @param {string} jsonString - JSON string to clean
 * @returns {string} - Cleaned JSON string
 */
function cleanJsonString(jsonString) {
	let cleaned = jsonString;
	
	// Remove trailing commas before closing brackets/braces
	cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
	
	// Remove comments (both // and /* */ style)
	cleaned = cleaned.replace(/\/\/.*$/gm, '');
	cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
	
	// Remove single quotes around property names (convert to double quotes)
	cleaned = cleaned.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"');
	
	// Ensure property names are quoted
	cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
	
	return cleaned.trim();
}

/**
 * Extract data from JSON string with base64 detection
 * @param {string} jsonString - JSON string to parse
 * @returns {object} - Extracted data with base64 values
 */
export function extractJsonData(jsonString) {
	try {
		const cleanedJson = cleanJsonString(jsonString);
		const parsed = JSON.parse(cleanedJson);
		const extractedData = {
			originalJson: jsonString,
			parsedData: parsed,
			extractedValues: {},
			base64Values: []
		};

		// Recursively extract values from JSON
		function extractValues(obj, path = '') {
			for (const [key, value] of Object.entries(obj)) {
				const currentPath = path ? `${path}.${key}` : key;
				
				if (typeof value === 'string') {
					extractedData.extractedValues[currentPath] = value;
					
					// Check if value is base64
					if (isBase64(value)) {
						extractedData.base64Values.push({
							path: currentPath,
							value: value,
							isValidBase64: true
						});
					}
				} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					extractValues(value, currentPath);
				} else if (Array.isArray(value)) {
					value.forEach((item, index) => {
						if (typeof item === 'object' && item !== null) {
							extractValues(item, `${currentPath}[${index}]`);
						} else if (typeof item === 'string') {
							const arrayPath = `${currentPath}[${index}]`;
							extractedData.extractedValues[arrayPath] = item;
							
							if (isBase64(item)) {
								extractedData.base64Values.push({
									path: arrayPath,
									value: item,
									isValidBase64: true
								});
							}
						}
					});
				}
			}
		}

		extractValues(parsed);
		return extractedData;
	} catch (e) {
		throw new Error('Invalid JSON format: ' + e.message);
	}
}

/**
 * Remap JSON structure with decoded base64 values
 * @param {object} extractedData - Extracted JSON data
 * @param {Array} base64Values - Array of base64 value objects
 * @returns {string} - Remapped JSON string
 */
export function remapJsonStructure(extractedData, base64Values = []) {
	// Create a deep copy of the original data
	const remappedData = JSON.parse(JSON.stringify(extractedData.parsedData));
	
	// Create a map of base64 values for quick lookup
	const base64Map = {};
	for (const base64Item of base64Values) {
		base64Map[base64Item.path] = base64Item.value;
	}

	// Recursively replace base64 values
	function replaceBase64Values(obj, path = '') {
		for (const [key, value] of Object.entries(obj)) {
			const currentPath = path ? `${path}.${key}` : key;
			
			if (typeof value === 'string' && base64Map[currentPath]) {
				try {
					const decoded = atob(value);
					obj[key] = decoded;
				} catch {
					// Keep original if decoding fails
				}
			} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				replaceBase64Values(value, currentPath);
			} else if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item === 'object' && item !== null) {
						replaceBase64Values(item, `${currentPath}[${index}]`);
					} else if (typeof item === 'string') {
						const arrayPath = `${currentPath}[${index}]`;
						if (base64Map[arrayPath]) {
							try {
								const decoded = atob(item);
								value[index] = decoded;
							} catch {
								// Keep original if decoding fails
							}
						}
					}
				});
			}
		}
	}

	replaceBase64Values(remappedData);
	
	// Return formatted JSON string
	return JSON.stringify(remappedData, null, 2);
}

/**
 * Format decoded content based on type
 * @param {string} content - Content to format
 * @param {string} type - Content type
 * @returns {object} - Object with mainContent and remappedContent properties
 */
export function formatDecodedContent(content, type) {
	switch (type) {
		case 'JSON':
			try {
				// Extract JSON data with base64 detection
				const extractedData = extractJsonData(content);
				
				// Build main result with extracted information
				let mainResult = '=== JSON Structure Analysis ===\n\n';
				mainResult += `Total Properties: ${Object.keys(extractedData.extractedValues).length}\n`;
				mainResult += `Base64 Values Found: ${extractedData.base64Values.length}\n\n`;

				// Show extracted key-value pairs
				mainResult += '=== Extracted Key-Value Pairs ===\n\n';
				for (const [path, value] of Object.entries(extractedData.extractedValues)) {
					mainResult += `${path}: ${value}\n`;
				}

				// Show base64 values found
				if (extractedData.base64Values.length > 0) {
					mainResult += '\n=== Base64 Values Found ===\n\n';
					for (const base64Item of extractedData.base64Values) {
						mainResult += `${base64Item.path}: ${base64Item.value}`;
						try {
							const decoded = atob(base64Item.value);
							mainResult += ` → Decoded: ${decoded}`;
						} catch {
							mainResult += ' → (Failed to decode)';
						}
						mainResult += '\n';
					}
				}

				// Generate remapped JSON structure separately
				let remappedResult = '';
				if (extractedData.base64Values.length > 0) {
					remappedResult = remapJsonStructure(extractedData, extractedData.base64Values);
				}

				return { mainContent: mainResult, remappedContent: remappedResult };
			} catch (e) {
				return { mainContent: `JSON Processing Error: ${e.message}\n\nOriginal JSON:\n${content}`, remappedContent: '' };
			}
		case 'XML':
			try {
				// Extract XML data
				const extractedData = extractXmlData(content);
				
				// Validate extracted data
				const validation = checkAndValidateValues(extractedData);
				
				// Build main result with extracted information
				let mainResult = '=== XML Structure Analysis ===\n\n';
				mainResult += `Total Elements: ${validation.totalElements}\n`;
				mainResult += `Elements with Values: ${validation.elementsWithValues}\n`;
				mainResult += `Elements with Attributes: ${validation.elementsWithAttributes}\n\n`;

				// Show extracted key-value pairs
				mainResult += '=== Extracted Key-Value Pairs ===\n\n';
				for (const [path, value] of Object.entries(extractedData.extractedValues)) {
					// Show cleaner path - just the last element name
					const cleanPath = path.split('.').pop();
					mainResult += `${cleanPath}: ${value}\n`;
				}

				// Show base64 values found
				if (validation.base64Values.length > 0) {
					mainResult += '\n=== Base64 Values Found ===\n\n';
					for (const base64Item of validation.base64Values) {
						// Show cleaner path - just the last element name
						const cleanPath = base64Item.path.split('.').pop();
						mainResult += `${cleanPath}: ${base64Item.value}`;
						try {
							const decoded = atob(base64Item.value);
							mainResult += ` → Decoded: ${decoded}`;
						} catch {
							mainResult += ' → (Failed to decode)';
						}
						mainResult += '\n';
					}
				}

				// Generate remapped XML structure separately
				let remappedResult = '';
				if (validation.base64Values.length > 0) {
					remappedResult = remapXmlStructure(extractedData, validation.base64Values);
				}

				return { mainContent: mainResult, remappedContent: remappedResult };
			} catch (e) {
				return { mainContent: `XML Processing Error: ${e.message}\n\nOriginal XML:\n${content}`, remappedContent: '' };
			}
		case 'Plain Text':
			return { mainContent: content, remappedContent: '' };
		default:
			return { mainContent: 'Invalid Format', remappedContent: '' };
	}
}
