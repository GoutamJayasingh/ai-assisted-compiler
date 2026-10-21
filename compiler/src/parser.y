%skeleton "lalr1.cc"
%require "3.8"
%defines
%define api.namespace {yy}
%define api.parser.class {parser}
%define api.value.type variant
%define api.token.constructor
%define parse.error detailed
%define parse.lac full
%locations

%code requires {
    #include "ast.hpp"
    #include "semantic.hpp"
    #include "lexer_buffer.hpp"
    #include <memory>
    #include <string>
    #include <vector>
}

%code {
    static compiler::SourceLocation toSourceLocation(
        const yy::location& loc
    ) {
        return {
            static_cast<int>(loc.begin.line),
            static_cast<int>(loc.begin.column)
        };
    }
    yy::parser::symbol_type yylex();
}

%parse-param { compiler::Program& program }
%parse-param { std::vector<compiler::Diagnostic>& diagnostics }
%parse-param { std::vector<compiler::TraceEvent>& trace }

%token INT "int"
%token PRINT "print"
%token <std::string> IDENTIFIER "identifier"
%token <long> NUMBER "integer"
%token PLUS "+"
%token MINUS "-"
%token STAR "*"
%token SLASH "/"
%token ASSIGN "="
%token LPAREN "("
%token RPAREN ")"
%token SEMICOLON ";"
%token INVALID "invalid token"

%type <compiler::ExprPtr> expression term factor
%type <compiler::StmtPtr> statement declaration assignment print_statement

%left PLUS MINUS
%left STAR SLASH

%start input

%%

input:
      %empty
    | input statement {
          if ($2) program.statements.push_back(std::move($2));
      }
    | input error SEMICOLON {
          trace.push_back({"input -> input error SEMICOLON",
              static_cast<int>(@2.begin.line),
              static_cast<int>(@2.begin.column),
              "Recovered from syntax error at statement boundary"});
          yyerrok;
      }
    ;

statement:
      declaration {
          trace.push_back({"declaration -> INT IDENTIFIER ASSIGN expression SEMICOLON",
    static_cast<int>(@1.begin.line),
    static_cast<int>(@1.begin.column),
    "Declaration reduced"});
          $$ = std::move($1);
      }
    | assignment {
          trace.push_back({"assignment -> IDENTIFIER ASSIGN expression SEMICOLON",
    static_cast<int>(@1.begin.line),
    static_cast<int>(@1.begin.column),
    "Assignment reduced"});
          $$ = std::move($1);
      }
    | print_statement {
          trace.push_back({"print_statement -> PRINT LPAREN expression RPAREN SEMICOLON",
    static_cast<int>(@1.begin.line),
    static_cast<int>(@1.begin.column),
    "Print statement reduced"});
          $$ = std::move($1);
      }
    ;

declaration:
      INT IDENTIFIER ASSIGN expression SEMICOLON {
          $$ = std::make_unique<compiler::DeclarationStmt>(
              std::move($2), std::move($4), toSourceLocation(@1));
      }
    ;

assignment:
      IDENTIFIER ASSIGN expression SEMICOLON {
          $$ = std::make_unique<compiler::AssignmentStmt>(
              std::move($1), std::move($3), toSourceLocation(@1));
      }
    ;

print_statement:
      PRINT LPAREN expression RPAREN SEMICOLON {
          $$ = std::make_unique<compiler::PrintStmt>(
              std::move($3), toSourceLocation(@1));
      }
    ;

expression:
      expression PLUS term {
          trace.push_back({"expression -> expression PLUS term",
              static_cast<int>(@2.begin.line),
              static_cast<int>(@2.begin.column),
              "Addition expression reduced"});
          $$ = std::make_unique<compiler::BinaryExpr>(
              '+', std::move($1), std::move($3), toSourceLocation(@2));
      }
    | expression MINUS term {
          trace.push_back({"expression -> expression MINUS term",
              static_cast<int>(@2.begin.line),
              static_cast<int>(@2.begin.column),
              "Subtraction expression reduced"});
          $$ = std::make_unique<compiler::BinaryExpr>(
              '-', std::move($1), std::move($3), toSourceLocation(@2));
      }
    | term { $$ = std::move($1); }
    ;

term:
      term STAR factor {
          trace.push_back({"term -> term STAR factor",
              static_cast<int>(@2.begin.line),
              static_cast<int>(@2.begin.column),
              "Multiplication term reduced"});
          $$ = std::make_unique<compiler::BinaryExpr>(
              '*', std::move($1), std::move($3), toSourceLocation(@2));
      }
    | term SLASH factor {
          trace.push_back({"term -> term SLASH factor",
              static_cast<int>(@2.begin.line),
              static_cast<int>(@2.begin.column),
              "Division term reduced"});
          $$ = std::make_unique<compiler::BinaryExpr>(
              '/', std::move($1), std::move($3), toSourceLocation(@2));
      }
    | factor { $$ = std::move($1); }
    ;

factor:
      NUMBER {
          trace.push_back({"factor -> NUMBER",
              static_cast<int>(@1.begin.line),
              static_cast<int>(@1.begin.column),
              "Integer literal recognized"});
          $$ = std::make_unique<compiler::NumberExpr>(
              $1, toSourceLocation(@1));
      }
    | IDENTIFIER {
          trace.push_back({"factor -> IDENTIFIER",
              static_cast<int>(@1.begin.line),
              static_cast<int>(@1.begin.column),
              "Identifier expression recognized"});
          $$ = std::make_unique<compiler::IdentifierExpr>(
              std::move($1), toSourceLocation(@1));
      }
    | LPAREN expression RPAREN {
          trace.push_back({"factor -> LPAREN expression RPAREN",
              static_cast<int>(@1.begin.line),
              static_cast<int>(@1.begin.column),
              "Parenthesized expression recognized"});
          $$ = std::move($2);
      }
    ;

%%

void yy::parser::error(
    const location_type& loc,
    const std::string& message
) {
    diagnostics.push_back({
        "syntax",
        static_cast<int>(loc.begin.line),
        static_cast<int>(loc.begin.column),
        message
    });
}
