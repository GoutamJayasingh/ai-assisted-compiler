#pragma once

#include "source_parser.hpp"
#include "semantic.hpp"

#include <iosfwd>
#include <vector>

namespace compiler {

void writeCompileResultJson(
    const SourceParseResult& result,
    const std::vector<Diagnostic>& diagnostics,
    bool success,
    std::ostream& out
);

} // namespace compiler
