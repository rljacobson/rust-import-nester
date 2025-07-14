import * as Parser from 'tree-sitter';
import * as vscode from 'vscode';
import {getRustParser} from './parser';


/**
 * Extension configuration keys.
 */
function getExtensionConfig() {
    const config = vscode.workspace.getConfiguration('rustImportNester');
    return {
        trailingComma: config.get<boolean>('trailingComma', true),
        singleLineThreshold: config.get<number>('singleLineThreshold', 1),
    };
}


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

function collectUseDeclarations(tree: Parser.Tree): Parser.SyntaxNode[] {
    const root                      = tree.rootNode;
    const uses: Parser.SyntaxNode[] = [];

    for(const child of root.namedChildren) {
        if(child.type === 'use_declaration') {
            uses.push(child);
        }
    }

    return uses;
}

function extractUsePaths(node: Parser.SyntaxNode): string[][] {
    const paths: string[][] = [];

    // The child of a `use_declaration`
    const pathNode = node.namedChildren.find(c =>
        c.type === 'scoped_identifier' ||
        c.type === 'use_list' ||
        c.type === 'scoped_use_list' ||
        c.type === 'identifier' ||
        c.type === 'self'
    );

    if (!pathNode) {
        console.warn('No path node found in use_declaration:', node);
        return paths;
    }

    function extractPathsFromNode(n: Parser.SyntaxNode, prefix: string[] = []): void {
        if (n.type === 'identifier') {
            paths.push([...prefix, n.text]);
        } else if (n.type === 'scoped_identifier') {
            const children = n.namedChildren;
            const rightMost = children[children.length - 1];
            const left = children.slice(0, children.length - 1);

            // Build up left side recursively
            const leftParts = [];
            let current = n;
            while (current && current.type === 'scoped_identifier') {
                const parts = current.namedChildren;
                if (parts.length === 2 && parts[1].type === 'identifier') {
                    leftParts.push(parts[1].text);
                    current = parts[0];
                } else {
                    break;
                }
            }
            if (current?.type === 'identifier') {
                leftParts.push(current.text);
            }
            paths.push([...prefix, ...leftParts.reverse()]);
        } else if (n.type === 'self') {
            paths.push([...prefix, 'self']);
        } else if (n.type === 'use_list') {
            for (const child of n.namedChildren) {
                extractPathsFromNode(child, prefix);
            }
        } else if (n.type === 'scoped_use_list') {
            const prefixNode = n.child(0);
            const listNode = n.namedChildren.find(c => c.type === 'use_list');
            if (prefixNode && listNode) {
                const prefixParts = extractPathParts(prefixNode);
                for (const child of listNode.namedChildren) {
                    extractPathsFromNode(child, [...prefix, ...prefixParts]);
                }
            }
        }
    }

    function extractPathParts(n: Parser.SyntaxNode): string[] {
        const parts: string[] = [];
        let current = n;
        while (current) {
            if (current.type === 'identifier') {
                parts.push(current.text);
                break;
            } else if (current.type === 'scoped_identifier') {
                const children = current.namedChildren;
                if (children.length === 2) {
                    parts.push(children[1].text);
                    current = children[0];
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return parts.reverse();
    }

    extractPathsFromNode(pathNode);
    return paths;
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
    console.log('Organizing imports...');
    // vscode.window.showInformationMessage('Organizing imports...');

    const success = await organizeImports(document);
    if(!success) {
        console.log('No organize imports actions available.');
        // vscode.window.showInformationMessage('No organize imports actions available.');
    }

    const config = getExtensionConfig();



    // Tree-sitter Logic
    const text   = document.getText();
    const parser = getRustParser();
    const tree   = parser.parse(text);

    console.log('Parsed Rust syntax tree root: ' + tree.rootNode.type);
    // vscode.window.showInformationMessage('Parsed Rust syntax tree root: ' + tree.rootNode.type);

    const uses = collectUseDeclarations(tree);

    console.log(`Found ${uses.length} use declarations`);

    // Flatten, sort, and group
    const allPaths: string[][] = [];

    for (const node of uses) {
        const paths = extractUsePaths(node);
        allPaths.push(...paths);
    }

    // Step: Coalesce adjacent paths with common prefixes into a nested tree
    type Nested = Map<string, Nested>;

    function buildNestedTree(paths: string[][]): Nested {
        const root: Nested = new Map();

        for (const path of paths) {
            let node = root;
            for (const segment of path) {
                if (!node.has(segment)) {
                    node.set(segment, new Map());
                }
                node = node.get(segment)!;
            }
        }

        return root;
    }

    function sortNestedTree(node: Nested): void {
        for (const child of node.values()) {
            sortNestedTree(child);
        }
        const sorted = new Map(
            Array.from(node.entries()).sort(([a], [b]) => {
                const aIsLower = /^[a-z]/.test(a);
                const bIsLower = /^[a-z]/.test(b);
                if (aIsLower !== bIsLower) return aIsLower ? -1 : 1;
                return a.localeCompare(b);
            })
        );
        node.clear();
        for (const [k, v] of sorted) node.set(k, v);
    }

    // Pretty prints the nested imports.
    function formatTreeToRustUses(node: Nested, indent = ''): string[] {
        const lines: string[] = [];


        for(const [name, children] of node) {
            const isLeafList  = Array.from(children.values()).every(child => child.size === 0);
            const numChildren = children.size;

            // We format lists of at most `singleLineThreshold` leaf items on a single line.
            if(isLeafList && numChildren <= config.singleLineThreshold) {
                if(children.size === 0) {
                    // Case: just the current name
                    lines.push(`${indent}${name}`);
                } else if(children.size === 1) {
                    // Case: exactly one child
                    const [[childName]] = children;
                    lines.push(`${indent}${name}::${childName}`);
                } else {
                    // Case: multiple children within threshold
                    const childItems = Array.from(children.keys()).join(', ');
                    lines.push(`${indent}${name}::{${childItems}}`);
                }
            } else {
                // The non `singleLineThreshold` case.
                if(numChildren === 0) {
                    lines.push(`${indent}${name}`);
                } else {
                    const childLines = formatTreeToRustUses(children, indent + '  ');
                    if(childLines.length === 1 && !childLines[0].includes(',') && !childLines[0].includes('{')) {
                        lines.push(`${indent}${name}::${childLines[0].trim()}`);
                    } else {
                        lines.push(`${indent}${name}::{`);
                        for(const child of childLines) {
                            lines.push(`${child}`);
                        }
                        lines.push(`${indent}}`);
                    }
                }
            }
            // Separate each item with a comma
            lines[lines.length - 1] = lines[lines.length - 1] + ',';
        }

        // Remove the last comma if trailingComma is false
        if (!config.trailingComma) {
            lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
        }

        return lines;
    }

    const nested = buildNestedTree(allPaths);
    sortNestedTree(nested);

    console.log('Coalesced and formatted use declarations:');
    for (const [topLevel, children] of nested) {
        const lines = formatTreeToRustUses(new Map([[topLevel, children]]));
        if (lines.length > 1) {
            console.log(`use ${lines[0]}`);
            for (let i = 1; i < lines.length; i++) {
                if (i < lines.length - 1) {
                    console.log(lines[i]);
                } else {
                    if (config.trailingComma) {
                        console.log(lines[i].slice(0, -1) + ';');

                    } else {
                        // Trailing comma removed elsewhere
                        console.log(lines[i] + ';');
                    }
                }
            }
        } else if (lines.length === 1) {
            if (config.trailingComma) {
                console.log(`use ${lines[0].slice(0, -1)};`);
            } else {
                // Trailing comma removed elsewhere
                console.log(`use ${lines[0]};`);
            }
        }
    }
}


/**
 * Recursively prints the structure of a Tree-sitter syntax node and its children.
 *
 * @param node - The root syntax node to print.
 * @param indent - The current indentation level (used internally for recursion).
 */
function printTree(node: Parser.SyntaxNode, sourceText: string, indent: string = ''): void {
    const snippet = sourceText.slice(node.startIndex, node.endIndex);
    console.log(`${indent}${node.type} [${node.startIndex}, ${node.endIndex}] "${snippet}"`);
    for(const child of node.namedChildren) {
        printTree(child, sourceText, indent + '  ');
    }
}
