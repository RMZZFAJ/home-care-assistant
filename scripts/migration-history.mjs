/** Compare SQL tokens without ignoring any quoted value or function body. */
export function migrationTokens(input) {
  const sql = input.replaceAll("\r\n", "\n");
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    if (/\s/.test(sql[i])) { i++; continue; }
    if (sql.startsWith("--", i)) { const end = sql.indexOf("\n", i); i = end < 0 ? sql.length : end + 1; continue; }
    if (sql.startsWith("/*", i)) {
      let depth = 1; i += 2;
      while (depth && i < sql.length) {
        if (sql.startsWith("/*", i)) { depth++; i += 2; }
        else if (sql.startsWith("*/", i)) { depth--; i += 2; }
        else i++;
      }
      if (depth) throw new Error("Unclosed SQL comment.");
      continue;
    }
    const delimiter = /^(?:\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/.exec(sql.slice(i))?.[0];
    if (delimiter) {
      const end = sql.indexOf(delimiter, i + delimiter.length);
      if (end < 0) throw new Error("Unclosed SQL body.");
      tokens.push(sql.slice(i, end + delimiter.length)); i = end + delimiter.length; continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      const start = i, quote = sql[i++];
      const escapes = quote === "'" && tokens.at(-1)?.toLowerCase() === "e";
      let closed = false;
      while (i < sql.length) {
        if (escapes && sql[i] === "\\") { i += 2; continue; }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { i += 2; continue; }
          i++; closed = true; break;
        }
        i++;
      }
      if (!closed) throw new Error("Unclosed SQL quoted value.");
      tokens.push(sql.slice(start, i)); continue;
    }
    const word = /^[A-Za-z_0-9][A-Za-z_0-9$]*/.exec(sql.slice(i))?.[0];
    if (word) { tokens.push(word); i += word.length; }
    else tokens.push(sql[i++]);
  }
  // CLI stores statements without their final delimiter.
  if (tokens.at(-1) === ";") tokens.pop();
  return tokens;
}
export function migrationHistoryMatches(source, statements) {
  return JSON.stringify(migrationTokens(source)) === JSON.stringify(migrationTokens(statements.join(";\n")));
}
