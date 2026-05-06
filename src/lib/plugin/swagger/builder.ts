import { parseDefinitionCell } from "./definition";
import { applyPathWithRef } from "./refSchemaBuilder";

export function buildSwagger(rows) {
    const swagger = {
        swagger: "2.0",
        info: { title: "Excel Driven API", version: "1.0.0" },
        paths: {
            "/": {
                post: {
                    consumes: ["application/json"],
                    produces: ["application/json"],
                    parameters: [],
                    responses: {
                        200: {
                            description: "Success",
                            schema: { $ref: "#/definitions/Response" }
                        }
                    }
                }
            }
        },
        definitions: {
            Request: { type: "object", properties: {} },
            Response: { type: "object", properties: {} }
        }
    };

    rows.forEach(row => {
        if (!row.definitions || !row.path) return;
        const def = parseDefinitionCell(row.definitions);
        if (!def || Object.keys(def).length === 0) return;

        const fieldName = row.fieldName;
        const propSchema = def[fieldName];
        if (!propSchema) return;


        if (row.inputOutput === "Input" && row.location === "body") {
            applyPathWithRef({
                definitions: swagger.definitions,
                rootModelName: "Request",
                path: row.path,
                propertySchema: propSchema
            });
        }

        if (row.inputOutput === "Output" && row.location === "body") {
            applyPathWithRef({
                definitions: swagger.definitions,
                rootModelName: "Response",
                path: row.path,
                propertySchema: propSchema
            });
        }
    });

    // Attach request body
    swagger.paths["/"].post.parameters.push({
        name: "request",
        in: "body",
        required: true,
        schema: { $ref: "#/definitions/Request" }
    });

    return swagger;
}
