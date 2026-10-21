#pragma once

#include "ast.hpp"
#include <iosfwd>

namespace compiler {

void printAST(const Program& program, std::ostream& out);

}
