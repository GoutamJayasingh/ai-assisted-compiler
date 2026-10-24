#include "parallax/token.hpp"

namespace parallax {

namespace {
struct KindInfo {
  const char* name;
  const char* spelling;
  const char* category;
};

// Order MUST match enum TokenKind.
constexpr KindInfo kInfo[] = {
    {"INT", "int", "type-keyword"},
    {"FLOAT", "float", "type-keyword"},
    {"CHAR", "char", "type-keyword"},
    {"BOOL", "bool", "type-keyword"},
    {"VOID", "void", "type-keyword"},
    {"IF", "if", "keyword"},
    {"ELSE", "else", "keyword"},
    {"WHILE", "while", "keyword"},
    {"FOR", "for", "keyword"},
    {"RETURN", "return", "keyword"},
    {"BREAK", "break", "keyword"},
    {"CONTINUE", "continue", "keyword"},
    {"TRUE", "true", "literal"},
    {"FALSE", "false", "literal"},
    {"IDENT", "<identifier>", "identifier"},
    {"INT_LIT", "<int>", "literal"},
    {"FLOAT_LIT", "<float>", "literal"},
    {"CHAR_LIT", "<char>", "literal"},
    {"PLUS", "+", "operator"},
    {"MINUS", "-", "operator"},
    {"STAR", "*", "operator"},
    {"SLASH", "/", "operator"},
    {"PERCENT", "%", "operator"},
    {"ASSIGN", "=", "operator"},
    {"EQ", "==", "operator"},
    {"NE", "!=", "operator"},
    {"LT", "<", "operator"},
    {"LE", "<=", "operator"},
    {"GT", ">", "operator"},
    {"GE", ">=", "operator"},
    {"AND", "&&", "operator"},
    {"OR", "||", "operator"},
    {"NOT", "!", "operator"},
    {"LPAREN", "(", "punctuation"},
    {"RPAREN", ")", "punctuation"},
    {"LBRACE", "{", "punctuation"},
    {"RBRACE", "}", "punctuation"},
    {"LBRACKET", "[", "punctuation"},
    {"RBRACKET", "]", "punctuation"},
    {"SEMI", ";", "punctuation"},
    {"COMMA", ",", "punctuation"},
    {"EOF", "<end of input>", "eof"},
    {"ERROR", "<lexical error>", "error"},
    {"UNSUPPORTED", "<unsupported>", "unsupported"},
};
static_assert(sizeof(kInfo) / sizeof(kInfo[0]) == kTokenKindCount,
              "token table out of sync with TokenKind");
}  // namespace

const char* token_kind_name(TokenKind k) { return kInfo[static_cast<int>(k)].name; }
const char* token_kind_spelling(TokenKind k) { return kInfo[static_cast<int>(k)].spelling; }
const char* token_category(TokenKind k) { return kInfo[static_cast<int>(k)].category; }

bool token_kind_from_name(const std::string& name, TokenKind* out) {
  for (int i = 0; i < kTokenKindCount; ++i) {
    if (name == kInfo[i].name) {
      *out = static_cast<TokenKind>(i);
      return true;
    }
  }
  return false;
}

bool is_placeholder_kind(TokenKind k) {
  return k == TokenKind::Ident || k == TokenKind::IntLit || k == TokenKind::FloatLit ||
         k == TokenKind::CharLit;
}

bool is_content_kind(TokenKind k) {
  if (is_placeholder_kind(k)) return true;
  const int i = static_cast<int>(k);
  return i <= static_cast<int>(TokenKind::KwFalse);  // all keywords
}

std::string synthetic_lexeme(TokenKind k) {
  switch (k) {
    case TokenKind::Ident: return "__hole";
    case TokenKind::IntLit: return "0";
    case TokenKind::FloatLit: return "0.0";
    case TokenKind::CharLit: return "'?'";
    default: return token_kind_spelling(k);
  }
}

}  // namespace parallax
