#include "ast_printer.hpp"

#include <ostream>
#include <string>

namespace compiler {
namespace {

void printExpression(const Expr& expr, std::ostream& out, int depth) {
    const std::string indent(static_cast<std::size_t>(depth) * 2, ' ');

    if (const auto* number = dynamic_cast<const NumberExpr*>(&expr)) {
        out << indent << "Number: " << number->value << '\n';
        return;
    }

    if (const auto* identifier =
            dynamic_cast<const IdentifierExpr*>(&expr)) {
        out << indent << "Identifier: " << identifier->name << '\n';
        return;
    }

    if (const auto* binary = dynamic_cast<const BinaryExpr*>(&expr)) {
        out << indent << "Binary expression: " << binary->op << '\n';

        if (binary->left) {
            out << indent << "Left:\n";
            printExpression(*binary->left, out, depth + 1);
        }

        if (binary->right) {
            out << indent << "Right:\n";
            printExpression(*binary->right, out, depth + 1);
        }

        return;
    }

    out << indent << "Unknown expression\n";
}

void printStatement(const Stmt& stmt, std::ostream& out, int depth) {
    const std::string indent(static_cast<std::size_t>(depth) * 2, ' ');

    if (const auto* declaration =
            dynamic_cast<const DeclarationStmt*>(&stmt)) {
        out << indent << "Declaration: " << declaration->name << '\n';

        if (declaration->initializer) {
            out << indent << "Initializer:\n";
            printExpression(*declaration->initializer, out, depth + 1);
        }

        return;
    }

    if (const auto* assignment =
            dynamic_cast<const AssignmentStmt*>(&stmt)) {
        out << indent << "Assignment: " << assignment->name << '\n';

        if (assignment->value) {
            out << indent << "Value:\n";
            printExpression(*assignment->value, out, depth + 1);
        }

        return;
    }

    if (const auto* print = dynamic_cast<const PrintStmt*>(&stmt)) {
        out << indent << "Print statement\n";

        if (print->expression) {
            printExpression(*print->expression, out, depth + 1);
        }

        return;
    }

    out << indent << "Unknown statement\n";
}

} // namespace

void printAST(const Program& program, std::ostream& out) {
    out << "Program\n";

    if (program.statements.empty()) {
        out << "  (no complete statements)\n";
        return;
    }

    for (std::size_t i = 0; i < program.statements.size(); ++i) {
        out << "  Statement " << i + 1 << ":\n";

        if (program.statements[i]) {
            printStatement(*program.statements[i], out, 2);
        } else {
            out << "    (empty statement)\n";
        }
    }
}

} // namespace compiler
