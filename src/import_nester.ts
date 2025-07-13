import * as vscode from 'vscode';

/**
 * Sorts and organizes Rust imports using the built-in VSCode command.
 * This relies on rust-analyzer's support for `source.organizeImports`.
 *
 * This is a preparatory step before applying further custom logic.
 *
 * @param document - The active Rust text document
 */
export async function sortAndNestRustImports(document: vscode.TextDocument): Promise<void> {
    vscode.window.showInformationMessage('Organizing imports...');
    // Call the built-in command to organize imports
    await vscode.commands.executeCommand('editor.action.organizeImports');

    // Placeholder: add custom nesting logic here later
}
