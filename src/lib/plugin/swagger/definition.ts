import yaml from "js-yaml";
import { removeEmpty } from "./removeEmpty";

const KNOWN_KEYS = [
    "type",
    "format",
    "description",
    "minLength",
    "maxLength",
    "pattern",
    "example"
];

export function parseDefinitionCell(text) {
    if (!text || typeof text !== "string") return {};

    try {
        const rawLines = text.replace(/\r/g, "").split("\n");

        // find property name
        const firstLineIndex = rawLines.findIndex(l => l.trim());
        if (firstLineIndex === -1) return {};

        const propName = rawLines[firstLineIndex]
            .trim()
            .replace(/:$/, "");

        let output = [`${propName}:`];
        let i = firstLineIndex + 1;

        while (i < rawLines.length) {
            const line = rawLines[i];

            // ---------- MULTILINE DESCRIPTION ----------
            if (/^\s*description\s*:/.test(line)) {
                const indent = "  ";
                let descLines = [];

                let first = line.split("description:")[1] || "";
                first = first.replace(/^,/, "").trim();
                if (first) descLines.push(first);

                i++;

                // collect until next KNOWN key
                while (i < rawLines.length && !isKnownKey(rawLines[i])) {
                    descLines.push(
                        rawLines[i].replace(/^,/, "").trim()
                    );
                    i++;
                }

                output.push(`${indent}description: >-`);
                descLines.forEach(l =>
                    output.push(`${indent}  ${l}`)
                );

                continue;
            }

            // ---------- NORMAL KEY ----------
            if (isKnownKey(line)) {
                output.push(`  ${cleanLine(line)}`);
            }

            // ignore free text outside description
            i++;
        }

        const fixedYaml = output.join("\n");
        // console.log("FIXED YAML:\n", fixedYaml);

        const parsed = yaml.load(fixedYaml);
        return removeEmpty(parsed && typeof parsed === "object" ? parsed : {});
    } catch (e) {
        console.error("YAML parse error:", e);
        return {};
    }
}

function isKnownKey(line) {
    const trimmed = line.trim();
    return KNOWN_KEYS.some(k =>
        trimmed.startsWith(`${k}:`)
    );
}

function cleanLine(line) {
    return line
        .trim()
        .replace(/description:\s*,/g, "description:")
        .replace(/^,/, "")
        .replace(/example:\s*''/g, 'example: ""');
}
