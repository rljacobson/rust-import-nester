// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {sortAndNestRustImports} from './import_nester';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('rustImportNester.nestImports', async () => {
        const editor = vscode.window.activeTextEditor;
        if(!editor)
            return;

        // vscode.window.showInformationMessage('Rust Import Nester activated!');

        const document = editor.document;
        if(document.languageId !== 'rust') {
            vscode.window.showWarningMessage('Rust Import Sorter only works on Rust files.');
            return;
        }

        await sortAndNestRustImports(document);
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
