#include "ast.hpp"
#include "ast_printer.hpp"
#include "parser.hpp"
#include "semantic.hpp"

#include <iostream>
#include <string>
#include <vector>

namespace {

void trace(const std::string& message) {
    std::clog << "[TRACE] " << message << '\n';
}

} // namespace

int main() {
    trace("Source code received");

    compiler::Program program;
    std::vector<compiler::Diagnostic> diagnostics;

    trace("Parsing started");

    yy::parser parser(program, diagnostics);
    const int parse_status = parser.parse();

    if (parse_status == 0 && diagnostics.empty()) {
        trace("Parsing completed successfully");
    } else {
        trace("Parsing finished with errors");
    }

    trace("Printing AST");
    compiler::printAST(program, std::cout);

    if (parse_status == 0 && diagnostics.empty()) {
        trace("Semantic analysis started");

        compiler::SemanticAnalyzer analyzer;
        std::vector<compiler::Diagnostic> semantic_diagnostics =
            analyzer.analyze(program);

        diagnostics.insert(
            diagnostics.end(),
            semantic_diagnostics.begin(),
            semantic_diagnostics.end()
        );

        trace("Semantic analysis completed");
    } else {
        trace("Semantic analysis skipped because parsing failed");
    }

    for (const auto& diagnostic : diagnostics) {
        std::cerr << diagnostic.phase
                  << " error at line " << diagnostic.line
                  << ", column " << diagnostic.column
                  << ": " << diagnostic.message << '\n';
    }

    if (parse_status != 0 || !diagnostics.empty()) {
        trace("Compilation failed");
        return 1;
    }

    std::cout << "Compilation successful.\n";
    trace("Compilation successful");
    return 0;
}
