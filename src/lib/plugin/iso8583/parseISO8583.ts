import { parseMTI, extractBitmap, parseBitmap } from "./helper";
import { parseDataElements } from "./parseDataElements";

/**
 * Parse complete ISO 8583 message
 * @param {string} message - ISO 8583 message string
 * @param {number} additionLength - Additional length for certain fields
 * @returns {object} Parsed message object with all properties and data elements
 */
export function parseISO8583(message, additionLength = 0) {
    if (!message || message.length < 20) {
        throw new Error('Invalid ISO 8583 message: message too short');
    }

    const messageLength = message.length;
    const mtiInfo = parseMTI(message);
    const bitmapInfo = extractBitmap(message);
    const fieldIndices = parseBitmap(bitmapInfo.bitmap);
    const dataElements = parseDataElements(message, fieldIndices, bitmapInfo.dataElementOffset, additionLength);

    return {
        ...mtiInfo,
        ...bitmapInfo,
        messageLength,
        dataElementLength: messageLength - bitmapInfo.dataElementOffset,
        dataElements,
        fieldsUsed: fieldIndices
    };
}