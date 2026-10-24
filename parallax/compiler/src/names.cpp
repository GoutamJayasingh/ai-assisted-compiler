#include "parallax/names.hpp"

#include <map>
#include <set>

namespace parallax {

namespace {

enum class SymKind { Variable, Array, Function };

class Resolver {
 public:
  std::vector<NameWarning> warnings;

  void program(const Node* p) {
    push();
    // Functions are hoisted: visible everywhere.
    for (const Node* d : p->children)
      if (d->kind == NodeKind::Function) declare(d->name, SymKind::Function, d);
    for (const Node* d : p->children) {
      if (d->kind == NodeKind::Function) function(d);
      else if (d->kind == NodeKind::DeclStmt) decl(d);
    }
    pop();
  }

 private:
  std::vector<std::map<std::string, SymKind>> scopes_;

  void push() { scopes_.emplace_back(); }
  void pop() { scopes_.pop_back(); }

  static bool placeholder(const std::string& n) { return n.rfind("__hole", 0) == 0; }

  void warn(const char* kind, const std::string& name, const std::string& msg, const Node* at) {
    NameWarning w;
    w.kind = kind;
    w.name = name;
    w.message = msg;
    w.tok_begin = at->tok_begin;
    w.tok_end = at->tok_end;
    warnings.push_back(std::move(w));
  }

  void declare(const std::string& name, SymKind k, const Node* at) {
    if (placeholder(name)) return;
    auto& scope = scopes_.back();
    if (scope.count(name)) {
      warn("duplicate", name, "'" + name + "' is declared twice in the same scope", at);
      return;
    }
    scope[name] = k;
  }

  const SymKind* lookup(const std::string& name) const {
    for (auto it = scopes_.rbegin(); it != scopes_.rend(); ++it) {
      auto f = it->find(name);
      if (f != it->end()) return &f->second;
    }
    return nullptr;
  }

  void function(const Node* f) {
    push();  // parameter scope
    const Node* body = nullptr;
    for (const Node* c : f->children) {
      if (c->kind == NodeKind::Param)
        declare(c->name, c->array.empty() ? SymKind::Variable : SymKind::Array, c);
      else
        body = c;
    }
    // The body block shares the parameter scope (C semantics: a local may
    // not redeclare a parameter at the outermost block level).
    if (body)
      for (const Node* s : body->children) stmt(s);
    pop();
  }

  void decl(const Node* d) {
    for (const Node* v : d->children) {
      for (const Node* init : v->children) expr(init);
      declare(v->name, v->array.empty() ? SymKind::Variable : SymKind::Array, v);
    }
  }

  void stmt(const Node* s) {
    switch (s->kind) {
      case NodeKind::DeclStmt: decl(s); break;
      case NodeKind::Block:
        push();
        for (const Node* c : s->children) stmt(c);
        pop();
        break;
      case NodeKind::For:
        push();
        for (size_t i = 0; i < s->children.size(); ++i) {
          const Node* c = s->children[i];
          if (i == 3) stmt(c);
          else if (c->kind == NodeKind::DeclStmt) decl(c);
          else if (c->kind == NodeKind::Assign) stmt(c);
          else if (c->kind != NodeKind::Empty) expr(c);
        }
        pop();
        break;
      case NodeKind::If:
      case NodeKind::While:
        expr(s->children[0]);
        for (size_t i = 1; i < s->children.size(); ++i) stmt(s->children[i]);
        break;
      case NodeKind::Assign:
        target(s->children[0]);
        expr(s->children[1]);
        break;
      case NodeKind::Return:
      case NodeKind::ExprStmt:
        for (const Node* c : s->children) expr(c);
        break;
      default: break;
    }
  }

  void target(const Node* t) {
    if (t->kind == NodeKind::Ident) use_var(t->name, t, false);
    else if (t->kind == NodeKind::Index) {
      use_var(t->name, t, true);
      expr(t->children[0]);
    }
  }

  void use_var(const std::string& name, const Node* at, bool indexed) {
    if (placeholder(name)) return;
    const SymKind* k = lookup(name);
    if (!k) {
      warn("undeclared", name, "'" + name + "' is used but not declared", at);
    } else if (*k == SymKind::Function) {
      warn("not-a-variable", name, "'" + name + "' is a function, not a variable", at);
    } else if (indexed && *k != SymKind::Array) {
      warn("not-an-array", name, "'" + name + "' is indexed but is not an array", at);
    }
  }

  void expr(const Node* e) {
    switch (e->kind) {
      case NodeKind::Ident: use_var(e->name, e, false); break;
      case NodeKind::Index:
        use_var(e->name, e, true);
        expr(e->children[0]);
        break;
      case NodeKind::Call: {
        if (!placeholder(e->name)) {
          const SymKind* k = lookup(e->name);
          if (!k) warn("undeclared", e->name, "function '" + e->name + "' is not defined", e);
          else if (*k != SymKind::Function)
            warn("not-a-function", e->name, "'" + e->name + "' is called but is not a function", e);
        }
        for (const Node* a : e->children) expr(a);
        break;
      }
      default:
        for (const Node* c : e->children) expr(c);
    }
  }
};

}  // namespace

std::vector<NameWarning> check_names(const Node* program) {
  Resolver r;
  if (program) r.program(program);
  return r.warnings;
}

}  // namespace parallax
