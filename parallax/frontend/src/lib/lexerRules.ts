// Maps a token kind (JSON name) to the TokenKind enumerator used in
// grammar/minic.l, so the UI can show the actual Flex rule(s) that emit it.
export const KIND_ENUM: Record<string, string> = {
  INT: "KwInt", FLOAT: "KwFloat", CHAR: "KwChar", BOOL: "KwBool", VOID: "KwVoid", IF: "KwIf", ELSE: "KwElse",
  WHILE: "KwWhile", FOR: "KwFor", RETURN: "KwReturn", BREAK: "KwBreak", CONTINUE: "KwContinue", TRUE: "KwTrue",
  FALSE: "KwFalse", IDENT: "Ident", INT_LIT: "IntLit", FLOAT_LIT: "FloatLit", CHAR_LIT: "CharLit", PLUS: "Plus",
  MINUS: "Minus", STAR: "Star", SLASH: "Slash", PERCENT: "Percent", ASSIGN: "Assign", EQ: "Eq", NE: "Ne", LT: "Lt",
  LE: "Le", GT: "Gt", GE: "Ge", AND: "AndAnd", OR: "OrOr", NOT: "Not", LPAREN: "LParen", RPAREN: "RParen",
  LBRACE: "LBrace", RBRACE: "RBrace", LBRACKET: "LBracket", RBRACKET: "RBracket", SEMI: "Semi", COMMA: "Comma",
  ERROR: "Error", UNSUPPORTED: "Unsupported",
};

/** Lines of the Flex rules section that emit `kind` (pattern + action). */
export function rulesFor(lexerSource: string, kind: string): string[] {
  const en = KIND_ENUM[kind];
  if (!en) return [];
  const needle = `TokenKind::${en})`;
  const needle2 = `TokenKind::${en},`;
  const lines = lexerSource.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(needle) && !lines[i].includes(needle2)) continue;
    // walk back to the line that starts the rule (pattern in column 0)
    let s = i;
    while (s > 0 && /^\s/.test(lines[s])) s--;
    const text = lines.slice(s, i + 1).map((l) => l.trimEnd()).join("\n");
    if (!out.includes(text)) out.push(text);
  }
  return out;
}
