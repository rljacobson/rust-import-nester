import * as vscode from 'vscode';
import {getRustParser} from './parser';


/**
 * Triggers the organize imports code action for the given document.
 *
 * @param document - The active Rust text document
 * @returns true if organize imports actions were applied, false otherwise
 */
export async function organizeImports(document: vscode.TextDocument): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if(!editor)
        return false;

    const range = new vscode.Range(0, 0, document.lineCount, 0);

    const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        'vscode.executeCodeActionProvider', document.uri, range, vscode.CodeActionKind.SourceOrganizeImports.value);

    if(codeActions && codeActions.length > 0) {
        for(const action of codeActions) {
            if(action.edit) {
                await vscode.workspace.applyEdit(action.edit);
            }
            if(action.command) {
                await vscode.commands.executeCommand(action.command.command, ...(action.command.arguments ?? []));
            }
        }
        return true;
    } else {
        return false;
    }
}

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

    const success = await organizeImports(document);
    if(!success) {
        vscode.window.showInformationMessage('No organize imports actions available.');
    }

    // Tree-sitter Logic
    const text   = document.getText();
    const parser = getRustParser();
    const tree   = parser.parse(text);

    vscode.window.showInformationMessage('Parsed Rust syntax tree root: ' + tree.rootNode.type);
}
