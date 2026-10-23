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

    return result;
}

} // namespace compiler
