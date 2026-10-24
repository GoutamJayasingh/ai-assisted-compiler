/*
 * MiniC grammar (GNU Bison >= 3.6, yacc.c skeleton compiled as C++).
 *
 *  - Pure (re-entrant) parser: all state lives in parallax::ParseCtx.
 *  - parse.lac full: the expected-token set reported at an error is exact
 *    (no default-reduction inaccuracy), which the repair engine relies on.
 *  - parse.error custom: we capture structured diagnostics instead of text.
 *  - Expression precedence is encoded by grammar levels (no %prec tricks).
 *    The only precedence declaration resolves the dangling-else conflict;
 *    %expect 0 makes any other conflict a build failure.
 *  - `error` productions implement classic panic-mode recovery (baseline B).
 *
 * See docs/GRAMMAR_AND_PARSER.md.
 */

%code requires {
#include <string>
#include <vector>
#include "parallax/ast.hpp"
#include "parallax/parser.hpp"

namespace parallax { struct ParseCtx; }

/* A location is a half-open range of token indices [b, e). */
struct PxLoc { int b; int e; };
}

%code top {
#include <cstdarg>
#include <cstdio>
#include <string>
#include <vector>
/* Route Bison's debug trace into the current parse context. */
static void px_trace_printf(FILE*, const char* fmt, ...);
#define YYFPRINTF px_trace_printf
#define YYMAXDEPTH 5000
}

%define api.pure full
%define api.location.type {PxLoc}
%define parse.error custom
%define parse.lac full
%define parse.trace
%locations
%param {parallax::ParseCtx* ctx}
%expect 0

%union {
  parallax::Node* node;
  int kind;  /* parallax::TokenKind of a type keyword */
}

%code provides {
namespace parallax {
struct ParseCtx {
  const std::vector<Token>* toks = nullptr;
  int n = 0;
  int next = 0;
  int probe = -1;           /* expected_at(): inject an invalid token here */
  bool stop_at_first = false;
  bool halted = false;
  bool build_ast = true;
  ParseResult* result = nullptr;
  AstArena* arena = nullptr;
  Node* root = nullptr;
  /* tracing */
  bool tracing = false;
  int trace_limit = 0;
  std::string trace_line;
};
}
}

%code {
using parallax::Node;
using parallax::NodeKind;
using parallax::TokenKind;

static int yylex(YYSTYPE* lval, PxLoc* lloc, parallax::ParseCtx* ctx);
static void yyerror(PxLoc* loc, parallax::ParseCtx* ctx, const char* msg);

#define YYLLOC_DEFAULT(Cur, Rhs, N)                         \
  do {                                                      \
    if (N) { (Cur).b = YYRHSLOC(Rhs, 1).b; (Cur).e = YYRHSLOC(Rhs, N).e; } \
    else   { (Cur).b = (Cur).e = YYRHSLOC(Rhs, 0).e; }      \
  } while (0)
#define YYLOCATION_PRINT(File, Loc) YYFPRINTF(File, "tok %d-%d", (Loc)->b, (Loc)->e)

static Node* mk(parallax::ParseCtx* ctx, NodeKind k, const PxLoc& loc) {
  Node* n = ctx->arena->make(k);
  n->tok_begin = loc.b;
  n->tok_end = loc.e;
  return n;
}
static const std::string& lexeme(parallax::ParseCtx* ctx, const PxLoc& loc) {
  return (*ctx->toks)[loc.b].lexeme;
}
static Node* leaf(parallax::ParseCtx* ctx, NodeKind k, const PxLoc& loc) {
  Node* n = mk(ctx, k, loc);
  if (k == NodeKind::Ident) n->name = lexeme(ctx, loc);
  else n->value = lexeme(ctx, loc);
  return n;
}
static Node* binary(parallax::ParseCtx* ctx, const char* op, Node* l, Node* r, const PxLoc& loc) {
  Node* n = mk(ctx, NodeKind::Binary, loc);
  n->op = op;
  n->children = {l, r};
  return n;
}
static Node* unary(parallax::ParseCtx* ctx, const char* op, Node* e, const PxLoc& loc) {
  Node* n = mk(ctx, NodeKind::Unary, loc);
  n->op = op;
  n->children = {e};
  return n;
}
static const char* type_name(int k) {
  return parallax::token_kind_spelling(static_cast<TokenKind>(k));
}
}

/* Token names deliberately mirror parallax::TokenKind (see token.cpp). */
%token T_INT "int" T_FLOAT "float" T_CHAR "char" T_BOOL "bool" T_VOID "void"
%token T_IF "if" T_ELSE "else" T_WHILE "while" T_FOR "for" T_RETURN "return"
%token T_BREAK "break" T_CONTINUE "continue" T_TRUE "true" T_FALSE "false"
%token T_IDENT "identifier" T_INT_LIT "integer literal" T_FLOAT_LIT "float literal"
%token T_CHAR_LIT "character literal"
%token T_PLUS "+" T_MINUS "-" T_STAR "*" T_SLASH "/" T_PERCENT "%" T_ASSIGN "="
%token T_EQ "==" T_NE "!=" T_LT "<" T_LE "<=" T_GT ">" T_GE ">=" T_AND "&&" T_OR "||"
%token T_NOT "!"
%token T_LPAREN "(" T_RPAREN ")" T_LBRACE "{" T_RBRACE "}" T_LBRACKET "[" T_RBRACKET "]"
%token T_SEMI ";" T_COMMA ","
%token T_BAD "invalid token"   /* lexical errors / unsupported constructs: never shiftable */

%precedence LOWER_THAN_ELSE
%precedence T_ELSE

%type <node> program ext_list ext_decl function param_opt param_list param block
%type <node> stmt_list stmt decl_stmt decl_core declarator_list declarator
%type <node> assignment lvalue if_stmt while_stmt for_stmt for_init for_cond for_update
%type <node> return_stmt expr or_expr and_expr eq_expr rel_expr add_expr mul_expr
%type <node> unary postfix primary args_opt arg_list
%type <kind> var_type

%start program

%%

program
  : ext_list                    { ctx->root = $1; $$ = $1; }
  ;

ext_list
  : %empty                      { $$ = mk(ctx, NodeKind::Program, @$); }
  | ext_list ext_decl           { $1->children.push_back($2); $1->tok_end = @2.e; $$ = $1; }
  ;

ext_decl
  : function                    { $$ = $1; }
  | decl_stmt                   { $$ = $1; }
  | error T_SEMI                { $$ = mk(ctx, NodeKind::Error, @$); yyerrok; }
  | error T_RBRACE              { $$ = mk(ctx, NodeKind::Error, @$); yyerrok; }
  ;

var_type
  : T_INT                       { $$ = static_cast<int>(TokenKind::KwInt); }
  | T_FLOAT                     { $$ = static_cast<int>(TokenKind::KwFloat); }
  | T_CHAR                      { $$ = static_cast<int>(TokenKind::KwChar); }
  | T_BOOL                      { $$ = static_cast<int>(TokenKind::KwBool); }
  ;

function
  : var_type T_IDENT T_LPAREN param_opt T_RPAREN block
      {
        $$ = mk(ctx, NodeKind::Function, @$);
        $$->type = type_name($1);
        $$->name = lexeme(ctx, @2);
        $$->children = $4->children;
        $$->children.push_back($6);
      }
  | T_VOID T_IDENT T_LPAREN param_opt T_RPAREN block
      {
        $$ = mk(ctx, NodeKind::Function, @$);
        $$->type = "void";
        $$->name = lexeme(ctx, @2);
        $$->children = $4->children;
        $$->children.push_back($6);
      }
  ;

/* A temporary Empty node is used as a list container for parameters. */
param_opt
  : %empty                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | T_VOID                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | param_list                  { $$ = $1; }
  ;

param_list
  : param                       { $$ = mk(ctx, NodeKind::Empty, @$); $$->children.push_back($1); }
  | param_list T_COMMA param    { $1->children.push_back($3); $$ = $1; }
  ;

param
  : var_type T_IDENT            { $$ = mk(ctx, NodeKind::Param, @$); $$->type = type_name($1); $$->name = lexeme(ctx, @2); }
  | var_type T_IDENT T_LBRACKET T_RBRACKET
                                { $$ = mk(ctx, NodeKind::Param, @$); $$->type = type_name($1); $$->name = lexeme(ctx, @2); $$->array = "[]"; }
  ;

block
  : T_LBRACE stmt_list T_RBRACE { $$ = $2; $$->tok_begin = @$.b; $$->tok_end = @$.e; }
  ;

stmt_list
  : %empty                      { $$ = mk(ctx, NodeKind::Block, @$); }
  | stmt_list stmt              { $1->children.push_back($2); $$ = $1; }
  ;

stmt
  : decl_stmt                   { $$ = $1; }
  | assignment T_SEMI           { $$ = $1; $$->tok_end = @2.e; }
  | expr T_SEMI                 { $$ = mk(ctx, NodeKind::ExprStmt, @$); $$->children.push_back($1); }
  | if_stmt                     { $$ = $1; }
  | while_stmt                  { $$ = $1; }
  | for_stmt                    { $$ = $1; }
  | return_stmt                 { $$ = $1; }
  | T_BREAK T_SEMI              { $$ = mk(ctx, NodeKind::Break, @$); }
  | T_CONTINUE T_SEMI           { $$ = mk(ctx, NodeKind::Continue, @$); }
  | block                       { $$ = $1; }
  | T_SEMI                      { $$ = mk(ctx, NodeKind::EmptyStmt, @$); }
  | error T_SEMI                { $$ = mk(ctx, NodeKind::Error, @$); yyerrok; }
  ;

decl_stmt
  : decl_core T_SEMI            { $$ = $1; $$->tok_end = @2.e; }
  ;

decl_core
  : var_type declarator_list    { $$ = $2; $$->type = type_name($1); $$->tok_begin = @$.b; $$->tok_end = @$.e; }
  ;

declarator_list
  : declarator                  { $$ = mk(ctx, NodeKind::DeclStmt, @$); $$->children.push_back($1); }
  | declarator_list T_COMMA declarator
                                { $1->children.push_back($3); $$ = $1; }
  ;

declarator
  : T_IDENT                     { $$ = mk(ctx, NodeKind::VarDecl, @$); $$->name = lexeme(ctx, @1); }
  | T_IDENT T_ASSIGN expr       { $$ = mk(ctx, NodeKind::VarDecl, @$); $$->name = lexeme(ctx, @1); $$->children.push_back($3); }
  | T_IDENT T_LBRACKET T_INT_LIT T_RBRACKET
                                { $$ = mk(ctx, NodeKind::VarDecl, @$); $$->name = lexeme(ctx, @1); $$->array = lexeme(ctx, @3); }
  ;

assignment
  : lvalue T_ASSIGN expr        { $$ = mk(ctx, NodeKind::Assign, @$); $$->children = {$1, $3}; }
  ;

lvalue
  : T_IDENT                     { $$ = leaf(ctx, NodeKind::Ident, @1); }
  | T_IDENT T_LBRACKET expr T_RBRACKET
                                { $$ = mk(ctx, NodeKind::Index, @$); $$->name = lexeme(ctx, @1); $$->children.push_back($3); }
  ;

if_stmt
  : T_IF T_LPAREN expr T_RPAREN stmt %prec LOWER_THAN_ELSE
                                { $$ = mk(ctx, NodeKind::If, @$); $$->children = {$3, $5}; }
  | T_IF T_LPAREN expr T_RPAREN stmt T_ELSE stmt
                                { $$ = mk(ctx, NodeKind::If, @$); $$->children = {$3, $5, $7}; }
  ;

while_stmt
  : T_WHILE T_LPAREN expr T_RPAREN stmt
                                { $$ = mk(ctx, NodeKind::While, @$); $$->children = {$3, $5}; }
  ;

for_stmt
  : T_FOR T_LPAREN for_init T_SEMI for_cond T_SEMI for_update T_RPAREN stmt
                                { $$ = mk(ctx, NodeKind::For, @$); $$->children = {$3, $5, $7, $9}; }
  ;

for_init
  : %empty                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | assignment                  { $$ = $1; }
  | decl_core                   { $$ = $1; }
  ;

for_cond
  : %empty                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | expr                        { $$ = $1; }
  ;

for_update
  : %empty                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | assignment                  { $$ = $1; }
  | expr                        { $$ = $1; }
  ;

return_stmt
  : T_RETURN T_SEMI             { $$ = mk(ctx, NodeKind::Return, @$); }
  | T_RETURN expr T_SEMI        { $$ = mk(ctx, NodeKind::Return, @$); $$->children.push_back($2); }
  ;

expr
  : or_expr                     { $$ = $1; }
  ;

or_expr
  : and_expr                    { $$ = $1; }
  | or_expr T_OR and_expr       { $$ = binary(ctx, "||", $1, $3, @$); }
  ;

and_expr
  : eq_expr                     { $$ = $1; }
  | and_expr T_AND eq_expr      { $$ = binary(ctx, "&&", $1, $3, @$); }
  ;

eq_expr
  : rel_expr                    { $$ = $1; }
  | eq_expr T_EQ rel_expr       { $$ = binary(ctx, "==", $1, $3, @$); }
  | eq_expr T_NE rel_expr       { $$ = binary(ctx, "!=", $1, $3, @$); }
  ;

rel_expr
  : add_expr                    { $$ = $1; }
  | rel_expr T_LT add_expr      { $$ = binary(ctx, "<", $1, $3, @$); }
  | rel_expr T_LE add_expr      { $$ = binary(ctx, "<=", $1, $3, @$); }
  | rel_expr T_GT add_expr      { $$ = binary(ctx, ">", $1, $3, @$); }
  | rel_expr T_GE add_expr      { $$ = binary(ctx, ">=", $1, $3, @$); }
  ;

add_expr
  : mul_expr                    { $$ = $1; }
  | add_expr T_PLUS mul_expr    { $$ = binary(ctx, "+", $1, $3, @$); }
  | add_expr T_MINUS mul_expr   { $$ = binary(ctx, "-", $1, $3, @$); }
  ;

mul_expr
  : unary                       { $$ = $1; }
  | mul_expr T_STAR unary       { $$ = binary(ctx, "*", $1, $3, @$); }
  | mul_expr T_SLASH unary      { $$ = binary(ctx, "/", $1, $3, @$); }
  | mul_expr T_PERCENT unary    { $$ = binary(ctx, "%", $1, $3, @$); }
  ;

unary
  : postfix                     { $$ = $1; }
  | T_MINUS unary               { $$ = unary(ctx, "-", $2, @$); }
  | T_NOT unary                 { $$ = unary(ctx, "!", $2, @$); }
  ;

postfix
  : primary                     { $$ = $1; }
  | T_IDENT T_LPAREN args_opt T_RPAREN
                                { $$ = mk(ctx, NodeKind::Call, @$); $$->name = lexeme(ctx, @1); $$->children = $3->children; }
  | T_IDENT T_LBRACKET expr T_RBRACKET
                                { $$ = mk(ctx, NodeKind::Index, @$); $$->name = lexeme(ctx, @1); $$->children.push_back($3); }
  ;

primary
  : T_IDENT                     { $$ = leaf(ctx, NodeKind::Ident, @1); }
  | T_INT_LIT                   { $$ = leaf(ctx, NodeKind::IntLit, @1); }
  | T_FLOAT_LIT                 { $$ = leaf(ctx, NodeKind::FloatLit, @1); }
  | T_CHAR_LIT                  { $$ = leaf(ctx, NodeKind::CharLit, @1); }
  | T_TRUE                      { $$ = leaf(ctx, NodeKind::BoolLit, @1); }
  | T_FALSE                     { $$ = leaf(ctx, NodeKind::BoolLit, @1); }
  | T_LPAREN expr T_RPAREN      { $$ = $2; }
  ;

args_opt
  : %empty                      { $$ = mk(ctx, NodeKind::Empty, @$); }
  | arg_list                    { $$ = $1; }
  ;

arg_list
  : expr                        { $$ = mk(ctx, NodeKind::Empty, @$); $$->children.push_back($1); }
  | arg_list T_COMMA expr       { $1->children.push_back($3); $$ = $1; }
  ;

%%

/* ---------------------------------------------------------------------- */
/* Driver                                                                  */
/* ---------------------------------------------------------------------- */

namespace {

thread_local parallax::ParseCtx* g_trace_ctx = nullptr;

int to_bison(TokenKind k) {
  switch (k) {
    case TokenKind::KwInt: return T_INT;
    case TokenKind::KwFloat: return T_FLOAT;
    case TokenKind::KwChar: return T_CHAR;
    case TokenKind::KwBool: return T_BOOL;
    case TokenKind::KwVoid: return T_VOID;
    case TokenKind::KwIf: return T_IF;
    case TokenKind::KwElse: return T_ELSE;
    case TokenKind::KwWhile: return T_WHILE;
    case TokenKind::KwFor: return T_FOR;
    case TokenKind::KwReturn: return T_RETURN;
    case TokenKind::KwBreak: return T_BREAK;
    case TokenKind::KwContinue: return T_CONTINUE;
    case TokenKind::KwTrue: return T_TRUE;
    case TokenKind::KwFalse: return T_FALSE;
    case TokenKind::Ident: return T_IDENT;
    case TokenKind::IntLit: return T_INT_LIT;
    case TokenKind::FloatLit: return T_FLOAT_LIT;
    case TokenKind::CharLit: return T_CHAR_LIT;
    case TokenKind::Plus: return T_PLUS;
    case TokenKind::Minus: return T_MINUS;
    case TokenKind::Star: return T_STAR;
    case TokenKind::Slash: return T_SLASH;
    case TokenKind::Percent: return T_PERCENT;
    case TokenKind::Assign: return T_ASSIGN;
    case TokenKind::Eq: return T_EQ;
    case TokenKind::Ne: return T_NE;
    case TokenKind::Lt: return T_LT;
    case TokenKind::Le: return T_LE;
    case TokenKind::Gt: return T_GT;
    case TokenKind::Ge: return T_GE;
    case TokenKind::AndAnd: return T_AND;
    case TokenKind::OrOr: return T_OR;
    case TokenKind::Not: return T_NOT;
    case TokenKind::LParen: return T_LPAREN;
    case TokenKind::RParen: return T_RPAREN;
    case TokenKind::LBrace: return T_LBRACE;
    case TokenKind::RBrace: return T_RBRACE;
    case TokenKind::LBracket: return T_LBRACKET;
    case TokenKind::RBracket: return T_RBRACKET;
    case TokenKind::Semi: return T_SEMI;
    case TokenKind::Comma: return T_COMMA;
    case TokenKind::EndOfFile: return YYEOF;
    case TokenKind::Error:
    case TokenKind::Unsupported:
    case TokenKind::Count_: return T_BAD;
  }
  return T_BAD;
}

bool from_symbol(yysymbol_kind_t s, TokenKind* out) {
  static const std::vector<int> table = [] {
    std::vector<int> t(YYNTOKENS, -1);
    for (int i = 0; i < parallax::kTokenKindCount; ++i) {
      TokenKind k = static_cast<TokenKind>(i);
      int code = to_bison(k);
      if (code == T_BAD) continue;
      yysymbol_kind_t sym = YYTRANSLATE(code);
      if (sym >= 0 && sym < YYNTOKENS) t[sym] = i;
    }
    return t;
  }();
  if (s < 0 || s >= YYNTOKENS || table[s] < 0) return false;
  *out = static_cast<TokenKind>(table[s]);
  return true;
}

}  // namespace

static void px_trace_printf(FILE*, const char* fmt, ...) {
  parallax::ParseCtx* ctx = g_trace_ctx;
  if (!ctx || !ctx->tracing) return;
  char buf[1024];
  va_list ap;
  va_start(ap, fmt);
  std::vsnprintf(buf, sizeof buf, fmt, ap);
  va_end(ap);
  for (const char* p = buf; *p; ++p) {
    if (*p == '\n') {
      if (static_cast<int>(ctx->result->trace.size()) < ctx->trace_limit) {
        if (!ctx->trace_line.empty()) ctx->result->trace.push_back(ctx->trace_line);
      } else {
        ctx->result->trace_truncated = true;
      }
      ctx->trace_line.clear();
    } else {
      ctx->trace_line += *p;
    }
  }
}

static int yylex(YYSTYPE* lval, PxLoc* lloc, parallax::ParseCtx* ctx) {
  lval->node = nullptr;
  int i = ctx->next;
  if (!ctx->halted && i == ctx->probe) {  // expected_at(): force an error exactly here
    ctx->halted = true;
    lloc->b = i;
    lloc->e = i + 1;
    return T_BAD;
  }
  if (ctx->halted || i >= ctx->n) {
    lloc->b = lloc->e = ctx->n;
    return YYEOF;
  }
  lloc->b = i;
  lloc->e = i + 1;
  ctx->next++;
  return to_bison((*ctx->toks)[i].kind);
}

static int yyreport_syntax_error(const yypcontext_t* yyctx, parallax::ParseCtx* ctx) {
  parallax::SyntaxDiagnostic d;
  const PxLoc* loc = yypcontext_location(yyctx);
  d.token_index = loc->b;
  d.state = static_cast<int>(*yyctx->yyssp);
  yysymbol_kind_t la = yypcontext_token(yyctx);
  if (la == YYSYMBOL_YYEOF || d.token_index >= ctx->n) {
    d.unexpected = TokenKind::EndOfFile;
  } else {
    d.unexpected = (*ctx->toks)[d.token_index].kind;
  }
  yysymbol_kind_t expected[YYNTOKENS];
  int count = yypcontext_expected_tokens(yyctx, expected, YYNTOKENS);
  for (int i = 0; i < count; ++i) {
    TokenKind k;
    if (from_symbol(expected[i], &k)) d.expected.push_back(k);
  }
  d.message = std::string("unexpected ") + yysymbol_name(la);
  ctx->result->diagnostics.push_back(std::move(d));
  if (ctx->stop_at_first) ctx->halted = true;
  return 0;
}

static void yyerror(PxLoc* loc, parallax::ParseCtx* ctx, const char* msg) {
  /* Only reached for "memory exhausted" (stack depth > YYMAXDEPTH). */
  ctx->result->resource_limit = true;
  parallax::SyntaxDiagnostic d;
  d.token_index = loc ? loc->b : ctx->next;
  d.unexpected = d.token_index < ctx->n ? (*ctx->toks)[d.token_index].kind : TokenKind::EndOfFile;
  d.message = std::string("parser resource limit: ") + msg + " (nesting too deep)";
  ctx->result->diagnostics.push_back(std::move(d));
}

namespace parallax {

ParseResult parse_tokens(const std::vector<Token>& tokens, const ParseOptions& opts) {
  ParseResult result;
  result.arena = std::make_shared<AstArena>();
  ParseCtx ctx;
  ctx.toks = &tokens;
  ctx.n = static_cast<int>(tokens.size());
  ctx.stop_at_first = opts.stop_at_first_error;
  ctx.build_ast = opts.build_ast;
  ctx.result = &result;
  ctx.arena = result.arena.get();
  ctx.tracing = opts.trace;
  ctx.trace_limit = opts.trace_limit;

  if (opts.trace) {
    g_trace_ctx = &ctx;
    yydebug = 1;
  }
  int rc = yyparse(&ctx);
  if (opts.trace) {
    if (!ctx.trace_line.empty() && static_cast<int>(result.trace.size()) < ctx.trace_limit)
      result.trace.push_back(ctx.trace_line);
    yydebug = 0;
    g_trace_ctx = nullptr;
  }
  result.accepted = (rc == 0);
  if (rc == 2) result.resource_limit = true;
  if (result.accepted) result.recovered_root = ctx.root;
  if (result.accepted && result.diagnostics.empty()) result.root = ctx.root;
  return result;
}

bool expected_at(const std::vector<Token>& tokens, int pos, std::vector<TokenKind>* out, int* state) {
  ParseResult result;
  result.arena = std::make_shared<AstArena>();
  ParseCtx ctx;
  ctx.toks = &tokens;
  ctx.n = static_cast<int>(tokens.size());
  ctx.probe = pos;
  ctx.stop_at_first = true;
  ctx.result = &result;
  ctx.arena = result.arena.get();
  yyparse(&ctx);
  if (result.diagnostics.empty()) return false;
  const SyntaxDiagnostic& d = result.diagnostics.front();
  if (d.token_index != pos) return false;  // prefix already failed earlier
  *out = d.expected;
  if (state) *state = d.state;
  return true;
}

}  // namespace parallax
