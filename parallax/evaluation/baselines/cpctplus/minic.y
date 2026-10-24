// MiniC grammar in grmtools Yacc format for the optional CPCT+ baseline.
// Same productions as compiler/grammar/minic.y minus semantic actions and
// minus the panic-mode `error` productions (CPCT+ does its own recovery).
%start program
%token "BAD"
%nonassoc LOWER_THAN_ELSE
%nonassoc "ELSE"
%%
program : ext_list ;
ext_list : | ext_list ext_decl ;
ext_decl : function | decl_stmt ;
var_type : "INT" | "FLOAT" | "CHAR" | "BOOL" ;
function : var_type "IDENT" "LPAREN" param_opt "RPAREN" block
         | "VOID" "IDENT" "LPAREN" param_opt "RPAREN" block ;
param_opt : | "VOID" | param_list ;
param_list : param | param_list "COMMA" param ;
param : var_type "IDENT" | var_type "IDENT" "LBRACKET" "RBRACKET" ;
block : "LBRACE" stmt_list "RBRACE" ;
stmt_list : | stmt_list stmt ;
stmt : decl_stmt
     | assignment "SEMI"
     | expr "SEMI"
     | if_stmt
     | while_stmt
     | for_stmt
     | return_stmt
     | "BREAK" "SEMI"
     | "CONTINUE" "SEMI"
     | block
     | "SEMI" ;
decl_stmt : decl_core "SEMI" ;
decl_core : var_type declarator_list ;
declarator_list : declarator | declarator_list "COMMA" declarator ;
declarator : "IDENT" | "IDENT" "ASSIGN" expr | "IDENT" "LBRACKET" "INT_LIT" "RBRACKET" ;
assignment : lvalue "ASSIGN" expr ;
lvalue : "IDENT" | "IDENT" "LBRACKET" expr "RBRACKET" ;
if_stmt : "IF" "LPAREN" expr "RPAREN" stmt %prec LOWER_THAN_ELSE
        | "IF" "LPAREN" expr "RPAREN" stmt "ELSE" stmt ;
while_stmt : "WHILE" "LPAREN" expr "RPAREN" stmt ;
for_stmt : "FOR" "LPAREN" for_init "SEMI" for_cond "SEMI" for_update "RPAREN" stmt ;
for_init : | assignment | decl_core ;
for_cond : | expr ;
for_update : | assignment | expr ;
return_stmt : "RETURN" "SEMI" | "RETURN" expr "SEMI" ;
expr : or_expr ;
or_expr : and_expr | or_expr "OR" and_expr ;
and_expr : eq_expr | and_expr "AND" eq_expr ;
eq_expr : rel_expr | eq_expr "EQ" rel_expr | eq_expr "NE" rel_expr ;
rel_expr : add_expr | rel_expr "LT" add_expr | rel_expr "LE" add_expr | rel_expr "GT" add_expr | rel_expr "GE" add_expr ;
add_expr : mul_expr | add_expr "PLUS" mul_expr | add_expr "MINUS" mul_expr ;
mul_expr : unary | mul_expr "STAR" unary | mul_expr "SLASH" unary | mul_expr "PERCENT" unary ;
unary : postfix | "MINUS" unary | "NOT" unary ;
postfix : primary | "IDENT" "LPAREN" args_opt "RPAREN" | "IDENT" "LBRACKET" expr "RBRACKET" ;
primary : "IDENT" | "INT_LIT" | "FLOAT_LIT" | "CHAR_LIT" | "TRUE" | "FALSE" | "LPAREN" expr "RPAREN" ;
args_opt : | arg_list ;
arg_list : expr | arg_list "COMMA" expr ;
