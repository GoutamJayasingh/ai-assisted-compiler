#pragma once

#include "ast.hpp"
#include "lexer_buffer.hpp"
#include "semantic.hpp"

#include <string>
#include <vector>

namespace compiler {

struct SourceParseResult {
    Program program;
    std::vector<Diagnostic> diagnostics;
    std::vector<TokenInfo> tokens;
    std::vector<TraceEvent> trace;
    bool success = false;
    bool recovered = false;
};

SourceParseResult parseSource(const std::string& source);

} // namespace compiler
