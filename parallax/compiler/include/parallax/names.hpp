// Lightweight static name resolution over a complete AST.
// This is NOT a type checker. It reports undeclared identifiers, duplicate
// declarations in one scope and calls to non-functions, and is used (a) as
// an informational pass for valid programs and (b) as one piece of repair
// evidence: a repair that introduces new name errors is less plausible.
#pragma once

#include <string>
#include <vector>

#include "parallax/ast.hpp"

namespace parallax {

struct NameWarning {
  std::string kind;     // "undeclared", "duplicate", "not-a-function", "not-a-variable"
  std::string name;
  std::string message;
  int tok_begin = 0;
  int tok_end = 0;
};

// Scope rules (docs/MINIC_LANGUAGE_SPEC.md §Scopes):
//  * functions are visible in the whole program (no prototypes needed);
//  * globals are visible after their declarator;
//  * parameters are visible in the function body;
//  * every Block opens a scope; a for-init declaration is scoped to the loop;
//  * a local is visible after its own declarator (initialiser cannot see it).
// Identifiers beginning with "__hole" (repair placeholders) are ignored.
std::vector<NameWarning> check_names(const Node* program);

}  // namespace parallax
