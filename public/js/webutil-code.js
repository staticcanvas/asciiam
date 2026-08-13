/** Escape generated source before adding syntax-token markup. */
export function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

/** Tokenize generated JavaScript without evaluating it or accepting HTML input. */
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
