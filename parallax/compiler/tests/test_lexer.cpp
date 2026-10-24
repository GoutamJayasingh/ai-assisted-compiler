#include <string>

#include "parallax/lexer.hpp"
#include "test_framework.hpp"

using namespace parallax;

namespace {
std::string kinds(const LexResult& r) {
  std::string s;
  for (const Token& t : r.tokens) {
    if (!s.empty()) s += ' ';
    s += token_kind_name(t.kind);
  }
  return s;
}
}  // namespace

TEST(lexer_empty_input) {
  LexResult r = lex("");
  CHECK_EQ(r.tokens.size(), 0u);
  CHECK_EQ(r.eof.offset, 0);
  CHECK_EQ(r.eof.line, 1);
  CHECK_EQ(r.eof.column, 1);
}

TEST(lexer_keyword_identifier_boundary) {
  LexResult r = lex("int intx if_ iff while1 return");
  CHECK_EQ(kinds(r), std::string("INT IDENT IDENT IDENT IDENT RETURN"));
}

TEST(lexer_multi_char_operator_longest_match) {
  LexResult r = lex("= == ! != < <= > >= && || a<=b c==d");
  CHECK_EQ(kinds(r), std::string("ASSIGN EQ NOT NE LT LE GT GE AND OR IDENT LE IDENT IDENT EQ IDENT"));
}

TEST(lexer_minus_is_an_operator_not_part_of_number) {
  LexResult r = lex("x=-1");
  CHECK_EQ(kinds(r), std::string("IDENT ASSIGN MINUS INT_LIT"));
  CHECK_EQ(r.tokens[3].lexeme, std::string("1"));
}

TEST(lexer_positions_lines_columns_tabs) {
  LexResult r = lex("a\n\tbb  c");
  CHECK_EQ(r.tokens[1].start.line, 2);
  CHECK_EQ(r.tokens[1].start.column, 2);  // tab counts as one column
  CHECK_EQ(r.tokens[1].start.offset, 3);
  CHECK_EQ(r.tokens[1].end.offset, 5);
  CHECK_EQ(r.tokens[2].start.column, 6);
}

TEST(lexer_crlf_line_endings) {
  LexResult r = lex("a\r\nb\r\n");
  CHECK_EQ(r.tokens.size(), 2u);
  CHECK_EQ(r.tokens[1].start.line, 2);
  CHECK_EQ(r.tokens[1].start.column, 1);
  CHECK_EQ(r.tokens[1].start.offset, 3);
  CHECK_EQ(r.eof.line, 3);
}

TEST(lexer_lf_and_crlf_agree_on_lines) {
  LexResult a = lex("int x;\nint y;\n");
  LexResult b = lex("int x;\r\nint y;\r\n");
  CHECK_EQ(a.tokens.size(), b.tokens.size());
  for (size_t i = 0; i < a.tokens.size(); ++i) {
    CHECK_EQ(a.tokens[i].start.line, b.tokens[i].start.line);
    CHECK_EQ(a.tokens[i].start.column, b.tokens[i].start.column);
  }
}

TEST(lexer_block_comment_with_newlines) {
  LexResult r = lex("/* x\n y */ z");
  CHECK_EQ(r.tokens.size(), 1u);
  CHECK_EQ(r.tokens[0].start.line, 2);
  CHECK_EQ(r.tokens[0].start.column, 7);
  CHECK_EQ(r.comments.size(), 1u);
  CHECK(r.comments[0].block);
  CHECK_EQ(r.comments[0].end.offset, 10);
}

TEST(lexer_unterminated_block_comment) {
  LexResult r = lex("int x; /* never closed\n more");
  CHECK_EQ(r.tokens.back().kind, TokenKind::Error);
  CHECK(r.tokens.back().message.find("unterminated block comment") != std::string::npos);
  CHECK_EQ(r.tokens.back().start.offset, 7);
  CHECK_EQ(r.tokens.back().end.offset, 28);
  CHECK_EQ(r.error_count, 1);
}

TEST(lexer_no_final_newline) {
  LexResult r = lex("x");
  CHECK_EQ(r.tokens[0].end.offset, 1);
  CHECK_EQ(r.eof.column, 2);
}

TEST(lexer_unicode_in_comments_counts_code_points) {
  LexResult r = lex("/* \xC3\xA9 */ x");
  CHECK_EQ(r.tokens.size(), 1u);
  CHECK_EQ(r.tokens[0].start.column, 9);
  CHECK_EQ(r.tokens[0].start.offset, 9);  // é is two bytes
  LexResult l = lex("// h\xC3\xA9llo\nx");
  CHECK_EQ(l.tokens[0].start.line, 2);
}

TEST(lexer_invalid_characters) {
  LexResult r = lex("a @ b $");
  CHECK_EQ(kinds(r), std::string("IDENT ERROR IDENT ERROR"));
  CHECK(r.tokens[1].message.find("invalid character '@'") != std::string::npos);
  LexResult u = lex("x \xC3\xA9 y");
  CHECK_EQ(kinds(u), std::string("IDENT ERROR IDENT"));  // one token for the whole code point
  CHECK_EQ(u.tokens[1].lexeme.size(), 2u);
  LexResult c = lex(std::string("a\x01" "b"));
  CHECK_EQ(c.tokens[1].kind, TokenKind::Error);
}

TEST(lexer_long_identifiers) {
  std::string ok(255, 'a'), bad(256, 'b');
  CHECK_EQ(lex(ok).tokens[0].kind, TokenKind::Ident);
  LexResult r = lex(bad);
  CHECK_EQ(r.tokens.size(), 1u);
  CHECK_EQ(r.tokens[0].kind, TokenKind::Error);
}

TEST(lexer_numeric_literals) {
  CHECK_EQ(kinds(lex("0 42 2147483647")), std::string("INT_LIT INT_LIT INT_LIT"));
  CHECK_EQ(kinds(lex("1.5 1.5e3 1e5 2.0E-2 1e+5")), std::string("FLOAT_LIT FLOAT_LIT FLOAT_LIT FLOAT_LIT FLOAT_LIT"));
  LexResult big = lex("2147483648");
  CHECK_EQ(big.tokens[0].kind, TokenKind::Error);
  CHECK(big.tokens[0].message.find("out of range") != std::string::npos);
}

TEST(lexer_malformed_numbers) {
  auto msg = [](const char* s) {
    LexResult r = lex(s);
    CHECK_EQ(r.tokens.size(), 1u);
    CHECK_EQ(r.tokens[0].kind, TokenKind::Error);
    return r.tokens[0].message;
  };
  CHECK(msg("12abc").find("followed by letters") != std::string::npos);
  CHECK(msg("1.2.3").find("more than one decimal point") != std::string::npos);
  CHECK(msg("1.").find("missing digits after the decimal point") != std::string::npos);
  CHECK(msg("1e").find("malformed exponent") != std::string::npos);
  CHECK(msg("1.5e+").find("malformed exponent") != std::string::npos);
  CHECK(msg(".5").find("digit before the decimal point") != std::string::npos);
  // malformed exponent followed by a sign must not swallow the operator
  LexResult r = lex("1e+");
  CHECK_EQ(r.tokens.size(), 1u);
}

TEST(lexer_char_literals) {
  CHECK_EQ(kinds(lex("'a' '\\n' '\\'' '\\\\' '\\0'")), std::string("CHAR_LIT CHAR_LIT CHAR_LIT CHAR_LIT CHAR_LIT"));
  auto msg = [](const char* s) {
    LexResult r = lex(s);
    CHECK_EQ(r.tokens[0].kind, TokenKind::Error);
    return r.tokens[0].message;
  };
  CHECK(msg("'\\q'").find("invalid escape") != std::string::npos);
  CHECK(msg("''").find("empty character literal") != std::string::npos);
  CHECK(msg("'ab'").find("multi-character") != std::string::npos);
  CHECK(msg("'a").find("unterminated character literal") != std::string::npos);
  CHECK(msg("'\xC3\xA9'").find("ASCII") != std::string::npos);
  // unterminated literal stops at end of line
  LexResult r = lex("'a\nx");
  CHECK_EQ(kinds(r), std::string("ERROR IDENT"));
}

TEST(lexer_unsupported_constructs) {
  LexResult r = lex("i++; x += 1; #include <x>\nstruct s; \"str\" a.b p->q");
  CHECK_EQ(kinds(r), std::string("IDENT UNSUPPORTED SEMI IDENT UNSUPPORTED INT_LIT SEMI UNSUPPORTED "
                                 "UNSUPPORTED IDENT SEMI UNSUPPORTED IDENT UNSUPPORTED IDENT IDENT UNSUPPORTED IDENT"));
  CHECK_EQ(r.unsupported_count, 7);
}

TEST(lexer_literal_spelling_preserved) {
  LexResult r = lex("x = 007;");
  CHECK_EQ(r.tokens[2].lexeme, std::string("007"));
}

TEST(lexer_deterministic) {
  std::string src = "int main() { /* c */ return 1 + 2; }\n";
  LexResult a = lex(src), b = lex(src);
  CHECK_EQ(a.tokens.size(), b.tokens.size());
  for (size_t i = 0; i < a.tokens.size(); ++i) {
    CHECK_EQ(a.tokens[i].lexeme, b.tokens[i].lexeme);
    CHECK_EQ(a.tokens[i].start.offset, b.tokens[i].start.offset);
  }
}

TEST(lexer_token_origins_are_indices) {
  LexResult r = lex("a b c");
  for (size_t i = 0; i < r.tokens.size(); ++i) CHECK_EQ(r.tokens[i].origin, static_cast<int>(i));
}
