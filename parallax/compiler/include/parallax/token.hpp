// Token model shared by the lexer, parser driver and repair engine.
//
// Position convention (documented in docs/LEXER_DESIGN.md):
//   * offset : 0-based byte offset into the UTF-8 source.
//   * line   : 1-based line number. Only '\n' starts a new line ("\r\n" is
//              therefore one line break; a lone '\r' is ordinary whitespace).
//   * column : 1-based column counted in Unicode code points (a tab is one
//              column).
//   * A token's span is [start, end): `end` points just past the last byte.
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace parallax {

enum class TokenKind : int {
  // keywords
  KwInt, KwFloat, KwChar, KwBool, KwVoid,
  KwIf, KwElse, KwWhile, KwFor, KwReturn, KwBreak, KwContinue,
  KwTrue, KwFalse,
  // names and literals
  Ident, IntLit, FloatLit, CharLit,
  // operators
  Plus, Minus, Star, Slash, Percent, Assign,
  Eq, Ne, Lt, Le, Gt, Ge, AndAnd, OrOr, Not,
  // punctuation
  LParen, RParen, LBrace, RBrace, LBracket, RBracket, Semi, Comma,
  // special
  EndOfFile,    // implicit end of input
  Error,        // lexical error (invalid character, malformed literal, ...)
  Unsupported,  // recognised C construct that MiniC deliberately omits
  Count_
};

constexpr int kTokenKindCount = static_cast<int>(TokenKind::Count_);

struct Position {
  int offset = 0;
  int line = 1;
  int column = 1;
};

struct Token {
  TokenKind kind = TokenKind::Error;
  std::string lexeme;
  Position start;
  Position end;
  std::string message;   // diagnostic text for Error / Unsupported tokens
  // Index of this token in the ORIGINAL token stream, or -1 when the token
  // was synthesised by a repair edit. Lets the repair engine map positions in
  // an edited stream back to the user's source.
  int origin = -1;
};

struct Comment {
  Position start;
  Position end;
  bool block = false;
};

const char* token_kind_name(TokenKind k);        // e.g. "SEMI"
const char* token_kind_spelling(TokenKind k);    // e.g. ";" (canonical text)
const char* token_category(TokenKind k);         // keyword, identifier, ...
bool token_kind_from_name(const std::string& name, TokenKind* out);

// Text inserted when a repair synthesises a token of this kind. Identifiers
// and literals get explicit placeholders so invented content is visible.
std::string synthetic_lexeme(TokenKind k);
bool is_placeholder_kind(TokenKind k);   // Ident / literals incl. true/false (invented content)
bool is_content_kind(TokenKind k);       // user-authored content (names, literals, keywords)

}  // namespace parallax
