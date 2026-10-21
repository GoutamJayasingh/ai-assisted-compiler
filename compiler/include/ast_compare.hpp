#pragma once

#include "ast.hpp"
#include <string>
#include <vector>

namespace compiler {

struct ASTComparison {
    bool identical = true;
    std::vector<std::string> differences;
};

ASTComparison compareAST(const Program& original, const Program& corrected);

}
