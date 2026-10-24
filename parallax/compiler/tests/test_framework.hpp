// Tiny deterministic test harness (no third-party dependency).
#pragma once
#include <functional>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace pxtest {
struct Case {
  std::string name;
  std::function<void()> fn;
};
std::vector<Case>& registry();
struct Registrar {
  Registrar(const char* n, std::function<void()> f) { registry().push_back({n, std::move(f)}); }
};
struct Failure {
  std::string msg;
};
}  // namespace pxtest

#define PX_CAT2(a, b) a##b
#define PX_CAT(a, b) PX_CAT2(a, b)
#define TEST(name)                                                        \
  static void name();                                                     \
  static pxtest::Registrar PX_CAT(reg_, name)(#name, name);               \
  static void name()

#define CHECK(cond)                                                                  \
  do {                                                                               \
    if (!(cond)) {                                                                   \
      std::ostringstream os_;                                                        \
      os_ << __FILE__ << ":" << __LINE__ << ": CHECK(" #cond ") failed";             \
      throw pxtest::Failure{os_.str()};                                              \
    }                                                                                \
  } while (0)

#define CHECK_EQ(a, b)                                                               \
  do {                                                                               \
    auto va_ = (a);                                                                  \
    auto vb_ = (b);                                                                  \
    if (!(va_ == vb_)) {                                                             \
      std::ostringstream os_;                                                        \
      os_ << __FILE__ << ":" << __LINE__ << ": CHECK_EQ(" #a ", " #b ") failed: "    \
          << va_ << " != " << vb_;                                                   \
      throw pxtest::Failure{os_.str()};                                              \
    }                                                                                \
  } while (0)
