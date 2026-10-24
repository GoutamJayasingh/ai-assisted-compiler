# Lexer design

Source: [`compiler/grammar/minic.l`](../compiler/grammar/minic.l) (Flex 2.6), interface [`lexer.hpp`](../compiler/include/parallax/lexer.hpp), token model [`token.hpp`](../compiler/include/parallax/token.hpp).

## Architecture

- **Re-entrant scanner** (`%option reentrant`, prefix `minic_`): all state lives in a per-call `LexState` passed as `yyextra`, so lexing is thread-safe.
- **In-memory input** via `yy_scan_bytes`: no temporary files.
- **Decoupled from Bison.** `lex()` returns a `std::vector<Token>`; the parser reads tokens from that vector. The repair engine can therefore parse edited token streams *and* re-lex reconstructed source to cross-check them.
- **Total function.** No input makes the lexer abort or loop: `%option nodefault` plus a final catch-all rule guarantee every byte is consumed by some rule. Problems become `ERROR` or `UNSUPPORTED` tokens that carry a message.

## Token record

| Field | Meaning |
|---|---|
| `kind` | one of 44 kinds (`INT`, `IDENT`, `PLUS`, …, `ERROR`, `UNSUPPORTED`) |
| `lexeme` | exact source bytes |
| `start`, `end` | positions; `end` is exclusive |
| `message` | for `ERROR` / `UNSUPPORTED` only |
| `origin` | index in the original stream (used by repair to map edited streams back to source) |
| JSON `category` | keyword, type-keyword, identifier, literal, operator, punctuation, error, unsupported |
| JSON `value` | decoded literal value (integer, float, character code or boolean) |

## Position convention

| Field | Convention |
|---|---|
| `offset` | 0-based **UTF-8 byte** offset |
| `line` | 1-based; only `\n` increments it (CRLF counts once; a lone `\r` is whitespace) |
| `column` | 1-based, counted in **Unicode code points**; a tab counts as 1 |

Implementation: `YY_USER_ACTION` calls `LexState::advance`, which records the token start and then walks the matched bytes, counting code points (bytes that are not `10xxxxxx` continuation bytes).

**Frontend conversion.** The editor uses UTF-16 indices. `frontend/src/lib/positions.ts` (`OffsetMap`) maps byte offsets to UTF-16 exactly; tests cover 2-byte and 4-byte characters.

## Rules and longest match

Flex chooses the longest match, and on a tie the earlier rule wins. This is used deliberately:

- `==` beats `=`, `<=` beats `<`, `&&` beats the unsupported `&`, `++` (unsupported) beats `+`.
- `intx` is an identifier, not `int` + `x`: the identifier rule matches 4 characters against 3 for the keyword.
- **Numbers:** valid float rules are listed before malformed-number rules, so `1.5e3` is a float. Longer malformed spellings win: `1.2.3` (5 chars) beats `1.2` (3) and becomes one `ERROR` token (“more than one decimal point”). `12abc` → “digits immediately followed by letters”. `1e`, `1e+` and `1.5e+` → “malformed exponent”. `.5` → “requires a digit before the decimal point”.
- **Minus is never part of a number**: `x=-1` lexes as `IDENT ASSIGN MINUS INT_LIT`; the grammar's unary minus handles it.

## Lexical errors

| Input | Result |
|---|---|
| invalid character (`@`, `$`, `` ` ``) | `ERROR` “invalid character '@'” |
| control byte | `ERROR` “invalid control character” |
| non-ASCII outside comments | one `ERROR` token per UTF-8 sequence |
| unterminated `/* …` | `ERROR` from the comment start to EOF |
| unterminated `'a` | `ERROR` up to the end of the line |
| `''`, `'ab'`, `'\q'`, `'é'` | `ERROR` with a specific message |
| integer > 2147483647 | `ERROR` “integer literal out of range” |
| identifier > 255 characters | `ERROR` “identifier longer than 255 characters” |
| string literal, `#include`, `++`, `->`, `struct`, … | `UNSUPPORTED` with an explanation |

The parser treats `ERROR` and `UNSUPPORTED` as a token kind (`T_BAD`) that no rule accepts. A lexical error is therefore also a syntax error at the same place, and the repair engine can propose deleting or replacing it.

## Comments

Comments are not tokens. They are reported as trivia (`comments[]` with spans) so the token explorer can show them, and the repair engine **preserves them** when it reconstructs repaired source.

## Tests

`compiler/tests/test_lexer.cpp` (20 tests): empty input, keyword/identifier boundaries, longest match, minus handling, tabs, CRLF vs LF, multi-line comments, an unterminated comment, a missing final newline, Unicode in comments (code-point columns and byte offsets), invalid characters, long identifiers, every malformed number form, char literals and escapes, unsupported constructs, determinism and origins. The error catalog (`evaluation/catalog`) adds L01–L16.
