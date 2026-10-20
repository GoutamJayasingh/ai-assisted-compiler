#pragma once

#include <string>
#include <vector>

struct yy_buffer_state;
using YY_BUFFER_STATE = yy_buffer_state*;

YY_BUFFER_STATE yy_scan_string(const char* text);
void yy_delete_buffer(YY_BUFFER_STATE buffer);

// Information collected from the existing lexer.
namespace compiler {

struct TokenInfo {
    std::string type;
    std::string value;
    int line = 1;
    int column = 1;
};

// When non-null, the lexer records each recognized token here.
// When null, token collection is disabled.
void setTokenCollector(std::vector<TokenInfo>* collector);
void resetLexerLocation();
} // namespace compiler
