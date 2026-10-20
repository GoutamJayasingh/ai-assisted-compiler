
#include "ast.hpp"
#include "parser.hpp"
#include "semantic.hpp"

#include <iostream>
#include <string>
#include <vector>

int main() {
    compiler::Program program;
    std::vector<compiler::Diagnostic> diagnostics;

    yy::parser parser(program, diagnostics);
    const int parse_status = parser.parse();

    if (parse_status == 0) {
        compiler::SemanticAnalyzer analyzer;
        std::vector<compiler::Diagnostic> semantic_diagnostics =
            analyzer.analyze(program);

        diagnostics.insert(
            diagnostics.end(),
            semantic_diagnostics.begin(),
            semantic_diagnostics.end()
        );
    }

    for (const auto& diagnostic : diagnostics) {
        std::cerr << diagnostic.phase
                  << " error at line " << diagnostic.line
                  << ", column " << diagnostic.column
                  << ": " << diagnostic.message << '\n';
    }

    if (parse_status != 0 || !diagnostics.empty()) {
        return 1;
    }

    std::cout << "Compilation successful.\n";
    return 0;
}
