let monaco: any;

export async function registerJsonSchema(
  schemaId: string,
  schema: object
) {
  if (!monaco) {
    monaco = await import('monaco-editor');
  }

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: [
      {
        uri: schemaId,
        fileMatch: ['*'],
        schema
      }
    ]
  });
}
