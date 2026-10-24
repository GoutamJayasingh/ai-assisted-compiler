#include <cstring>

#include "test_framework.hpp"

namespace pxtest {
std::vector<Case>& registry() {
  static std::vector<Case> r;
  return r;
}
}  // namespace pxtest

int main(int argc, char** argv) {
  const char* filter = argc > 1 ? argv[1] : nullptr;
  int passed = 0, failed = 0;
  for (const auto& c : pxtest::registry()) {
    if (filter && !std::strstr(c.name.c_str(), filter)) continue;
    try {
      c.fn();
      ++passed;
    } catch (const pxtest::Failure& f) {
      ++failed;
      std::cout << "FAIL " << c.name << "\n  " << f.msg << "\n";
    } catch (const std::exception& e) {
      ++failed;
      std::cout << "FAIL " << c.name << "\n  exception: " << e.what() << "\n";
    }
  }
  std::cout << passed << " passed, " << failed << " failed\n";
  return failed ? 1 : 0;
}
