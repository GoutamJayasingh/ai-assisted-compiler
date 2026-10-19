
%option noyywrap nounput noinput

%{
#include "parser.hpp"

#include <cerrno>
#include <cstdlib>
#include <string>

static yy::location loc;

#define YY_DECL yy::parser::symbol_type yylex()

/* Begin each token at the previous token's end,
   then advance the end position by the matched text. */
#define YY_USER_ACTION \
    loc.step();        \
    loc.columns(yyleng);
%}

DIGIT       [0-9]
LETTER      [a-zA-Z_]
IDENTIFIER  {LETTER}({LETTER}|{DIGIT})*
INTEGER     {DIGIT}+

%%

"int"           { return yy::parser::make_INT(loc); }
"print"         { return yy::parser::make_PRINT(loc); }

{IDENTIFIER}    {
                    return yy::parser::make_IDENTIFIER(
                        std::string(yytext, yyleng), loc
                    );
                }

{INTEGER}       {
                    errno = 0;
                    char* end = nullptr;
                    long value = std::strtol(yytext, &end, 10);

                    if (errno == ERANGE || end != yytext + yyleng) {
                        return yy::parser::make_INVALID(loc);
                    }

                    return yy::parser::make_NUMBER(value, loc);
                }

"+"             { return yy::parser::make_PLUS(loc); }
"-"             { return yy::parser::make_MINUS(loc); }
"*"             { return yy::parser::make_STAR(loc); }
"/"             { return yy::parser::make_SLASH(loc); }
"="             { return yy::parser::make_ASSIGN(loc); }

"("             { return yy::parser::make_LPAREN(loc); }
")"             { return yy::parser::make_RPAREN(loc); }
";"             { return yy::parser::make_SEMICOLON(loc); }

[ \t\r]+        { /* Ignore whitespace; location already advanced. */ }

\n              {
                    loc.lines(yyleng);
                    loc.step();
                }

.               { return yy::parser::make_INVALID(loc); }

<<EOF>>         { return yy::parser::make_YYEOF(loc); }

%%
