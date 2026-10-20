#include "source_parser.hpp"
#include "parser.hpp"
#include "lexer_buffer.hpp"

namespace compiler {

SourceParseResult parseSource(const std::string& source) {
    SourceParseResult result;

    YY_BUFFER_STATE buffer = yy_scan_string(source.c_str());

    yy::parser parser(result.program, result.diagnostics);
    const int status = parser.parse();

    yy_delete_buffer(buffer);

    result.success = (status == 0 && result.diagnostics.empty());
    return result;
}

}
