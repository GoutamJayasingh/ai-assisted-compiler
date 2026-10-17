%option noyywrap nounput noinput

%{
#include <iostream>
#include <string>

/*
 * Lexer for our small C-like language.
 * Parser token constructors will be connected after
 * confirming the shared Bison C++ interface.
 */

static int current_line = 1;
static int current_column = 1;
%}

DIGIT       [0-9]
LETTER      [a-zA-Z_]
IDENTIFIER  {LETTER}({LETTER}|{DIGIT})*
INTEGER     {DIGIT}+

%%

"int"           { std::cout << "KEYWORD: int\n"; }
"print"         { std::cout << "KEYWORD: print\n"; }

{IDENTIFIER}    {
                    std::cout << "IDENTIFIER: " << yytext << '\n';
                }

{INTEGER}       {
                    std::cout << "NUMBER: " << yytext << '\n';
                }

"+"             { std::cout << "PLUS: +\n"; }
"-"             { std::cout << "MINUS: -\n"; }
"*"             { std::cout << "MULTIPLY: *\n"; }
"/"             { std::cout << "DIVIDE: /\n"; }
"="             { std::cout << "ASSIGN: =\n"; }

"("             { std::cout << "LPAREN: (\n"; }
")"             { std::cout << "RPAREN: )\n"; }
";"             { std::cout << "SEMICOLON: ;\n"; }

[ \t\r]+        {
                    current_column += yyleng;
                }

\n              {
                    ++current_line;
                    current_column = 1;
                }

.               {
                    std::cerr
                        << "Lexical error at line " << current_line
                        << ", column " << current_column
                        << ": invalid character '" << yytext[0]
                        << "'\n";

                    ++current_column;
                }

%%

int main() {
    yylex();
    return 0;
}
