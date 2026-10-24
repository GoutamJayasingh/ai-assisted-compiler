#include "parallax/ast.hpp"

#include <algorithm>
#include <cstdio>

namespace parallax {

const char* node_kind_name(NodeKind k) {
  switch (k) {
    case NodeKind::Program: return "Program";
    case NodeKind::Function: return "Function";
    case NodeKind::Param: return "Param";
    case NodeKind::DeclStmt: return "DeclStmt";
    case NodeKind::VarDecl: return "VarDecl";
    case NodeKind::Block: return "Block";
    case NodeKind::Assign: return "Assign";
    case NodeKind::If: return "If";
    case NodeKind::While: return "While";
    case NodeKind::For: return "For";
    case NodeKind::Return: return "Return";
    case NodeKind::Break: return "Break";
    case NodeKind::Continue: return "Continue";
    case NodeKind::ExprStmt: return "ExprStmt";
    case NodeKind::EmptyStmt: return "EmptyStmt";
    case NodeKind::Ident: return "Ident";
    case NodeKind::IntLit: return "IntLit";
    case NodeKind::FloatLit: return "FloatLit";
    case NodeKind::CharLit: return "CharLit";
    case NodeKind::BoolLit: return "BoolLit";
    case NodeKind::Unary: return "Unary";
    case NodeKind::Binary: return "Binary";
    case NodeKind::Call: return "Call";
    case NodeKind::Index: return "Index";
    case NodeKind::Empty: return "Empty";
    case NodeKind::Error: return "Error";
  }
  return "?";
}

namespace {
void canon(const Node* n, std::string& out) {
  if (!n) {
    out += "null";
    return;
  }
  out += '(';
  out += node_kind_name(n->kind);
  auto attr = [&](const char* key, const std::string& v) {
    if (v.empty()) return;
    out += ' ';
    out += key;
    out += '=';
    // length-prefix values so that no attribute content can forge structure
    out += std::to_string(v.size());
    out += ':';
    out += v;
  };
  attr("type", n->type);
  attr("name", n->name);
  attr("op", n->op);
  attr("value", n->value);
  attr("array", n->array);
  for (const Node* c : n->children) {
    out += ' ';
    canon(c, out);
  }
  out += ')';
}

void pretty(const Node* n, int depth, std::string& out) {
  out.append(static_cast<size_t>(depth) * 2, ' ');
  out += node_kind_name(n->kind);
  auto attr = [&](const char* key, const std::string& v) {
    if (v.empty()) return;
    out += ' ';
    out += key;
    out += '=';
    out += v;
  };
  attr("type", n->type);
  attr("name", n->name);
  attr("op", n->op);
  attr("value", n->value);
  attr("array", n->array);
  out += '\n';
  for (const Node* c : n->children) pretty(c, depth + 1, out);
}
}  // namespace

std::string canonical_form(const Node* n) {
  std::string out;
  canon(n, out);
  return out;
}

uint64_t fnv1a64(const std::string& s) {
  uint64_t h = 1469598103934665603ULL;
  for (unsigned char c : s) {
    h ^= c;
    h *= 1099511628211ULL;
  }
  return h;
}

std::string hex64(uint64_t v) {
  char buf[17];
  std::snprintf(buf, sizeof buf, "%016llx", static_cast<unsigned long long>(v));
  return buf;
}

std::string structural_hash(const Node* n) { return hex64(fnv1a64(canonical_form(n))); }

int count_nodes(const Node* n) {
  if (!n) return 0;
  int c = 1;
  for (const Node* ch : n->children) c += count_nodes(ch);
  return c;
}

int tree_depth(const Node* n) {
  if (!n) return 0;
  int d = 0;
  for (const Node* ch : n->children) d = std::max(d, tree_depth(ch));
  return d + 1;
}

std::string pretty_tree(const Node* n) {
  std::string out;
  if (n) pretty(n, 0, out);
  return out;
}

}  // namespace parallax
