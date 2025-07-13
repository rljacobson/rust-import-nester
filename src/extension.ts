// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {sortAndNestRustImports} from './import_sorter';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('rustImportSorter.sortImports', () => {
        const editor = vscode.window.activeTextEditor;
        if(!editor) {
            return;
        }

        const document = editor.document;
        if(document.languageId !== 'rust') {
            vscode.window.showWarningMessage('This only works with Rust files.');
            return;
        }

        const code   = document.getText();
        const sorted = sortAndNestRustImports(code);

        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(code.length));

        editor.edit(editBuilder => { editBuilder.replace(fullRange, sorted); });
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
