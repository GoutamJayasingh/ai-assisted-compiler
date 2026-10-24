// Minimal streaming JSON writer (no third-party dependency).
// Produces deterministic output: keys are written in call order.
#pragma once

#include <string>
#include <vector>

namespace parallax {

class JsonWriter {
 public:
  JsonWriter& begin_object();
  JsonWriter& end_object();
  JsonWriter& begin_array();
  JsonWriter& end_array();
  JsonWriter& key(const std::string& k);
  JsonWriter& value(const std::string& v);
  JsonWriter& value(const char* v);
  JsonWriter& value(int v);
  JsonWriter& value(long long v);
  JsonWriter& value(size_t v);
  JsonWriter& value(double v);
  JsonWriter& value(bool v);
  JsonWriter& null();
  // Inserts a pre-serialised JSON fragment as a value.
  JsonWriter& raw(const std::string& json);

  template <typename T>
  JsonWriter& kv(const std::string& k, const T& v) {
    key(k);
    return value(v);
  }
  const std::string& str() const { return out_; }

  static std::string escape(const std::string& s);  // returns quoted string

 private:
  void comma();
  std::string out_;
  std::vector<bool> first_;  // per nesting level: no element written yet
  bool after_key_ = false;
};

}  // namespace parallax
