#pragma once

#include <memory>
#include <string>
#include <vector>

#include "parallax/ast.hpp"
#include "parallax/token.hpp"

namespace parallax {

struct SyntaxDiagnostic {
  int token_index = 0;            // index of the offending lookahead (n == EOF)
  TokenKind unexpected = TokenKind::EndOfFile;
  std::vector<TokenKind> expected;  // exact set (Bison LAC is enabled)
  int state = -1;                   // LR state on top of the stack when detected
  std::string message;
};

struct ParseOptions {
  // Stop after the first syntax error (used to validate repair candidates).
  // When false, Bison's panic-mode `error` productions recover and continue.
  bool stop_at_first_error = false;
  bool build_ast = true;
  // Capture Bison's own debug trace (shift/reduce/state transitions).
  bool trace = false;
  int trace_limit = 4000;  // lines
};

struct ParseResult {
  bool accepted = false;  // parser returned 0 (may still contain recovered errors)
  std::vector<SyntaxDiagnostic> diagnostics;
  std::shared_ptr<AstArena> arena;  // owns every node of `root`
  Node* root = nullptr;             // non-null iff diagnostics.empty() && accepted
  // Tree built while panic-mode recovery was active (contains Error nodes).
  // Non-null whenever the parser accepted, even with recovered errors.
  Node* recovered_root = nullptr;
  bool resource_limit = false;      // parser stack exhausted / nesting too deep
  std::vector<std::string> trace;
  bool trace_truncated = false;

  bool ok() const { return accepted && diagnostics.empty(); }
  int first_error_index() const {
    return diagnostics.empty() ? -1 : diagnostics.front().token_index;
  }
};

// Parses a token stream (without the implicit EOF token). The parser is
// re-entrant (pure Bison parser + per-call context) and keeps no global
// state except Bison's `yydebug` flag, which is only touched when tracing.
ParseResult parse_tokens(const std::vector<Token>& tokens, const ParseOptions& opts);

// Expected-token set at stream position `pos`: parses tokens[0, pos) and
// then reports what the parser would accept next. Returns false if the
// prefix itself contains an error before `pos`.
bool expected_at(const std::vector<Token>& tokens, int pos, std::vector<TokenKind>* out,
                 int* state = nullptr);


}  // namespace parallax
