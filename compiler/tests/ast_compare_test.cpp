#include "ast.hpp"
#include "ast_compare.hpp"
#include <cassert>
#include <iostream>
#include <memory>

using namespace compiler;

Program makeProgram(char op) {
    Program p;
    auto lhs = std::make_unique<NumberExpr>(10);
    auto rhs = std::make_unique<NumberExpr>(20);
    auto expr = std::make_unique<BinaryExpr>(op, std::move(lhs), std::move(rhs));
    p.statements.push_back(
        std::make_unique<DeclarationStmt>("result", std::move(expr)));
    return p;
}

int main() {
    auto original = makeProgram('+');
    auto same = makeProgram('+');
    auto changed = makeProgram('-');

    assert(compareAST(original, same).identical);

    auto result = compareAST(original, changed);
    assert(!result.identical);
    assert(!result.differences.empty());

    std::cout << "PASS: Identical ASTs recognized\n";
    std::cout << "PASS: Changed operator detected\n";
    return 0;
}
