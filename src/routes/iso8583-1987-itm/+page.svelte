<script>
	import Icon from '@iconify/svelte';

	let isoMessage = '';
	let parsedData = {};
	let error = '';
	let messageType = '';
	let showHexView = false;
	let isProcessing = false;

	// ISO8583:1987 Field definitions for ITM Banking
	const fieldDefinitions = {
		0: { name: 'Message Type Indicator', length: 4, type: 'n', description: 'Transaction type (e.g., 0200=Authorization, 0210=Response)' },
		1: { name: 'Bitmap', length: 'variable', type: 'b', description: 'Field presence bitmap' },
		2: { name: 'Primary Account Number', length: 'variable', type: 'n..19', description: 'Customer card number' },
		3: { name: 'Processing Code', length: 6, type: 'n', description: 'Transaction processing code' },
		4: { name: 'Amount, Transaction', length: 12, type: 'n', description: 'Transaction amount in cents' },
		5: { name: 'Amount, Settlement', length: 12, type: 'n', description: 'Settlement amount in cents' },
		6: { name: 'Amount, Cardholder Billing', length: 12, type: 'n', description: 'Billing amount in cents' },
		7: { name: 'Transmission Date & Time', length: 10, type: 'n', description: 'MMDDhhmmss format' },
		8: { name: 'Amount, Cardholder Billing Fee', length: 8, type: 'n', description: 'Billing fee amount' },
		9: { name: 'Conversion Rate, Cardholder Billing', length: 8, type: 'n', description: 'Currency conversion rate' },
		10: { name: 'Conversion Rate, Cardholder Settlement', length: 8, type: 'n', description: 'Settlement conversion rate' },
		11: { name: 'System Trace Audit Number', length: 6, type: 'n', description: 'Unique transaction identifier' },
		12: { name: 'Time, Local Transaction', length: 6, type: 'n', description: 'hhmmss format' },
		13: { name: 'Date, Local Transaction', length: 4, type: 'n', description: 'MMdd format' },
		14: { name: 'Date, Expiration', length: 4, type: 'n', description: 'YYmm format' },
		15: { name: 'Date, Settlement', length: 4, type: 'n', description: 'MMdd format' },
		16: { name: 'Date, Conversion', length: 4, type: 'n', description: 'MMdd format' },
		17: { name: 'Date, Capture', length: 4, type: 'n', description: 'MMdd format' },
		18: { name: 'Merchant\'s Type', length: 4, type: 'n', description: 'Merchant category code' },
		19: { name: 'Acquiring Institution Identification Code', length: 3, type: 'n', description: 'Bank identification code' },
		20: { name: 'Extending Institution Identification Code', length: 3, type: 'n', description: 'Extended bank code' },
		21: { name: 'Forwarding Institution Identification Code', length: 3, type: 'n', description: 'Forwarding bank code' },
		22: { name: 'Point of Service Entry Mode', length: 3, type: 'n', description: 'POS entry mode' },
		23: { name: 'Point of Service Condition Code', length: 3, type: 'n', description: 'POS condition code' },
		24: { name: 'Point of Service Capture Code', length: 3, type: 'n', description: 'POS capture code' },
		25: { name: 'Point of Service PIN Acquisition Code', length: 3, type: 'n', description: 'PIN capture method' },
		26: { name: 'Point of Service PIN Accept Code', length: 2, type: 'n', description: 'PIN acceptance' },
		27: { name: 'Authorizing Identification Response Length', length: 1, type: 'n', description: 'Auth response length' },
		28: { name: 'Amount, Transaction Fee', length: 8, type: 'n', description: 'Transaction fee amount' },
		29: { name: 'Amount, Settlement Fee', length: 8, type: 'n', description: 'Settlement fee amount' },
		30: { name: 'Amount, Transaction Processing Fee', length: 8, type: 'n', description: 'Processing fee amount' },
		31: { name: 'Amount, Settlement Processing Fee', length: 8, type: 'n', description: 'Settlement processing fee' },
		32: { name: 'Acquiring Institution Identification Code', length: 'variable', type: 'n..11', description: 'Acquiring bank ID' },
		33: { name: 'Forwarding Institution Identification Code', length: 'variable', type: 'n..11', description: 'Forwarding bank ID' },
		34: { name: 'Extended Primary Account Number', length: 'variable', type: 'n..28', description: 'Extended PAN' },
		35: { name: 'Track 2 Data', length: 'variable', type: 'z..37', description: 'Magnetic stripe track 2' },
		36: { name: 'Track 3 Data', length: 'variable', type: 'z..104', description: 'Magnetic stripe track 3' },
		37: { name: 'Retrieval Reference Number', length: 12, type: 'an', description: 'Transaction reference' },
		38: { name: 'Authorization Identification Response', length: 6, type: 'an', description: 'Auth response code' },
		39: { name: 'Response Code', length: 2, type: 'an', description: 'Transaction response (00=Approved)' },
		40: { name: 'Service Restriction Code', length: 3, type: 'an', description: 'Service restriction' },
		41: { name: 'Card Acceptor Terminal Identification', length: 8, type: 'ans', description: 'Terminal ID' },
		42: { name: 'Card Acceptor Identification Code', length: 15, type: 'ans', description: 'Merchant ID' },
		43: { name: 'Card Acceptor Name/Location', length: 40, type: 'ans', description: 'Merchant name/location' },
		44: { name: 'Additional Response Data', length: 'variable', type: 'an..25', description: 'Additional response' },
		45: { name: 'Track 1 Data', length: 'variable', type: 'an..76', description: 'Magnetic stripe track 1' },
		46: { name: 'Amount, Cardholder Billing', length: 'variable', type: 'an..999', description: 'Billing amount' },
		47: { name: 'Additional Data - National', length: 'variable', type: 'an..999', description: 'National data' },
		48: { name: 'Additional Data - Private', length: 'variable', type: 'an..999', description: 'Private data' },
		49: { name: 'Currency Code, Transaction', length: 3, type: 'a', description: 'Transaction currency (e.g., 360=IDR)' },
		50: { name: 'Currency Code, Settlement', length: 3, type: 'a', description: 'Settlement currency' },
		51: { name: 'Currency Code, Cardholder Billing', length: 3, type: 'a', description: 'Billing currency' },
		52: { name: 'Personal Identification Number Data', length: 8, type: 'b', description: 'Encrypted PIN block' },
		53: { name: 'Security Related Control Information', length: 16, type: 'n', description: 'Security control' },
		54: { name: 'Additional Amounts', length: 'variable', type: 'ans..120', description: 'Additional amounts' },
		55: { name: 'ICC System Related Data', length: 'variable', type: 'ans..999', description: 'EMV chip data' },
		56: { name: 'Original Data Elements', length: 'variable', type: 'ans..999', description: 'Original transaction data' },
		57: { name: 'Amount, Original', length: 12, type: 'n', description: 'Original transaction amount' },
		58: { name: 'Original Authorization Identification Code', length: 'variable', type: 'ans..999', description: 'Original auth code' },
		59: { name: 'Original Data Elements', length: 'variable', type: 'ans..999', description: 'Original data elements' },
		60: { name: 'Original Data Elements', length: 'variable', type: 'ans..999', description: 'Original data elements' },
		61: { name: 'POS Data', length: 'variable', type: 'ans..999', description: 'POS specific data' },
		62: { name: 'Original Data Elements', length: 'variable', type: 'ans..999', description: 'Original data elements' },
		63: { name: 'Private Data', length: 'variable', type: 'ans..999', description: 'Private data' },
		64: { name: 'Message Authentication Code', length: 8, type: 'b', description: 'MAC for message integrity' },
		65: { name: 'Bitmap, Extended', length: 'variable', type: 'b', description: 'Extended bitmap' },
		66: { name: 'Settlement Code', length: 1, type: 'n', description: 'Settlement code' },
		67: { name: 'Extended Payment Code', length: 3, type: 'n', description: 'Extended payment code' },
		68: { name: 'Receiving Institution Identification Code', length: 3, type: 'n', description: 'Receiving bank code' },
		69: { name: 'Settlement Institution Identification Code', length: 3, type: 'n', description: 'Settlement bank code' },
		70: { name: 'Network Management Information', length: 3, type: 'n', description: 'Network management' },
		71: { name: 'Message Error Indicator', length: 1, type: 'n', description: 'Error indicator' },
		72: { name: 'Data Record', length: 'variable', type: 'ans..999', description: 'Data record' },
		73: { name: 'Date, Action', length: 6, type: 'n', description: 'Action date' },
		74: { name: 'Credits, Number', length: 10, type: 'n', description: 'Number of credits' },
		75: { name: 'Credits, Reversal Number', length: 10, type: 'n', description: 'Number of credit reversals' },
		76: { name: 'Debits, Number', length: 10, type: 'n', description: 'Number of debits' },
		77: { name: 'Debits, Reversal Number', length: 10, type: 'n', description: 'Number of debit reversals' },
		78: { name: 'Transfer, Number', length: 10, type: 'n', description: 'Number of transfers' },
		79: { name: 'Transfer, Reversal Number', length: 10, type: 'n', description: 'Number of transfer reversals' },
		80: { name: 'Inquiries, Number', length: 10, type: 'n', description: 'Number of inquiries' },
		81: { name: 'Authorizations, Number', length: 10, type: 'n', description: 'Number of authorizations' },
		82: { name: 'Credits, Processing Fee Amount', length: 12, type: 'n', description: 'Credit processing fee' },
		83: { name: 'Credits, Transaction Fee Amount', length: 12, type: 'n', description: 'Credit transaction fee' },
		84: { name: 'Debits, Processing Fee Amount', length: 12, type: 'n', description: 'Debit processing fee' },
		85: { name: 'Debits, Transaction Fee Amount', length: 12, type: 'n', description: 'Debit transaction fee' },
		86: { name: 'Credits, Amount', length: 16, type: 'n', description: 'Total credit amount' },
		87: { name: 'Credits, Reversal Amount', length: 16, type: 'n', description: 'Total credit reversal amount' },
		88: { name: 'Debits, Amount', length: 16, type: 'n', description: 'Total debit amount' },
		89: { name: 'Debits, Reversal Amount', length: 16, type: 'n', description: 'Total debit reversal amount' },
		90: { name: 'Original Data Elements', length: 'variable', type: 'ans..999', description: 'Original data elements' },
		91: { name: 'File Update Code', length: 1, type: 'an', description: 'File update code' },
		92: { name: 'File Security Code', length: 2, type: 'n', description: 'File security code' },
		93: { name: 'Response Indicator', length: 5, type: 'n', description: 'Response indicator' },
		94: { name: 'Service Indicator', length: 7, type: 'an', description: 'Service indicator' },
		95: { name: 'Replacement Amounts', length: 'variable', type: 'ans..999', description: 'Replacement amounts' },
		96: { name: 'System Management Code', length: 1, type: 'n', description: 'System management code' },
		97: { name: 'Amount, Net Settlement', length: 16, type: 'n', description: 'Net settlement amount' },
		98: { name: 'Payee', length: 'variable', type: 'ans..999', description: 'Payee information' },
		99: { name: 'Settlement Institution Identification Code', length: 'variable', type: 'n..11', description: 'Settlement institution' },
		100: { name: 'Receiving Institution Identification Code', length: 'variable', type: 'n..11', description: 'Receiving institution' },
		101: { name: 'File Name', length: 'variable', type: 'ans..17', description: 'File name' },
		102: { name: 'Account Identification 1', length: 'variable', type: 'ans..28', description: 'Account ID 1' },
		103: { name: 'Account Identification 2', length: 'variable', type: 'ans..28', description: 'Account ID 2' },
		104: { name: 'Transaction Description', length: 'variable', type: 'ans..100', description: 'Transaction description' },
		105: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		106: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		107: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		108: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		109: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		110: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		111: { name: 'Reserved for ISO Use', length: 'variable', type: 'ans..999', description: 'Reserved for ISO' },
		112: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		113: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		114: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		115: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		116: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		117: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		118: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		119: { name: 'Reserved for National Use', length: 'variable', type: 'ans..999', description: 'Reserved for national' },
		120: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		121: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		122: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		123: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		124: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		125: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		126: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		127: { name: 'Reserved for Private Use', length: 'variable', type: 'ans..999', description: 'Reserved for private' },
		128: { name: 'Message Authentication Code', length: 8, type: 'b', description: 'MAC (extended)' }
	};

	// Message type descriptions for ITM Banking
	const messageTypeDescriptions = {
		'0100': 'Authorization Request',
		'0110': 'Authorization Response',
		'0200': 'Financial Request (Purchase)',
		'0210': 'Financial Response (Purchase)',
		'0400': 'Reversal Request',
		'0410': 'Reversal Response',
		'0800': 'Network Management Request',
		'0810': 'Network Management Response',
		'1200': 'Financial Request (Transfer)',
		'1220': 'Financial Response (Transfer)',
		'1800': 'Network Management Request',
		'1820': 'Network Management Response'
	};

	function parseBitmap(hexBitmap) {
		const bitmap = parseInt(hexBitmap, 16).toString(2).padStart(64, '0');
		const presentFields = [];
		
		for (let i = 0; i < 64; i++) {
			if (bitmap[i] === '1') {
				presentFields.push(i + 1);
			}
		}
		
		return presentFields;
	}

	function parseField(fieldNum, data, offset) {
		const field = fieldDefinitions[fieldNum];
		if (!field) return { value: '', length: 0 };

		let value = '';
		let length = 0;

		if (field.type === 'b') {
			// Binary field
			const fieldLength = field.length === 'variable' ? 
				parseInt(data.substr(offset, 2), 16) : field.length;
			value = data.substr(offset + (field.length === 'variable' ? 2 : 0), fieldLength * 2);
			length = (field.length === 'variable' ? 2 : 0) + fieldLength * 2;
		} else if (field.type.includes('..')) {
			// Variable length field
			const maxLength = parseInt(field.type.split('..')[1]);
			const lengthDigits = maxLength.toString().length;
			const fieldLength = parseInt(data.substr(offset, lengthDigits));
			value = data.substr(offset + lengthDigits, fieldLength * 2);
			length = lengthDigits + fieldLength * 2;
		} else {
			// Fixed length field
			const fieldLength = parseInt(field.length);
			value = data.substr(offset, fieldLength * 2);
			length = fieldLength * 2;
		}

		// Convert hex to readable format
		if (field.type === 'n') {
			// Numeric field
			value = value.replace(/[^0-9]/g, '');
		} else if (field.type === 'a') {
			// Alphabetic field
			value = hexToString(value);
		} else if (field.type === 'an' || field.type === 'ans') {
			// Alphanumeric field
			value = hexToString(value);
		} else if (field.type === 'z') {
			// Track data (special handling)
			value = hexToString(value);
		}

		return { value, length };
	}

	function hexToString(hex) {
		let result = '';
		for (let i = 0; i < hex.length; i += 2) {
			const charCode = parseInt(hex.substr(i, 2), 16);
			if (charCode >= 32 && charCode <= 126) {
				result += String.fromCharCode(charCode);
			} else {
				result += '.';
			}
		}
		return result;
	}

	function parseIsoMessage() {
		try {
			isProcessing = true;
			error = '';
			parsedData = {};

			// Clean input - remove spaces and newlines
			let cleanHex = isoMessage.replace(/\s/g, '').toUpperCase();

			// Validate hex input
			if (!/^[0-9A-F]*$/.test(cleanHex)) {
				throw new Error('Invalid hex input. Only hex characters (0-9, A-F) are allowed.');
			}

			if (cleanHex.length < 8) {
				throw new Error('Message too short. Minimum 8 characters required (MTI + Primary Bitmap).');
			}

			let offset = 0;

			// Parse Message Type Indicator (MTI)
			const mti = cleanHex.substr(offset, 8);
			messageType = hexToString(mti);
			parsedData.mti = {
				hex: mti,
				ascii: messageType,
				description: messageTypeDescriptions[messageType] || 'Unknown Message Type'
			};
			offset += 8;

			// Parse Primary Bitmap
			const bitmapHex = cleanHex.substr(offset, 16);
			const presentFields = parseBitmap(bitmapHex);
			parsedData.bitmap = {
				hex: bitmapHex,
				binary: parseInt(bitmapHex, 16).toString(2).padStart(64, '0'),
				presentFields: presentFields
			};
			offset += 16;

			// Check for secondary bitmap (if field 1 is present)
			if (presentFields.includes(1)) {
				const secondaryBitmapHex = cleanHex.substr(offset, 16);
				const secondaryFields = parseBitmap(secondaryBitmapHex);
				parsedData.secondaryBitmap = {
					hex: secondaryBitmapHex,
					binary: parseInt(secondaryBitmapHex, 16).toString(2).padStart(64, '0'),
					presentFields: secondaryFields.map(f => f + 64)
				};
				parsedData.bitmap.presentFields.push(...parsedData.secondaryBitmap.presentFields);
				offset += 16;
			}

			// Parse present fields
			parsedData.fields = {};
			for (const fieldNum of presentFields) {
				if (fieldNum === 1) continue; // Skip secondary bitmap field

				const result = parseField(fieldNum, cleanHex, offset);
				parsedData.fields[fieldNum] = {
					...fieldDefinitions[fieldNum],
					rawHex: cleanHex.substr(offset, result.length),
					value: result.value
				};
				offset += result.length;
			}

			// Add ITM Banking specific interpretations
			addItmInterpretations();

		} catch (e) {
			error = 'ISO8583 parsing error: ' + e.message;
		} finally {
			isProcessing = false;
		}
	}

	function addItmInterpretations() {
		// Add ITM-specific field interpretations
		if (parsedData.fields) {
			// Transaction amount formatting
			if (parsedData.fields[4]) {
				const amount = parsedData.fields[4].value;
				if (amount && amount.length > 0) {
					const decimalAmount = parseInt(amount) / 100;
					parsedData.fields[4].formatted = new Intl.NumberFormat('id-ID', {
						style: 'currency',
						currency: 'IDR'
					}).format(decimalAmount);
				}
			}

			// Currency interpretation
			if (parsedData.fields[49]) {
				const currencyCode = parsedData.fields[49].value;
				const currencies = {
					'360': 'IDR - Indonesian Rupiah',
					'840': 'USD - US Dollar',
					'978': 'EUR - Euro',
					'826': 'GBP - British Pound',
					'392': 'JPY - Japanese Yen'
				};
				parsedData.fields[49].currencyName = currencies[currencyCode] || 'Unknown Currency';
			}

			// Processing code interpretation
			if (parsedData.fields[3]) {
				const processingCode = parsedData.fields[3].value;
				if (processingCode && processingCode.length >= 6) {
					parsedData.fields[3].interpretation = {
						firstTwo: processingCode.substr(0, 2),
						nextTwo: processingCode.substr(2, 2),
						lastTwo: processingCode.substr(4, 2)
					};
				}
			}

			// POS data interpretation
			if (parsedData.fields[22]) {
				const posMode = parsedData.fields[22].value;
				if (posMode && posMode.length >= 3) {
					parsedData.fields[22].posDetails = {
						panEntry: posMode.substr(0, 1),
						pinEntry: posMode.substr(1, 1),
						cardholderTerminal: posMode.substr(2, 1)
					};
				}
			}
		}
	}

	function copyToClipboard() {
		const jsonOutput = JSON.stringify(parsedData, null, 2);
		navigator.clipboard.writeText(jsonOutput);
	}

	function clearAll() {
		isoMessage = '';
		parsedData = {};
		error = '';
		messageType = '';
	}

	function toggleHexView() {
		showHexView = !showHexView;
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
						<div class="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-3">
							<Icon icon="mdi-light:bank" class="h-8 w-8 text-white" />
						</div>
						<div>
							<h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
								ISO8583:1987 ITM Banking Parser
							</h1>
							<p class="text-gray-600 mt-1">
								Parse ISO8583:1987 messages with ITM banking field definitions and context
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
		<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:file-document-edit" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">ISO8583 Message (Hex)</h2>
					</div>
					<div class="flex space-x-3">
						<button
							on:click={parseIsoMessage}
							disabled={isProcessing}
							class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
						>
							<span class="relative z-10 flex items-center space-x-2">
								{#if isProcessing}
									<Icon icon="mdi-light:loading" class="h-4 w-4 animate-spin" />
									<span>Processing...</span>
								{:else}
									<Icon icon="mdi-light:magnify" class="h-4 w-4" />
									<span>Parse Message</span>
								{/if}
							</span>
						</button>
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
			</div>
			<div class="p-6">
				<textarea
					bind:value={isoMessage}
					placeholder="Enter ISO8583 message in hex format (e.g., 0200B2200000001000000000000000000000...)"
					class="w-full h-40 rounded-xl border-2 border-gray-200 p-4 font-mono text-sm transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
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

		<!-- Parsed Results -->
		{#if Object.keys(parsedData).length > 0}
			<!-- Message Header -->
			<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
				<div class="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							<Icon icon="mdi-light:information" class="h-6 w-6 text-white" />
							<h2 class="text-xl font-bold text-white">Message Header</h2>
						</div>
						<div class="flex space-x-3">
							<button
								on:click={toggleHexView}
								class="rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								{showHexView ? 'Show Parsed' : 'Show Hex'}
							</button>
							<button
								on:click={copyToClipboard}
								class="rounded-lg bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								<Icon icon="mdi-light:content-copy" class="h-4 w-4 mr-1" />
								Copy JSON
							</button>
						</div>
					</div>
				</div>
				<div class="p-6">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
							<div class="flex items-center space-x-3 mb-3">
								<div class="rounded-full bg-indigo-100 p-2">
									<Icon icon="mdi-light:message-text" class="h-5 w-5 text-indigo-600" />
								</div>
								<span class="text-sm font-semibold text-indigo-800">Message Type</span>
							</div>
							<p class="text-2xl font-mono font-bold text-indigo-900">{parsedData.mti?.ascii}</p>
							<p class="text-sm text-indigo-700 mt-1">{parsedData.mti?.description}</p>
						</div>
						<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
							<div class="flex items-center space-x-3 mb-3">
								<div class="rounded-full bg-purple-100 p-2">
									<Icon icon="mdi-light:grid" class="h-5 w-5 text-purple-600" />
								</div>
								<span class="text-sm font-semibold text-purple-800">Primary Bitmap</span>
							</div>
							<p class="text-lg font-mono font-bold text-purple-900">{parsedData.bitmap?.hex}</p>
							<p class="text-sm text-purple-700 mt-1">Fields: {parsedData.bitmap?.presentFields?.join(', ')}</p>
						</div>
						<div class="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-100">
							<div class="flex items-center space-x-3 mb-3">
								<div class="rounded-full bg-pink-100 p-2">
									<Icon icon="mdi-light:counter" class="h-5 w-5 text-pink-600" />
								</div>
								<span class="text-sm font-semibold text-pink-800">Total Fields</span>
							</div>
							<p class="text-3xl font-bold text-pink-900">{parsedData.bitmap?.presentFields?.length || 0}</p>
							<p class="text-sm text-pink-700 mt-1">Including bitmap</p>
						</div>
					</div>
				</div>
			</section>

			<!-- Field Details -->
			<section class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
				<div class="bg-gradient-to-r from-indigo-500 to-purple-500 p-6">
					<div class="flex items-center space-x-3">
						<Icon icon="mdi-light:format-list-bulleted" class="h-6 w-6 text-white" />
						<h2 class="text-xl font-bold text-white">Field Details</h2>
					</div>
				</div>
				<div class="p-6">
					{#if showHexView}
						<div class="rounded-xl bg-gray-900 p-6 font-mono text-sm text-green-400 overflow-auto max-h-96">
							<pre class="whitespace-pre-wrap break-words">{JSON.stringify(parsedData, null, 2)}</pre>
						</div>
					{:else}
						<div class="space-y-4">
							{#each Object.keys(parsedData.fields || {}).sort((a, b) => parseInt(a) - parseInt(b)) as fieldNum}
								{@const field = parsedData.fields[fieldNum]}
								<div class="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-6 border border-gray-200">
									<div class="flex justify-between items-start mb-4">
										<div>
											<h3 class="text-lg font-bold text-gray-800">Field {fieldNum}: {field.name}</h3>
											<p class="text-sm text-gray-600">{field.description}</p>
										</div>
										<span class="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">{field.type}</span>
									</div>
									
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<span class="text-sm font-semibold text-gray-600">Value:</span>
											<p class="font-mono text-sm bg-white p-3 rounded-lg border border-gray-200 mt-1">{field.value || '(empty)'}</p>
										</div>
										<div>
											<span class="text-sm font-semibold text-gray-600">Raw Hex:</span>
											<p class="font-mono text-sm bg-white p-3 rounded-lg border border-gray-200 mt-1">{field.rawHex || '(empty)'}</p>
										</div>
									</div>

									<!-- ITM-specific interpretations -->
									{#if field.formatted}
										<div class="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
											<span class="text-sm font-semibold text-green-800">Formatted:</span>
											<p class="text-sm font-medium text-green-700 mt-1">{field.formatted}</p>
										</div>
									{/if}
									
									{#if field.currencyName}
										<div class="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
											<span class="text-sm font-semibold text-blue-800">Currency:</span>
											<p class="text-sm text-blue-700 mt-1">{field.currencyName}</p>
										</div>
									{/if}
									
									{#if field.interpretation}
										<div class="mt-4 bg-purple-50 rounded-lg p-3 border border-purple-200">
											<span class="text-sm font-semibold text-purple-800">Processing Code Breakdown:</span>
											<div class="text-sm space-y-1 mt-1 text-purple-700">
												<p>First 2 digits: {field.interpretation.firstTwo}</p>
												<p>Next 2 digits: {field.interpretation.nextTwo}</p>
												<p>Last 2 digits: {field.interpretation.lastTwo}</p>
											</div>
										</div>
									{/if}
									
									{#if field.posDetails}
										<div class="mt-4 bg-pink-50 rounded-lg p-3 border border-pink-200">
											<span class="text-sm font-semibold text-pink-800">POS Entry Mode Details:</span>
											<div class="text-sm space-y-1 mt-1 text-pink-700">
												<p>PAN Entry: {field.posDetails.panEntry}</p>
												<p>PIN Entry: {field.posDetails.pinEntry}</p>
												<p>Cardholder Terminal: {field.posDetails.cardholderTerminal}</p>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- ITM Banking Info -->
		<section class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi-light:information" class="h-6 w-6 text-white" />
					<h2 class="text-xl font-bold text-white">ITM Banking Context</h2>
				</div>
			</div>
			<div class="p-6 space-y-6">
				<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
					<p class="text-blue-800 leading-relaxed">
						<strong class="text-blue-900">ITM Banking</strong> uses ISO8583:1987 standard for interbank transactions in Indonesia.
					</p>
				</div>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-blue-100 p-2">
								<Icon icon="mdi-light:message-text" class="h-5 w-5 text-blue-600" />
							</div>
							<h3 class="font-bold text-blue-800">Common Message Types</h3>
						</div>
						<div class="space-y-2">
							{#each [
								{ code: '0200', desc: 'Purchase/Financial Request' },
								{ code: '0210', desc: 'Purchase/Financial Response' },
								{ code: '0400', desc: 'Reversal Request' },
								{ code: '0410', desc: 'Reversal Response' },
								{ code: '0100', desc: 'Authorization Request' },
								{ code: '0110', desc: 'Authorization Response' }
							] as msg}
							<div class="flex items-start space-x-3">
								<Icon icon="mdi-light:check-circle" class="h-4 w-4 text-blue-600 mt-0.5" />
								<div>
									<p class="font-semibold text-blue-800">{msg.code}</p>
									<p class="text-sm text-blue-700">{msg.desc}</p>
								</div>
							</div>
							{/each}
						</div>
					</div>
					<div class="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
						<div class="flex items-center space-x-3 mb-4">
							<div class="rounded-full bg-blue-100 p-2">
								<Icon icon="mdi-light:key" class="h-5 w-5 text-blue-600" />
							</div>
							<h3 class="font-bold text-blue-800">Key Banking Fields</h3>
						</div>
						<div class="space-y-2">
							{#each [
								{ field: 'Field 4', desc: 'Transaction Amount (IDR)' },
								{ field: 'Field 11', desc: 'System Trace Audit Number' },
								{ field: 'Field 37', desc: 'Retrieval Reference Number' },
								{ field: 'Field 39', desc: 'Response Code (00=Approved)' },
								{ field: 'Field 49', desc: 'Currency Code (360=IDR)' },
								{ field: 'Field 52', desc: 'PIN Block (encrypted)' }
							] as field}
							<div class="flex items-start space-x-3">
								<Icon icon="mdi-light:check-circle" class="h-4 w-4 text-blue-600 mt-0.5" />
								<div>
									<p class="font-semibold text-blue-800">{field.field}</p>
									<p class="text-sm text-blue-700">{field.desc}</p>
								</div>
							</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</main>
