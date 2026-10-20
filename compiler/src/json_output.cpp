#include "json_output.hpp"

#include <ostream>
#include <string>

namespace compiler {
namespace {

void writeEscapedString(const std::string& value, std::ostream& out) {
    out << '"';

    for (unsigned char ch : value) {
        switch (ch) {
            case '"':  out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\b': out << "\\b"; break;
            case '\f': out << "\\f"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (ch < 0x20) {
                    const char hex[] = "0123456789abcdef";
                    out << "\\u00"
                        << hex[(ch >> 4) & 0x0f]
                        << hex[ch & 0x0f];
                } else {
                    out << static_cast<char>(ch);
                }
        }
    }

    out << '"';
}

void writeLocation(const Node& node, std::ostream& out) {
    out << ",\"line\":" << node.location.line
        << ",\"column\":" << node.location.column;
}

void writeExpression(const Expr& expr, std::ostream& out) {
    if (const auto* number = dynamic_cast<const NumberExpr*>(&expr)) {
        out << "{\"type\":\"Number\",\"value\":" << number->value;
        writeLocation(*number, out);
        out << '}';
        return;
    }

    if (const auto* identifier =
            dynamic_cast<const IdentifierExpr*>(&expr)) {
        out << "{\"type\":\"Identifier\",\"name\":";
        writeEscapedString(identifier->name, out);
        writeLocation(*identifier, out);
        out << '}';
        return;
    }

    if (const auto* binary = dynamic_cast<const BinaryExpr*>(&expr)) {
        out << "{\"type\":\"BinaryExpression\",\"operator\":";
        writeEscapedString(std::string(1, binary->op), out);
        out << ",\"left\":";

        if (binary->left) {
            writeExpression(*binary->left, out);
        } else {
            out << "null";
        }

        out << ",\"right\":";

        if (binary->right) {
            writeExpression(*binary->right, out);
        } else {
            out << "null";
        }

        writeLocation(*binary, out);
        out << '}';
        return;
    }

    out << "null";
}

void writeStatement(const Stmt& stmt, std::ostream& out) {
    if (const auto* declaration =
            dynamic_cast<const DeclarationStmt*>(&stmt)) {
        out << "{\"type\":\"Declaration\",\"name\":";
        writeEscapedString(declaration->name, out);
        out << ",\"initializer\":";

        if (declaration->initializer) {
            writeExpression(*declaration->initializer, out);
        } else {
            out << "null";
        }

        writeLocation(*declaration, out);
        out << '}';
        return;
    }

    if (const auto* assignment =
            dynamic_cast<const AssignmentStmt*>(&stmt)) {
        out << "{\"type\":\"Assignment\",\"name\":";
        writeEscapedString(assignment->name, out);
        out << ",\"value\":";

        if (assignment->value) {
            writeExpression(*assignment->value, out);
        } else {
            out << "null";
        }

        writeLocation(*assignment, out);
        out << '}';
        return;
    }

    if (const auto* print = dynamic_cast<const PrintStmt*>(&stmt)) {
        out << "{\"type\":\"Print\",\"expression\":";

        if (print->expression) {
            writeExpression(*print->expression, out);
        } else {
            out << "null";
        }

        writeLocation(*print, out);
        out << '}';
        return;
    }

    out << "null";
}

} // namespace

void writeCompileResultJson(
    const SourceParseResult& result,
    const std::vector<Diagnostic>& diagnostics,
    bool success,
    std::ostream& out
) {
    out << "{\"success\":" << (success ? "true" : "false");

    out << ",\"tokens\":[";
    for (std::size_t i = 0; i < result.tokens.size(); ++i) {
        if (i > 0) out << ',';

        const auto& token = result.tokens[i];
        out << "{\"type\":";
        writeEscapedString(token.type, out);
        out << ",\"value\":";
        writeEscapedString(token.value, out);
        out << ",\"line\":" << token.line
            << ",\"column\":" << token.column << '}';
    }
    out << ']';

    out << ",\"ast\":{\"type\":\"Program\",\"statements\":[";
    for (std::size_t i = 0; i < result.program.statements.size(); ++i) {
        if (i > 0) out << ',';

        if (result.program.statements[i]) {
            writeStatement(*result.program.statements[i], out);
        } else {
            out << "null";
        }
    }
    out << "]}";

    out << ",\"diagnostics\":[";
    for (std::size_t i = 0; i < diagnostics.size(); ++i) {
        if (i > 0) out << ',';

        const auto& diagnostic = diagnostics[i];
        out << "{\"phase\":";
        writeEscapedString(diagnostic.phase, out);
        out << ",\"line\":" << diagnostic.line
            << ",\"column\":" << diagnostic.column
            << ",\"message\":";
        writeEscapedString(diagnostic.message, out);
        out << '}';
    }
    out << ']';

    out << ",\"recovered\":"
        << (result.recovered ? "true" : "false")
        << "}\n";
}

} // namespace compiler
