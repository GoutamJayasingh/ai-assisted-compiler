# AST and representations

Source: [`ast.hpp`](../compiler/include/parallax/ast.hpp), [`ast.cpp`](../compiler/src/ast.cpp), serialisation in [`serialize.cpp`](../compiler/src/serialize.cpp).

## Parse tree vs. AST

A **parse tree** records every grammar rule applied. For `(a + b) * c` it contains the chain `expr → or_expr → and_expr → … → primary`, the parentheses, and every token. Bison never materialises it; the UI's *parse progression* (Bison's shift/reduce trace) is the closest view of it.

The **AST** is built by the grammar's semantic actions and keeps only the structure that carries meaning:

```
Binary op=*
  Binary op=+
    Ident name=a
    Ident name=b
  Ident name=c
```

Parentheses, semicolons, braces and commas do not appear. Precedence is encoded in the shape of the tree.

## Node types

A tagged node (`NodeKind` + named attributes + ordered children). Each kind uses a documented subset of the attributes:

| Kind | Attributes | Children |
|---|---|---|
| Program | — | Function \| DeclStmt … |
| Function | type, name | Param …, Block (last) |
| Param | type, name, array (`[]` or empty) | — |
| DeclStmt | type | VarDecl … |
| VarDecl | name, array (size or empty) | [initialiser] |
| Block | — | statements |
| Assign | — | target (Ident \| Index), value |
| If | — | cond, then, [else] |
| While | — | cond, body |
| For | — | init \| Empty, cond \| Empty, update \| Empty, body |
| Return | — | [value] |
| Break, Continue, EmptyStmt | — | — |
| ExprStmt | — | expr |
| Ident | name | — |
| IntLit, FloatLit, CharLit, BoolLit | value (source spelling) | — |
| Unary | op | operand |
| Binary | op | lhs, rhs |
| Call | name | args … |
| Index | name | index |
| Empty | — | absent optional clause |
| Error | — | placeholder from panic-mode recovery (partial trees only) |

A tagged representation was chosen over a class hierarchy because the main consumers (JSON serialisation, canonical form, diff, name resolution) are generic tree walks. A per-kind schema is still enforced by the grammar actions and documented above.

## Ownership

Every node is owned by an `AstArena` (`std::vector<std::unique_ptr<Node>>`) that is shared with the `ParseResult`. Child links are non-owning pointers whose lifetime is bounded by the arena. Why:

- Bison discards partially built values during error recovery. With an arena nothing leaks, and no `%destructor` bookkeeping is needed.
- There is no shared or cyclic ownership; the tree is freed in one step.

## Source spans

Each node stores the token range `[tok_begin, tok_end)` it covers (computed by `YYLLOC_DEFAULT`). At serialisation the range becomes source positions: the start of the first token to the end of the last. An empty range (e.g. an `Empty` for-clause) uses the position of the following token. In the UI, selecting a node highlights exactly that byte range.

## Canonical form, equality and hashing

`canonical_form(n)` = `(Kind attr=len:value … child child …)`, recursively.

- Includes: node kind, the non-empty attributes `type, name, op, value, array` (length-prefixed, so no attribute content can forge structure), and children in order.
- Excludes: spans, whitespace, comments, parentheses (they are not nodes).

Two programs are **structurally identical** iff their canonical forms are equal. `structural_hash` is the 64-bit FNV-1a hash of the canonical form, used for display. **Grouping compares the full canonical strings**, so a hash collision cannot merge two different programs.

Consequences to be aware of:

- `(a) + 2` ≡ `a + 2` ≡ `(a + 2)` — same AST.
- `x = 1;;` ≢ `x = 1;` — an empty statement is a node.
- `a + b` ≢ `b + a` — no algebraic normalisation; structural identity is deliberately conservative.
- Literal spellings matter: `007` ≢ `7`.

Pretty-printed similarity is never used for equivalence.

## Structural diff

`backend/app/astdiff.py` compares two serialised ASTs with the same canonical rule. Children are aligned by a longest common subsequence over canonical subtree strings. Unmatched children of equal kind are compared recursively; the rest are reported as `added` / `removed`; attribute changes as `changed`. It is used by `POST /api/repair/compare` and the AST explorer.

## Other representations exposed

| Representation | Where |
|---|---|
| Token stream with spans | `/api/lex`, Lexical analysis view |
| Structured diagnostics + LR state items | `/api/parse`, Grammar & parsing view |
| Bison shift/reduce trace | `/api/parse` with `trace: true` |
| AST JSON, readable tree text, hash, node count, depth | `/api/parse`, AST explorer |
| Recovered partial tree (with `Error` nodes) | `parse.recovered_ast` when errors exist, labelled as *not* a valid AST |
| Name-resolution warnings | `parse.name_warnings` |

When no valid AST exists, the API returns `ast: null`, and the UI says so explicitly.
