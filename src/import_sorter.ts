export function sortAndNestRustImports(code: string): string {
    const lines                 = code.split('\n');
    const importLines: string[] = [];
    const otherLines: string[]  = [];

    for(const line of lines) {
        if(/^\s*use\s+/.test(line)) {
            importLines.push(line);
        } else {
            otherLines.push(line);
        }
    }

    // Basic sort, grouping by top-level path
    importLines.sort((a, b) => {
        const getRoot = (l: string) => l.match(/use\s+([\w:]+)/)?.[1] ?? '';
        return getRoot(a).localeCompare(getRoot(b));
    });

    return [...importLines, '', ...otherLines].join('\n');
}
