#include "source_parser.hpp"
#include "ast_compare.hpp"
#include <cassert>
#include <iostream>

int main() {
    auto original = compiler::parseSource("int result = 10 + 20;\n");
    auto corrected = compiler::parseSource("int result = 10 - 20;\n");

    assert(original.success);
    assert(corrected.success);

    auto comparison = compiler::compareAST(original.program, corrected.program);
    assert(!comparison.identical);
    assert(!comparison.differences.empty());

    std::cout << "PASS: Both source strings parsed successfully.\n";
    std::cout << "PASS: AST comparison detected the changed operator.\n";
    for (const auto& difference : comparison.differences) {
        std::cout << "Difference: " << difference << '\n';
    }
    // Verify lexer locations reset between consecutive parses.
    auto firstParse = compiler::parseSource("int first = 1;\n");
    auto secondParse = compiler::parseSource("int second = 2;\n");

    assert(firstParse.success);
    assert(secondParse.success);

    assert(!firstParse.tokens.empty());
    assert(!secondParse.tokens.empty());

    assert(firstParse.tokens.front().line == 1);
    assert(firstParse.tokens.front().column == 1);

    assert(secondParse.tokens.front().line == 1);
    assert(secondParse.tokens.front().column == 1);

    std::cout << "PASS: Lexer locations reset between consecutive parses.\n";
}
