#pragma once

#include <string>
#include <vector>

#include "parallax/token.hpp"

namespace parallax {

struct LexResult {
  std::vector<Token> tokens;      // excludes the implicit EOF token
  std::vector<Comment> comments;  // trivia, reported for the token explorer
  Position eof;                   // position of end of input
  int error_count = 0;            // Error tokens
  int unsupported_count = 0;      // Unsupported tokens
};

// Lexes `source` entirely in memory with a re-entrant Flex scanner. Never
// throws for malformed input: problems become Error / Unsupported tokens.
LexResult lex(const std::string& source);

constexpr int kMaxIdentifierLength = 255;

}  // namespace parallax
