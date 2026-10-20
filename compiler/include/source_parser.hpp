#pragma once

#include "ast.hpp"
#include "semantic.hpp"

#include <string>
#include <vector>

namespace compiler {

struct SourceParseResult {
    Program program;
    std::vector<Diagnostic> diagnostics;
    bool success = false;
};

SourceParseResult parseSource(const std::string& source);

}
