/**
 * @file webutil-code.js
 * @description Code syntax highlighter and HTML escaper for the Web Utility live snippet editor.
 * @module webutil-code
 */

/**
 * Escapes unsafe HTML characters into entity encodings.
 *
 * @param {string} value Raw text input.
 * @returns {string} Safe HTML string.
 */
export function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Tokenizes generated JavaScript/JSON code strings and wraps syntax components in CSS token spans.
 *
 * @param {string} value Raw code string.
 * @returns {string} Syntax-highlighted HTML string.
 */
export function highlightJavaScript(value) {
    const tokenPattern = /(<\/?[A-Za-z][^>\n]*>)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|new|true|false|null|undefined|return|await|async|function|class|import|from|export|default|if|else|try|catch|finally|throw)\b|\b(\d+(?:\.\d+)?)\b/g;
    let highlighted = "";
    let cursor = 0;
    for (const match of value.matchAll(tokenPattern)) {
        const [token, tag, comment, property, string, keyword, number] = match;
        highlighted += escapeHtml(value.slice(cursor, match.index));
        const type = tag ? "tag" : comment ? "comment" : property ? "property" : string ? "string" : keyword ? "keyword" : number ? "number" : "";
        highlighted += `<span class="token-${type}">${escapeHtml(token)}</span>`;
        cursor = match.index + token.length;
    }
    return highlighted + escapeHtml(value.slice(cursor));
}
