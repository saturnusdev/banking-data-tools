import { ISO8583_FIELDS } from "./iso8583Fields";

/**
 * Parse data elements from message
 * @param {string} message - ISO 8583 message string
 * @param {number[]} fieldIndices - Array of field indices to parse
 * @param {number} dataElementOffset - Offset where data elements start
 * @param {number} additionLength - Additional length for certain fields
 * @returns {object[]} Array of parsed data element objects
 */
export function parseDataElements(message, fieldIndices, dataElementOffset, additionLength = 0) {
    let lastOffset = dataElementOffset;
    const data = [];

    for (let i = 0; i < fieldIndices.length; i++) {
        const fieldIndex = fieldIndices[i].toString();
        const fobj = ISO8583_FIELDS[fieldIndex];
        if (!fobj) continue;

        const fieldType = fobj[0];
        const fieldMaxLength = fobj[1];
        let fieldLength = 1;
        const fieldName = fobj[2];
        const isVar = fobj[3];
        const isAdd = fobj[4];
        let fieldValue = '';

        if (fieldType == 'b') {
            fieldLength = Math.floor(fieldMaxLength / 8);
        } else {
            fieldLength = fieldMaxLength;
        }

        if (isVar) {
            const vl = fieldLength.toString().length;
            const tl = parseInt(message.substr(lastOffset, vl));
            lastOffset += vl;
            fieldValue = message.substr(lastOffset, tl);
            lastOffset += tl;
            fieldLength = tl;
        } else if (isAdd) {
            const tl = fieldLength + additionLength;
            fieldValue = message.substr(lastOffset, tl);
            lastOffset += tl;
            fieldLength = tl;
        } else {
            fieldValue = message.substr(lastOffset, fieldLength);
            lastOffset += fieldLength;
        }

        data.push({
            fieldIndex: fieldIndex,
            fieldType: fieldType,
            fieldMaxLength: fieldMaxLength,
            fieldLength: fieldLength,
            fieldName: fieldName,
            fieldValue: fieldValue
        });
    }

    return data;
}