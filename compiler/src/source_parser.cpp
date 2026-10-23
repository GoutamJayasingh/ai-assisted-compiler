#include "source_parser.hpp"
#include "parser.hpp"
#include "lexer_buffer.hpp"

namespace compiler {

SourceParseResult parseSource(const std::string& source) {
    SourceParseResult result;

    // Reset source positions and enable token collection for this parse.
    resetLexerLocation();
    setTokenCollector(&result.tokens);

    YY_BUFFER_STATE buffer = yy_scan_string(source.c_str());

    yy::parser parser(result.program, result.diagnostics, result.trace);
    const int status = parser.parse();

    yy_delete_buffer(buffer);

    // Disable collection so ordinary compiler use is unaffected.
    setTokenCollector(nullptr);

    result.success = (status == 0 && result.diagnostics.empty());
    result.recovered = (status == 0 && !result.diagnostics.empty());
    result.triangulation = analyzeSyntaxTriangulation(
        result.tokens, result.diagnostics
    );

    // Surface a concise triangulation summary through the existing diagnostic
    // UI/API path, avoiding a required frontend or backend architecture change.
    if (!result.triangulation.candidates.empty() &&
        result.triangulation.status != "clear") {
        const auto& candidate = result.triangulation.candidates.front();
        std::string message = result.triangulation.summary;
        message += " Top candidate region: lines " +
            std::to_string(candidate.start_line) + "-" +
            std::to_string(candidate.end_line) + ", score " +
            std::to_string(candidate.score) + ".";
        if (!candidate.evidence.empty()) {
            message += " Evidence: ";
            for (std::size_t i = 0; i < candidate.evidence.size(); ++i) {
                if (i > 0) message += "; ";
                message += candidate.evidence[i];
            }
        }
        result.diagnostics.push_back({
            "triangulation", candidate.line, candidate.column, message
        });
    }

    return result;
}

} // namespace compiler
