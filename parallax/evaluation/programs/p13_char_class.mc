bool is_digit(char c) {
  return c >= '0' && c <= '9';
}

bool is_lower(char c) {
  return c >= 'a' && c <= 'z';
}

int classify(char c) {
  if (is_digit(c)) {
    return 1;
  } else {
    if (is_lower(c)) {
      return 2;
    }
  }
  if (c == ' ' || c == '\t' || c == '\n') {
    return 3;
  }
  return 0;
}
