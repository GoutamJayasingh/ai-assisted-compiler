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

    // Surface ranked candidates through the existing diagnostics path. This
    // keeps the current API and frontend compatible without changing their
    // architecture; the dedicated JSON field also preserves structured data.
    if (result.triangulation.status != "clear") {
        for (std::size_t i = 0;
             i < result.triangulation.candidates.size(); ++i) {
            const auto& candidate = result.triangulation.candidates[i];
            std::string message = "Rank " + std::to_string(i + 1) +
                " candidate (score " + std::to_string(candidate.score) +
                ", region lines " + std::to_string(candidate.start_line) +
                "-" + std::to_string(candidate.end_line) + "). " +
                result.triangulation.summary;
            if (!candidate.evidence.empty()) {
                message += " Evidence: ";
                for (std::size_t j = 0; j < candidate.evidence.size(); ++j) {
                    if (j > 0) message += "; ";
                    message += candidate.evidence[j];
                }
            }
            result.diagnostics.push_back({
                "triangulation", candidate.line, candidate.column, message
            });
        }
    }

    return result;
}

} // namespace compiler
