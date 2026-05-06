import { parseBitmap, int2bin, hex2bin, clearData } from "./helper";
import { ISO8583_FIELDS } from "./iso8583Fields";
import { parseDataElements } from "./parseDataElements";
import { parseISO8583 } from "./parseISO8583";

/**
 * ISO8583 Class - Backward compatibility wrapper
 * @deprecated Use parseISO8583() function instead for better modularity
 */
export class ISO8583 {
    additionLength: number;
    fields: any;
    message: any;
    fiedsUsed: any;
    dataElement: any;
    constructor(message, additionLength = 0) {
        this.additionLength = additionLength;
        this.fields = ISO8583_FIELDS;

        if (message) {
            this.message = message;
            this.init();
        }
    }

    init(message?) {
        if (message) {
            this.message = message;
        }
        const parsed = parseISO8583(this.message, this.additionLength);

        // Copy all properties
        Object.assign(this, parsed);
        this.fiedsUsed = parsed.fieldsUsed;
        this.dataElement = this.message.substr(this.dataElementOffset);
    }
    dataElementOffset(dataElementOffset: any): any {
        throw new Error("Method not implemented.");
    }

    parseDataElement() {
        return parseDataElements(this.message, this.fiedsUsed, this.dataElementOffset, this.additionLength);
    }

    parseBitmap() {
        this.fiedsUsed = parseBitmap(this.bitmap);
    }
    bitmap(bitmap: any): any {
        throw new Error("Method not implemented.");
    }

    int2bin(integer) {
        return int2bin(integer);
    }

    hex2bin(hexadecimal) {
        return hex2bin(hexadecimal);
    }

    clearData(fieldValue, fieldType) {
        return clearData(fieldValue, fieldType);
    }
}
