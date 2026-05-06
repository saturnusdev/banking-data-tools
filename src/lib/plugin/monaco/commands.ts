export async function registerCommands(editor: any) {
    const monaco = await import('monaco-editor');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        // Beautify
        editor.getAction('editor.action.formatDocument').run();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        // Custom filter
        window.dispatchEvent(new Event('json-filter'));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
        window.dispatchEvent(new Event('json-diff'));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
        editor.executeAction('editor.action.selectAll');
    }) 
}
