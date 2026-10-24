// Typed, tagged AST for MiniC.
//
// Ownership model: every node is owned by an AstArena (a vector of
// std::unique_ptr<Node>). Tree edges (`children`) are non-owning pointers
// whose lifetime is bounded by the arena. This avoids leaks when Bison
// discards partially built subtrees during error recovery and makes the
// tree trivially movable as a whole. See docs/AST_AND_REPRESENTATIONS.md.
#pragma once

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "parallax/token.hpp"

namespace parallax {

enum class NodeKind {
  Program,      // children: Function | DeclStmt
  Function,     // attrs: type, name; children: Param..., Block (last)
  Param,        // attrs: type, name, array ("[]" or "")
  DeclStmt,     // attrs: type; children: VarDecl...
  VarDecl,      // attrs: name, array_size (may be ""); children: [init expr]
  Block,        // children: statements
  Assign,       // children: target (Ident | Index), value
  If,           // children: cond, then, [else]
  While,        // children: cond, body
  For,          // children: init|Empty, cond|Empty, update|Empty, body
  Return,       // children: [value]
  Break,
  Continue,
  ExprStmt,     // children: expr
  EmptyStmt,    // a lone ';' inside a block
  Ident,        // attrs: name
  IntLit,       // attrs: value
  FloatLit,     // attrs: value
  CharLit,      // attrs: value (source spelling, e.g. '\n')
  BoolLit,      // attrs: value ("true" / "false")
  Unary,        // attrs: op; children: operand
  Binary,       // attrs: op; children: lhs, rhs
  Call,         // attrs: name; children: args...
  Index,        // attrs: name; children: index expr
  Empty,        // absent optional clause (e.g. missing for-init)
  Error,        // placeholder produced by panic-mode recovery
};

const char* node_kind_name(NodeKind k);

struct Node {
  NodeKind kind;
  // Attributes; only those meaningful for `kind` are set (see table above).
  std::string type, name, op, value, array;
  std::vector<Node*> children;
  // Token index range [tok_begin, tok_end) in the token stream that was
  // parsed. Converted to source positions at serialisation time.
  int tok_begin = 0;
  int tok_end = 0;
};

class AstArena {
 public:
  Node* make(NodeKind k) {
    nodes_.push_back(std::make_unique<Node>());
    nodes_.back()->kind = k;
    return nodes_.back().get();
  }
  size_t size() const { return nodes_.size(); }

 private:
  std::vector<std::unique_ptr<Node>> nodes_;
};

// Canonical structural form: kinds + attributes + children, no positions, no
// formatting. Two programs are "structurally identical" iff their canonical
// strings are equal. Parentheses do not appear in the AST, so `(a)` and `a`
// are identical; an EmptyStmt does appear, so `x=1;;` differs from `x=1;`.
std::string canonical_form(const Node* n);
uint64_t fnv1a64(const std::string& s);
std::string hex64(uint64_t v);
std::string structural_hash(const Node* n);  // hex FNV-1a of canonical_form

int count_nodes(const Node* n);
int tree_depth(const Node* n);

// Readable indented tree dump (used by the CLI `--tree` and docs).
std::string pretty_tree(const Node* n);

}  // namespace parallax
