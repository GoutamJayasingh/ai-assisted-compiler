#include "parallax/serialize.hpp"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdlib>

namespace parallax {

void write_position(JsonWriter& w, const Position& p) {
  w.begin_object().kv("offset", p.offset).kv("line", p.line).kv("column", p.column).end_object();
}

namespace {

void write_literal_value(JsonWriter& w, const Token& t) {
  switch (t.kind) {
    case TokenKind::IntLit: w.key("value").value(static_cast<long long>(std::strtoll(t.lexeme.c_str(), nullptr, 10))); break;
    case TokenKind::FloatLit: w.key("value").value(std::strtod(t.lexeme.c_str(), nullptr)); break;
    case TokenKind::KwTrue: w.key("value").value(true); break;
    case TokenKind::KwFalse: w.key("value").value(false); break;
    case TokenKind::CharLit: {
      int code = 0;
      const std::string& s = t.lexeme;
      if (s.size() >= 3 && s[1] == '\\') {
        switch (s[2]) {
          case 'n': code = '\n'; break;
          case 't': code = '\t'; break;
          case 'r': code = '\r'; break;
          case '0': code = 0; break;
          default: code = static_cast<unsigned char>(s[2]);
        }
      } else if (s.size() >= 3) {
        code = static_cast<unsigned char>(s[1]);
      }
      w.key("value").value(code);
      break;
    }
    default: break;
  }
}

Position span_start(const std::vector<Token>& toks, int b, const Position& eof) {
  if (b >= 0 && b < static_cast<int>(toks.size())) return toks[b].start;
  return eof;
}
Position span_end(const std::vector<Token>& toks, int b, int e, const Position& eof) {
  if (e > b && e - 1 < static_cast<int>(toks.size())) return toks[e - 1].end;
  return span_start(toks, b, eof);
}

std::string kind_list(const std::vector<TokenKind>& ks) {
  std::string s;
  for (size_t i = 0; i < ks.size(); ++i) {
    if (i) s += (i + 1 == ks.size()) ? " or " : ", ";
    s += "'";
    s += token_kind_spelling(ks[i]);
    s += "'";
  }
  return s;
}

}  // namespace

void write_tokens(JsonWriter& w, const std::vector<Token>& toks) {
  w.begin_array();
  for (size_t i = 0; i < toks.size(); ++i) {
    const Token& t = toks[i];
    w.begin_object();
    w.kv("index", static_cast<int>(i));
    w.kv("kind", token_kind_name(t.kind));
    w.kv("category", token_category(t.kind));
    w.kv("lexeme", t.lexeme);
    w.key("start");
    write_position(w, t.start);
    w.key("end");
    write_position(w, t.end);
    write_literal_value(w, t);
    if (!t.message.empty()) w.kv("message", t.message);
    w.end_object();
  }
  w.end_array();
}

void write_comments(JsonWriter& w, const std::vector<Comment>& comments) {
  w.begin_array();
  for (const Comment& c : comments) {
    w.begin_object().kv("kind", c.block ? "block" : "line");
    w.key("start");
    write_position(w, c.start);
    w.key("end");
    write_position(w, c.end);
    w.end_object();
  }
  w.end_array();
}

std::string diagnostic_message(const SyntaxDiagnostic& d, const std::vector<Token>& toks) {
  const int n = static_cast<int>(toks.size());
  std::string what;
  if (d.token_index >= n) {
    what = "unexpected end of input";
  } else {
    const Token& t = toks[d.token_index];
    if (t.kind == TokenKind::Error) return "lexical error: " + t.message;
    if (t.kind == TokenKind::Unsupported) return "unsupported construct: " + t.message;
    what = "unexpected " + std::string(token_category(t.kind)) + " '" + t.lexeme + "'";
  }
  if (d.message.rfind("parser resource limit", 0) == 0) return d.message;
  if (!d.expected.empty() && d.expected.size() <= 5) what += "; expected " + kind_list(d.expected);
  return what;
}

void write_diagnostic(JsonWriter& w, const SyntaxDiagnostic& d, const std::vector<Token>& toks,
                      const Position& eof) {
  const int n = static_cast<int>(toks.size());
  w.begin_object();
  w.kv("token_index", d.token_index);
  bool at_eof = d.token_index >= n;
  w.kv("unexpected", at_eof ? "EOF" : token_kind_name(toks[d.token_index].kind));
  w.kv("unexpected_lexeme", at_eof ? std::string("") : toks[d.token_index].lexeme);
  w.key("expected").begin_array();
  for (TokenKind k : d.expected) w.value(token_kind_name(k));
  w.end_array();
  w.key("expected_spelling").begin_array();
  for (TokenKind k : d.expected) w.value(token_kind_spelling(k));
  w.end_array();
  w.kv("parser_state", d.state);
  w.kv("message", diagnostic_message(d, toks));
  w.kv("bison_message", d.message);
  w.key("start");
  write_position(w, at_eof ? eof : toks[d.token_index].start);
  w.key("end");
  write_position(w, at_eof ? eof : toks[d.token_index].end);
  w.end_object();
}

void write_ast(JsonWriter& w, const Node* n, const std::vector<Token>& toks, const Position& eof) {
  if (!n) {
    w.null();
    return;
  }
  w.begin_object();
  w.kv("kind", node_kind_name(n->kind));
  if (!n->type.empty()) w.kv("type", n->type);
  if (!n->name.empty()) w.kv("name", n->name);
  if (!n->op.empty()) w.kv("op", n->op);
  if (!n->value.empty()) w.kv("value", n->value);
  if (!n->array.empty()) w.kv("array", n->array);
  w.key("span").begin_object();
  w.key("start");
  write_position(w, span_start(toks, n->tok_begin, eof));
  w.key("end");
  write_position(w, span_end(toks, n->tok_begin, n->tok_end, eof));
  w.kv("tokens", std::to_string(n->tok_begin) + ".." + std::to_string(n->tok_end));
  w.end_object();
  w.key("children").begin_array();
  for (const Node* c : n->children) write_ast(w, c, toks, eof);
  w.end_array();
  w.end_object();
}

void write_name_warnings(JsonWriter& w, const std::vector<NameWarning>& ws, const std::vector<Token>& toks,
                         const Position& eof) {
  w.begin_array();
  for (const NameWarning& nw : ws) {
    w.begin_object().kv("kind", nw.kind).kv("name", nw.name).kv("message", nw.message);
    w.key("start");
    write_position(w, span_start(toks, nw.tok_begin, eof));
    w.key("end");
    write_position(w, span_end(toks, nw.tok_begin, nw.tok_end, eof));
    w.end_object();
  }
  w.end_array();
}

void write_input_info(JsonWriter& w, const std::string& source) {
  int lines = 1, crlf = 0, non_ascii = 0, tabs = 0;
  for (size_t i = 0; i < source.size(); ++i) {
    unsigned char c = static_cast<unsigned char>(source[i]);
    if (c == '\n') {
      lines++;
      if (i > 0 && source[i - 1] == '\r') crlf++;
    }
    if (c >= 0x80) non_ascii++;
    if (c == '\t') tabs++;
  }
  w.key("input").begin_object();
  w.kv("bytes", static_cast<int>(source.size()));
  w.kv("lines", lines);
  w.kv("sha", hex64(fnv1a64(source)));
  w.kv("crlf_line_breaks", crlf);
  w.kv("tabs", tabs);
  w.kv("non_ascii_bytes", non_ascii);
  w.kv("final_newline", !source.empty() && source.back() == '\n');
  w.end_object();
}

namespace {

void write_lex_section(JsonWriter& w, const LexResult& lx) {
  w.key("tokens");
  write_tokens(w, lx.tokens);
  w.key("comments");
  write_comments(w, lx.comments);
  w.key("eof");
  write_position(w, lx.eof);
  w.key("lexical_errors").begin_array();
  for (const Token& t : lx.tokens) {
    if (t.kind != TokenKind::Error && t.kind != TokenKind::Unsupported) continue;
    w.begin_object().kv("index", t.origin).kv("kind", token_kind_name(t.kind)).kv("lexeme", t.lexeme).kv("message", t.message);
    w.key("start");
    write_position(w, t.start);
    w.key("end");
    write_position(w, t.end);
    w.end_object();
  }
  w.end_array();
}

void write_parse_section(JsonWriter& w, const ParseResult& pr, const LexResult& lx, bool include_trace) {
  w.key("parse").begin_object();
  w.kv("ok", pr.ok());
  w.kv("accepted", pr.accepted);
  w.kv("resource_limit", pr.resource_limit);
  w.key("diagnostics").begin_array();
  for (const SyntaxDiagnostic& d : pr.diagnostics) write_diagnostic(w, d, lx.tokens, lx.eof);
  w.end_array();
  w.key("ast");
  write_ast(w, pr.root, lx.tokens, lx.eof);
  w.key("recovered_ast");
  if (!pr.ok() && pr.recovered_root) write_ast(w, pr.recovered_root, lx.tokens, lx.eof);
  else w.null();
  if (pr.root) {
    w.kv("ast_hash", structural_hash(pr.root));
    w.kv("ast_nodes", count_nodes(pr.root));
    w.kv("ast_depth", tree_depth(pr.root));
    w.kv("ast_text", pretty_tree(pr.root));
    w.key("name_warnings");
    write_name_warnings(w, check_names(pr.root), lx.tokens, lx.eof);
  }
  if (include_trace) {
    w.key("trace").begin_array();
    for (const std::string& line : pr.trace) w.value(line);
    w.end_array();
    w.kv("trace_truncated", pr.trace_truncated);
  }
  w.end_object();
}

void write_edit(JsonWriter& w, const Edit& e) {
  w.begin_object();
  w.kv("op", edit_op_name(e.op));
  if (e.op != EditOp::Delete) {
    w.kv("kind", token_kind_name(e.kind));
    w.kv("text", e.lexeme);
    w.kv("placeholder", is_placeholder_kind(e.kind));
  }
  if (e.op != EditOp::Insert) {
    w.kv("removed_kind", token_kind_name(e.removed_kind));
    w.kv("removed_text", e.removed_lexeme);
  }
  w.kv("stream_pos", e.pos);
  w.kv("anchor_token", e.anchor_origin);
  w.key("at");
  write_position(w, e.at);
  w.kv("cost", e.cost);
  w.kv("generator", e.generator);
  w.kv("support", e.support);
  w.end_object();
}

std::string edit_summary(const std::vector<Edit>& edits) {
  std::string s;
  for (size_t i = 0; i < edits.size(); ++i) {
    const Edit& e = edits[i];
    if (i) s += " + ";
    if (e.op == EditOp::Insert) s += "insert '" + e.lexeme + "'";
    else if (e.op == EditOp::Delete) s += "delete '" + e.removed_lexeme + "'";
    else s += "replace '" + e.removed_lexeme + "' with '" + e.lexeme + "'";
    s += " at " + std::to_string(e.at.line) + ":" + std::to_string(e.at.column);
  }
  return s;
}

void write_error_ref(JsonWriter& w, const RepairReport& R, int origin) {
  const int n = static_cast<int>(R.lexed.tokens.size());
  w.begin_object();
  w.kv("token_index", origin);
  bool eof = origin >= n || origin < 0;
  w.kv("token", eof ? std::string("<end of input>") : R.lexed.tokens[origin].lexeme);
  w.key("at");
  write_position(w, eof ? R.lexed.eof : R.lexed.tokens[origin].start);
  w.end_object();
}

void write_candidate(JsonWriter& w, const RepairReport& R, const Candidate& c, bool with_ast) {
  w.begin_object();
  w.kv("id", c.order);
  w.kv("rank", c.rank);
  w.kv("class_id", c.class_id);
  w.kv("outcome", outcome_name(c.outcome));
  w.kv("reason", c.reason);
  w.kv("summary", edit_summary(c.edits));
  w.kv("cost", c.cost);
  w.kv("score", c.score);
  w.kv("local_score", c.local_score);
  w.kv("valid", c.valid);
  w.kv("roundtrip_ok", c.roundtrip_ok);
  w.kv("progress", c.progress);
  w.key("edits").begin_array();
  for (const Edit& e : c.edits) write_edit(w, e);
  w.end_array();
  w.kv("source", c.source);
  w.kv("ast_hash", c.ast_hash);
  w.key("next_error");
  if (c.next_error_origin >= 0) write_error_ref(w, R, c.next_error_origin);
  else w.null();
  w.key("residual_diagnostics").begin_array();
  for (const SyntaxDiagnostic& d : c.full.diagnostics) {
    w.begin_object();
    w.kv("message", diagnostic_message(d, c.relexed));
    int o = origin_at(c.stream, d.token_index, static_cast<int>(R.lexed.tokens.size()));
    w.key("original");
    write_error_ref(w, R, o);
    w.end_object();
  }
  w.end_array();
  w.key("name_warnings");
  if (c.valid) write_name_warnings(w, c.name_warnings, c.relexed, c.relexed.empty() ? Position{} : c.relexed.back().end);
  else w.begin_array().end_array();
  w.key("evidence").begin_array();
  for (const EvidenceItem& it : c.evidence) {
    w.begin_object().kv("name", it.name).kv("group", it.group).kv("value", it.value).kv("weight", it.weight)
        .kv("contribution", it.contribution).kv("explanation", it.explanation).end_object();
  }
  w.end_array();
  if (with_ast && c.valid) {
    LexResult lx = lex(c.source);
    w.key("ast");
    write_ast(w, c.full.root, c.relexed, lx.eof);
  }
  w.end_object();
}

}  // namespace

std::string lex_document(const std::string& source) {
  JsonWriter w;
  auto t = std::chrono::steady_clock::now();
  LexResult lx = lex(source);
  double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t).count();
  w.begin_object();
  w.kv("schema_version", kSchemaVersion);
  w.kv("mode", "lex");
  write_input_info(w, source);
  write_lex_section(w, lx);
  w.key("timing_ms").begin_object().kv("lex", ms).end_object();
  w.end_object();
  return w.str();
}

std::string analyze_document(const std::string& source, bool trace) {
  JsonWriter w;
  auto t0 = std::chrono::steady_clock::now();
  LexResult lx = lex(source);
  auto t1 = std::chrono::steady_clock::now();
  ParseOptions o;
  o.trace = trace;
  ParseResult pr = parse_tokens(lx.tokens, o);
  auto t2 = std::chrono::steady_clock::now();
  w.begin_object();
  w.kv("schema_version", kSchemaVersion);
  w.kv("mode", "analyze");
  write_input_info(w, source);
  write_lex_section(w, lx);
  write_parse_section(w, pr, lx, trace);
  w.key("timing_ms").begin_object()
      .kv("lex", std::chrono::duration<double, std::milli>(t1 - t0).count())
      .kv("parse", std::chrono::duration<double, std::milli>(t2 - t1).count())
      .end_object();
  w.end_object();
  return w.str();
}

std::string repair_document(const RepairReport& R) {
  const RepairConfig& cfg = R.config;
  const int n = static_cast<int>(R.lexed.tokens.size());
  JsonWriter w;
  w.begin_object();
  w.kv("schema_version", kSchemaVersion);
  w.kv("mode", "repair");
  write_input_info(w, R.source);
  write_lex_section(w, R.lexed);
  write_parse_section(w, R.original, R.lexed, false);

  w.key("repair").begin_object();
  w.key("config").begin_object()
      .kv("strategy", cfg.strategy).kv("grouping", cfg.grouping).kv("stability", cfg.stability)
      .kv("abstention", cfg.abstention).kv("layout", cfg.layout).kv("window_back", cfg.window_back)
      .kv("min_progress", cfg.min_progress).kv("max_edits", cfg.max_edits).kv("lane_roots", cfg.lane_roots)
      .kv("lane_branch", cfg.lane_branch).kv("max_depth", cfg.max_depth).kv("max_leaves", cfg.max_leaves)
      .kv("max_parses", cfg.max_parses).kv("time_limit_ms", cfg.time_limit_ms).kv("tau", cfg.tau)
      .end_object();

  w.key("error_site");
  if (R.error_index >= 0) {
    w.begin_object();
    w.kv("token_index", R.error_index);
    bool eof = R.error_index >= n;
    w.kv("token", eof ? std::string("<end of input>") : R.lexed.tokens[R.error_index].lexeme);
    w.kv("kind", eof ? "EOF" : token_kind_name(R.lexed.tokens[R.error_index].kind));
    w.key("start");
    write_position(w, eof ? R.lexed.eof : R.lexed.tokens[R.error_index].start);
    w.key("end");
    write_position(w, eof ? R.lexed.eof : R.lexed.tokens[R.error_index].end);
    w.key("expected").begin_array();
    for (TokenKind k : R.expected_at_error) w.value(token_kind_name(k));
    w.end_array();
    if (!R.original_first.diagnostics.empty()) {
      w.kv("parser_state", R.original_first.diagnostics[0].state);
      w.kv("message", diagnostic_message(R.original_first.diagnostics[0], R.lexed.tokens));
    }
    w.end_object();
  } else {
    w.null();
  }

  w.key("stages").begin_array();
  for (const RepairStage& s : R.stages)
    w.begin_object().kv("name", s.name).kv("status", s.status).kv("ms", s.ms).kv("detail", s.detail).end_object();
  w.end_array();

  // Counts by outcome
  std::map<std::string, int> by_outcome;
  for (const Candidate& c : R.candidates) by_outcome[outcome_name(c.outcome)]++;
  w.key("counts").begin_object();
  w.kv("generated", static_cast<int>(R.candidates.size()));
  w.kv("single_edit", R.generated_singles);
  w.kv("two_edit", R.generated_pairs);
  w.kv("accepted", static_cast<int>(R.ranked.size()));
  w.kv("classes", static_cast<int>(R.classes.size()));
  w.key("by_outcome").begin_object();
  for (auto& [k, v] : by_outcome) w.kv(k, v);
  w.end_object();
  w.end_object();

  w.key("candidates").begin_array();
  for (size_t r = 0; r < R.ranked.size() && static_cast<int>(r) < cfg.max_reported_candidates; ++r)
    write_candidate(w, R, R.candidates[R.ranked[r]], r < 8);
  w.end_array();
  w.kv("candidates_truncated", static_cast<int>(R.ranked.size()) > cfg.max_reported_candidates);

  // Rejected candidates: a deterministic, diverse sample (by outcome).
  w.key("rejected").begin_array();
  {
    std::vector<const Candidate*> rej;
    for (const Candidate& c : R.candidates)
      if (!outcome_accepted(c.outcome)) rej.push_back(&c);
    std::stable_sort(rej.begin(), rej.end(), [](const Candidate* a, const Candidate* b) {
      int ra = static_cast<int>(a->outcome), rb = static_cast<int>(b->outcome);
      if (ra != rb) return ra < rb;
      return a->cost < b->cost;
    });
    int shown = 0;
    for (const Candidate* c : rej) {
      if (shown++ >= cfg.max_reported_rejections) break;
      w.begin_object().kv("id", c->order).kv("outcome", outcome_name(c->outcome)).kv("reason", c->reason)
          .kv("summary", edit_summary(c->edits)).kv("cost", c->cost);
      w.key("edits").begin_array();
      for (const Edit& e : c->edits) write_edit(w, e);
      w.end_array();
      w.key("next_error");
      if (c->next_error_origin >= 0) write_error_ref(w, R, c->next_error_origin);
      else w.null();
      w.end_object();
    }
  }
  w.end_array();

  w.key("classes").begin_array();
  for (const CandidateClass& k : R.classes) {
    w.begin_object().kv("id", k.id).kv("ast_hash", k.ast_hash).kv("complete_ast", k.complete_ast)
        .kv("size", static_cast<int>(k.members.size()))
        .kv("best_score", R.candidates[k.members[0]].score).kv("min_cost", k.min_cost)
        .kv("representative", R.candidates[k.members[0]].order);
    w.key("members").begin_array();
    for (int m : k.members) w.value(R.candidates[m].order);
    w.end_array();
    w.end_object();
  }
  w.end_array();

  // Hypothesis lanes
  w.key("hypotheses").begin_object();
  w.kv("truncated", R.lanes_truncated);
  w.key("leaves").begin_array();
  for (size_t i = 0; i < R.leaves.size(); ++i) {
    const LaneLeaf& L = R.leaves[i];
    w.begin_object().kv("id", static_cast<int>(i)).kv("root_class", L.root_class).kv("valid", L.valid)
        .kv("stop_reason", L.stop_reason).kv("total_cost", L.total_cost).kv("score_sum", L.score_sum);
    w.key("steps").begin_array();
    for (const LaneStep& st : L.steps) {
      w.begin_object().kv("depth", st.depth).kv("summary", st.candidate_summary).kv("alternatives", st.alternatives);
      w.key("margin");
      if (st.has_margin) w.value(st.margin);
      else w.null();
      w.key("error");
      write_error_ref(w, R, st.error_origin);
      w.kv("error_kind", st.error_kind);
      w.key("edits").begin_array();
      for (const Edit& e : st.edits) write_edit(w, e);
      w.end_array();
      w.end_object();
    }
    w.end_array();
    w.kv("source", reconstruct_source(R.source, R.lexed.tokens, L.stream));
    w.end_object();
  }
  w.end_array();
  w.key("stability").begin_array();
  for (const StabilityEntry& s : R.stability) {
    w.begin_object().kv("token_index", s.origin).kv("token", s.token).kv("hypotheses_with", s.hypotheses_with)
        .kv("hypotheses_total", s.hypotheses_total).kv("stable", s.stable);
    w.key("at");
    write_position(w, s.at);
    w.end_object();
  }
  w.end_array();
  w.end_object();

  // Decision
  const Decision& D = R.decision;
  w.key("decision").begin_object();
  w.kv("status", D.status);
  w.kv("summary", D.summary);
  w.key("reasons").begin_array();
  for (const std::string& r : D.reasons) w.value(r);
  w.end_array();
  w.key("margin");
  if (D.has_margin) w.value(D.margin);
  else w.null();
  w.kv("tau", D.tau);
  w.kv("recommended_leaf", D.recommended_leaf);
  w.key("plans").begin_array();
  for (size_t i = 0; i < D.top_plans.size(); ++i) {
    const LaneLeaf& L = R.leaves[D.top_plans[i]];
    std::vector<Edit> all;
    for (const LaneStep& st : L.steps) all.insert(all.end(), st.edits.begin(), st.edits.end());
    std::string src = reconstruct_source(R.source, R.lexed.tokens, L.stream);
    LexResult lx = lex(src);
    ParseResult pr = parse_tokens(lx.tokens, ParseOptions{});
    w.begin_object().kv("leaf", D.top_plans[i]).kv("root_class", L.root_class).kv("valid", L.valid && pr.ok())
        .kv("total_cost", L.total_cost).kv("summary", edit_summary(all)).kv("source", src);
    w.key("edits").begin_array();
    for (const Edit& e : all) write_edit(w, e);
    w.end_array();
    w.key("tokens").begin_array();
    for (const Token& t : lx.tokens) w.value(t.lexeme);
    w.end_array();
    if (pr.ok()) {
      w.kv("ast_hash", structural_hash(pr.root));
      if (i == 0) {
        w.key("ast");
        write_ast(w, pr.root, lx.tokens, lx.eof);
      }
    }
    w.end_object();
  }
  w.end_array();
  w.end_object();

  w.key("budget").begin_object().kv("parser_invocations", R.budget.parses).kv("max_parser_invocations", R.budget.max_parses)
      .kv("elapsed_ms", R.budget.elapsed_ms()).kv("time_limit_ms", R.budget.time_limit_ms)
      .kv("exhausted", R.budget.exhausted).end_object();
  w.end_object();  // repair
  w.end_object();
  return w.str();
}

}  // namespace parallax
