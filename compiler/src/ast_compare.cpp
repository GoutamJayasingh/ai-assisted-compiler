#include "ast_compare.hpp"

#include <string>

namespace compiler {
namespace {

void compareExpression(
    const Expr* original,
    const Expr* corrected,
    const std::string& path,
    ASTComparison& result
) {
    if (!original || !corrected) {
        if (original != corrected) {
            result.identical = false;
            result.differences.push_back(path + ": expression added or removed");
        }
        return;
    }

    if (const auto* a = dynamic_cast<const NumberExpr*>(original)) {
        const auto* b = dynamic_cast<const NumberExpr*>(corrected);
        if (!b || a->value != b->value) {
            result.identical = false;
            result.differences.push_back(path + ": number changed");
        }
        return;
    }

    if (const auto* a = dynamic_cast<const IdentifierExpr*>(original)) {
        const auto* b = dynamic_cast<const IdentifierExpr*>(corrected);
        if (!b || a->name != b->name) {
            result.identical = false;
            result.differences.push_back(path + ": identifier changed");
        }
        return;
    }

    if (const auto* a = dynamic_cast<const BinaryExpr*>(original)) {
        const auto* b = dynamic_cast<const BinaryExpr*>(corrected);
        if (!b) {
            result.identical = false;
            result.differences.push_back(path + ": expression type changed");
            return;
        }

        if (a->op != b->op) {
            result.identical = false;
            result.differences.push_back(path + ": operator changed");
        }

        compareExpression(a->left.get(), b->left.get(), path + ".left", result);
        compareExpression(a->right.get(), b->right.get(), path + ".right", result);
        return;
    }

    if (dynamic_cast<const NumberExpr*>(corrected) ||
        dynamic_cast<const IdentifierExpr*>(corrected) ||
        dynamic_cast<const BinaryExpr*>(corrected)) {
        result.identical = false;
        result.differences.push_back(path + ": expression type changed");
    }
}

void compareStatement(
    const Stmt* original,
    const Stmt* corrected,
    std::size_t index,
    ASTComparison& result
) {
    const std::string path = "statement " + std::to_string(index + 1);

    if (!original || !corrected) {
        result.identical = false;
        result.differences.push_back(path + ": statement added or removed");
        return;
    }

    if (const auto* a = dynamic_cast<const DeclarationStmt*>(original)) {
        const auto* b = dynamic_cast<const DeclarationStmt*>(corrected);
        if (!b) {
            result.identical = false;
            result.differences.push_back(path + ": statement type changed");
            return;
        }
        if (a->name != b->name) {
            result.identical = false;
            result.differences.push_back(path + ": declared variable changed");
        }
        compareExpression(a->initializer.get(), b->initializer.get(),
                          path + ".initializer", result);
        return;
    }

    if (const auto* a = dynamic_cast<const AssignmentStmt*>(original)) {
        const auto* b = dynamic_cast<const AssignmentStmt*>(corrected);
        if (!b) {
            result.identical = false;
            result.differences.push_back(path + ": statement type changed");
            return;
        }
        if (a->name != b->name) {
            result.identical = false;
            result.differences.push_back(path + ": assigned variable changed");
        }
        compareExpression(a->value.get(), b->value.get(), path + ".value", result);
        return;
    }

    if (const auto* a = dynamic_cast<const PrintStmt*>(original)) {
        const auto* b = dynamic_cast<const PrintStmt*>(corrected);
        if (!b) {
            result.identical = false;
            result.differences.push_back(path + ": statement type changed");
            return;
        }
        compareExpression(a->expression.get(), b->expression.get(),
                          path + ".expression", result);
        return;
    }

    result.identical = false;
    result.differences.push_back(path + ": unsupported statement type");
}

}

ASTComparison compareAST(const Program& original, const Program& corrected) {
    ASTComparison result;

    if (original.statements.size() != corrected.statements.size()) {
        result.identical = false;
        result.differences.push_back("number of statements changed");
    }

    const std::size_t count =
        original.statements.size() < corrected.statements.size()
            ? original.statements.size()
            : corrected.statements.size();

    for (std::size_t i = 0; i < count; ++i) {
        compareStatement(original.statements[i].get(),
                         corrected.statements[i].get(), i, result);
    }

    return result;
}

}
