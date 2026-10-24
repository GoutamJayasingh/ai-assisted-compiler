#include "parallax/json.hpp"

#include <cmath>
#include <cstdio>

namespace parallax {

void JsonWriter::comma() {
  if (after_key_) {
    after_key_ = false;
    return;
  }
  if (!first_.empty()) {
    if (!first_.back()) out_ += ',';
    first_.back() = false;
  }
}

JsonWriter& JsonWriter::begin_object() {
  comma();
  out_ += '{';
  first_.push_back(true);
  return *this;
}
JsonWriter& JsonWriter::end_object() {
  out_ += '}';
  first_.pop_back();
  return *this;
}
JsonWriter& JsonWriter::begin_array() {
  comma();
  out_ += '[';
  first_.push_back(true);
  return *this;
}
JsonWriter& JsonWriter::end_array() {
  out_ += ']';
  first_.pop_back();
  return *this;
}
JsonWriter& JsonWriter::key(const std::string& k) {
  comma();
  out_ += escape(k);
  out_ += ':';
  after_key_ = true;
  return *this;
}
JsonWriter& JsonWriter::value(const std::string& v) {
  comma();
  out_ += escape(v);
  return *this;
}
JsonWriter& JsonWriter::value(const char* v) { return value(std::string(v)); }
JsonWriter& JsonWriter::value(int v) {
  comma();
  out_ += std::to_string(v);
  return *this;
}
JsonWriter& JsonWriter::value(long long v) {
  comma();
  out_ += std::to_string(v);
  return *this;
}
JsonWriter& JsonWriter::value(size_t v) {
  comma();
  out_ += std::to_string(v);
  return *this;
}
JsonWriter& JsonWriter::value(double v) {
  comma();
  if (!std::isfinite(v)) {
    out_ += "null";
    return *this;
  }
  char buf[64];
  std::snprintf(buf, sizeof buf, "%.6g", v);
  out_ += buf;
  return *this;
}
JsonWriter& JsonWriter::value(bool v) {
  comma();
  out_ += v ? "true" : "false";
  return *this;
}
JsonWriter& JsonWriter::null() {
  comma();
  out_ += "null";
  return *this;
}
JsonWriter& JsonWriter::raw(const std::string& json) {
  comma();
  out_ += json;
  return *this;
}

// Escapes a byte string as a JSON string. Invalid UTF-8 sequences are
// replaced with U+FFFD so the output is always valid JSON/UTF-8.
std::string JsonWriter::escape(const std::string& s) {
  std::string o;
  o.reserve(s.size() + 2);
  o += '"';
  const size_t n = s.size();
  for (size_t i = 0; i < n;) {
    unsigned char c = static_cast<unsigned char>(s[i]);
    if (c < 0x80) {
      switch (c) {
        case '"': o += "\\\""; break;
        case '\\': o += "\\\\"; break;
        case '\n': o += "\\n"; break;
        case '\r': o += "\\r"; break;
        case '\t': o += "\\t"; break;
        default:
          if (c < 0x20 || c == 0x7F) {
            char buf[8];
            std::snprintf(buf, sizeof buf, "\\u%04x", c);
            o += buf;
          } else {
            o += static_cast<char>(c);
          }
      }
      ++i;
      continue;
    }
    int len = (c >= 0xF0 && c <= 0xF4) ? 4 : (c >= 0xE0) ? 3 : (c >= 0xC2 && c < 0xE0) ? 2 : 0;
    bool valid = len > 0 && i + len <= n;
    for (int k = 1; valid && k < len; ++k)
      if ((static_cast<unsigned char>(s[i + k]) & 0xC0) != 0x80) valid = false;
    if (valid) {
      o.append(s, i, len);
      i += len;
    } else {
      o += "\\ufffd";
      ++i;
    }
  }
  o += '"';
  return o;
}

}  // namespace parallax
