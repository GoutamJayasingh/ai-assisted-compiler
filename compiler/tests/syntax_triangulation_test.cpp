#include "syntax_triangulation.hpp"

#include <cassert>
#include <iostream>
#include <string>
#include <vector>

using compiler::Diagnostic;
using compiler::SyntaxTriangulation;
using compiler::TokenInfo;

int main() {
    {
        const std::vector<TokenInfo> tokens = {
            {"PRINT", "print", 1, 1},
            {"LPAREN", "(", 1, 6},
            {"NUMBER", "10", 1, 7},
            {"RPAREN", ")", 1, 9},
            {"SEMICOLON", ";", 1, 10}
        };
        const auto result = compiler::analyzeSyntaxTriangulation(tokens, {});
        assert(result.status == "clear");
        assert(result.candidates.empty());
        std::cout << "PASS: Balanced input has no structural candidate.\n";
    }

    {
        const std::vector<TokenInfo> tokens = {
            {"PRINT", "print", 1, 1},
            {"LPAREN", "(", 1, 6},
            {"NUMBER", "10", 1, 7},
            {"SEMICOLON", ";", 1, 9}
        };
        const std::vector<Diagnostic> diagnostics = {
            {"syntax", 1, 9, "unexpected ;, expecting )"}
        };
        const auto result =
            compiler::analyzeSyntaxTriangulation(tokens, diagnostics);
        assert(result.status == "supported");
        assert(!result.candidates.empty());
        assert(result.candidates.front().score >= 4);
        assert(result.candidates.front().line == 1);
        std::cout << "PASS: Parser and reverse scan support a missing ')' region.\n";
    }

    {
        const std::vector<TokenInfo> tokens = {
            {"PRINT", "print", 1, 1},
            {"RPAREN", ")", 1, 6},
            {"SEMICOLON", ";", 1, 7}
        };
        const std::vector<Diagnostic> diagnostics = {
            {"syntax", 1, 6, "unexpected )"}
        };
        const auto result =
            compiler::analyzeSyntaxTriangulation(tokens, diagnostics);
        assert(result.status == "supported");
        assert(!result.candidates.empty());
        assert(!result.candidates.front().evidence.empty());
        std::cout << "PASS: Unmatched ')' evidence is ranked with parser diagnostics.\n";
    }

    {
        const std::vector<TokenInfo> tokens = {
            {"PRINT", "print", 1, 1},
            {"LPAREN", "(", 1, 6},
            {"NUMBER", "1", 1, 7},
            {"SEMICOLON", ";", 1, 8},
            {"PRINT", "print", 2, 1},
            {"RPAREN", ")", 2, 6},
            {"SEMICOLON", ";", 2, 7}
        };
        const std::vector<Diagnostic> diagnostics = {
            {"syntax", 1, 8, "expected )"},
            {"syntax", 2, 6, "unexpected )"}
        };
        const auto result =
            compiler::analyzeSyntaxTriangulation(tokens, diagnostics);
        assert(result.candidates.size() >= 2);
        std::cout << "PASS: Multiple structural fault regions are retained.\n";
    }

    {
        const std::vector<TokenInfo> tokens = {
            {"PRINT", "print", 1, 1},
            {"LPAREN", "(", 1, 6}
        };
        const auto result = compiler::analyzeSyntaxTriangulation(tokens, {});
        assert(result.status == "inconclusive");
        assert(!result.candidates.empty());
        std::cout << "PASS: Structural-only evidence is reported as inconclusive.\n";
    }

    return 0;
}
