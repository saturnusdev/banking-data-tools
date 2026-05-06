import { MESSAGE_CLASS_ARRAY, MESSAGE_FUNCTION_ARRAY, MESSAGE_ORIGIN_ARRAY, VERSION_ARRAY } from "./iso8583Fields";

/**
 * Convert integer to 8-bit binary string
 * @param {number} integer - Integer value (0-255)
 * @returns {string} Binary string representation
 */
export function int2bin(integer) {
    let str = '';
    for (let i = 0; i < 8; i++) {
        const k = Math.pow(2, 8 - i - 1);
        const l = (Math.floor(integer / k)) % 2;
        str += l.toString();
    }
    return str;
}

/**
 * Convert hexadecimal string to binary string
 * @param {string} hexadecimal - Hexadecimal string
 * @returns {string} Binary string representation
 */
export function hex2bin(hexadecimal) {
    let str = '';
    for (let i = 0; i < hexadecimal.length - 1; i += 2) {
        const dec = parseInt(hexadecimal.substr(i, 2), 16);
        str += int2bin(dec);
    }
    return str;
}

/**
 * Parse bitmap to get list of field indices
 * @param {string} bitmap - Hexadecimal bitmap string
 * @returns {number[]} Array of field indices
 */
export function parseBitmap(bitmap) {
    const str = hex2bin(bitmap);
    const fields = [];
    for (let i = 0; i < str.length; i++) {
        if (str[i] == '1') {
            const j = i + 1;
            if (j != 1 && j != 65) {
                fields.push(j);
            }
        }
    }
    return fields;
}

/**
 * Clear/convert field value based on field type
 * @param {string} fieldValue - Raw field value
 * @param {string} fieldType - Field type (n, a, an, ans, b, z)
 * @returns {string|number} Processed field value
 */
export function clearData(fieldValue, fieldType) {
    switch (fieldType) {
        case 'n':
            if (fieldValue.length) {
                return parseInt(fieldValue);
            }
            break;
    }
    return fieldValue;
}

/**
 * Parse MTI (Message Type Indicator) from message
 * @param {string} message - ISO 8583 message string
 * @returns {object} MTI breakdown object
 */
export function parseMTI(message) {
    const mti = message.substr(0, 4);
    const versionID = mti.substr(0, 1);
    const messageClassID = mti.substr(1, 1);
    const messageFunctionID = mti.substr(2, 1);
    const messageOriginID = mti.substr(3, 1);

    return {
        mti,
        versionID,
        version: VERSION_ARRAY[versionID] || '',
        messageClassID,
        messageClass: MESSAGE_CLASS_ARRAY[messageClassID] || '',
        messageFunctionID,
        messageFunction: MESSAGE_FUNCTION_ARRAY[messageFunctionID] || '',
        messageOriginID,
        messageOrigin: MESSAGE_ORIGIN_ARRAY[messageOriginID] || ''
    };
}

/**
 * Extract bitmap and calculate data element offset
 * @param {string} message - ISO 8583 message string
 * @returns {object} Bitmap information object
 */
export function extractBitmap(message) {
    const bitmap1 = message.substr(4, 16);
    const bitmap1bin = hex2bin(bitmap1.substr(0, 2));
    let bitmap = bitmap1;
    let bitmap2 = '';
    let bitmap3 = '';
    let dataElementOffset = 20;

    if (bitmap1bin[0] == '1') {
        bitmap2 = message.substr(20, 16);
        const bitmap2bin = hex2bin(bitmap2.substr(0, 2));
        bitmap += bitmap2;
        if (bitmap2bin[0] == '1') {
            bitmap3 = message.substr(36, 16);
            bitmap += bitmap3;
            dataElementOffset = 52;
        } else {
            dataElementOffset = 36;
        }
    }

    return {
        bitmap,
        bitmap1,
        bitmap2,
        bitmap3,
        dataElementOffset
    };
}