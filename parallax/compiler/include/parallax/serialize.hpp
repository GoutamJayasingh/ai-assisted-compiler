// JSON serialisation of compiler artefacts. Field names are the stable
// contract documented in docs/API_CONTRACT.md (schema_version 1).
#pragma once

#include <string>
#include <vector>

#include "parallax/ast.hpp"
#include "parallax/json.hpp"
#include "parallax/lexer.hpp"
#include "parallax/names.hpp"
#include "parallax/parser.hpp"
#include "parallax/repair.hpp"

namespace parallax {

constexpr const char* kSchemaVersion = "1";

void write_position(JsonWriter& w, const Position& p);
void write_tokens(JsonWriter& w, const std::vector<Token>& toks);
void write_comments(JsonWriter& w, const std::vector<Comment>& comments);
void write_diagnostic(JsonWriter& w, const SyntaxDiagnostic& d, const std::vector<Token>& toks,
                      const Position& eof);
std::string diagnostic_message(const SyntaxDiagnostic& d, const std::vector<Token>& toks);
void write_ast(JsonWriter& w, const Node* n, const std::vector<Token>& toks, const Position& eof);
void write_name_warnings(JsonWriter& w, const std::vector<NameWarning>& ws, const std::vector<Token>& toks,
                         const Position& eof);
void write_input_info(JsonWriter& w, const std::string& source);

// Complete documents produced by the CLI modes.
std::string lex_document(const std::string& source);
std::string analyze_document(const std::string& source, bool trace);
std::string repair_document(const RepairReport& R);

}  // namespace parallax
