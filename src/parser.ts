import Parser from 'tree-sitter';
import Rust from 'tree-sitter-rust';

let parser: Parser|null = null;

/**
 * Returns a cached Tree-sitter parser instance configured for Rust.
 */
export function getRustParser(): Parser {
    if(!parser) {
        parser = new Parser();
        parser.setLanguage(Rust as unknown as Parser.Language);
    }
    return parser;
}
