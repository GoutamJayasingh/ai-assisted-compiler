%option noyywrap nounput noinput

%{
#include "parser.hpp"
#include "lexer_buffer.hpp"

#include <cerrno>
#include <cstdlib>
#include <string>

static yy::location loc;
static std::vector<compiler::TokenInfo>* token_collector = nullptr;

namespace compiler {
void setTokenCollector(std::vector<TokenInfo>* collector) {
    token_collector = collector;
}

void resetLexerLocation() {
    loc.initialize();
}
}

static void recordToken(const char* type) {
    if (token_collector == nullptr) {
        return;
    }

    token_collector->push_back({
        type,
        std::string(yytext, yyleng),
        loc.begin.line,
        loc.begin.column
    });
}

#define YY_DECL yy::parser::symbol_type yylex()

/* Track the source position of each matched token. */
#define YY_USER_ACTION \
    loc.step();        \
    loc.columns(yyleng);
%}

DIGIT       [0-9]
LETTER      [a-zA-Z_]
IDENTIFIER  {LETTER}({LETTER}|{DIGIT})*
INTEGER     {DIGIT}+

%%

"int" {
    recordToken("INT");
    return yy::parser::make_INT(loc);
}

"print" {
    recordToken("PRINT");
    return yy::parser::make_PRINT(loc);
}

{IDENTIFIER} {
    recordToken("IDENTIFIER");
    return yy::parser::make_IDENTIFIER(
        std::string(yytext, yyleng), loc
    );
}

{INTEGER} {
    errno = 0;
    char* end = nullptr;
    long value = std::strtol(yytext, &end, 10);

    if (errno == ERANGE || end != yytext + yyleng) {
        recordToken("INVALID");
        return yy::parser::make_INVALID(loc);
    }

    recordToken("NUMBER");
    return yy::parser::make_NUMBER(value, loc);
}

"+" {
    recordToken("PLUS");
    return yy::parser::make_PLUS(loc);
}

"-" {
    recordToken("MINUS");
    return yy::parser::make_MINUS(loc);
}

"*" {
    recordToken("STAR");
    return yy::parser::make_STAR(loc);
}

"/" {
    recordToken("SLASH");
    return yy::parser::make_SLASH(loc);
}

"=" {
    recordToken("ASSIGN");
    return yy::parser::make_ASSIGN(loc);
}

"(" {
    recordToken("LPAREN");
    return yy::parser::make_LPAREN(loc);
}

")" {
    recordToken("RPAREN");
    return yy::parser::make_RPAREN(loc);
}

";" {
    recordToken("SEMICOLON");
    return yy::parser::make_SEMICOLON(loc);
}

[ \t\r]+ {
    /* Ignore whitespace. */
}

\n {
    loc.lines(yyleng);
    loc.step();
}

. {
    recordToken("INVALID");
    return yy::parser::make_INVALID(loc);
}

<<EOF>> {
    return yy::parser::make_YYEOF(loc);
}

%%
