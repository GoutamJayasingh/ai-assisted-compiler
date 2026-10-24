float to_fahrenheit(float c) {
  return c * 9.0 / 5.0 + 32.0;
}

float to_celsius(float f) {
  return (f - 32.0) * 5.0 / 9.0;
}

int main() {
  float boiling = to_fahrenheit(100.0);
  float body = to_celsius(98.6);
  bool hot = boiling > 200.0 && body > 36.0;
  if (hot) {
    return 1;
  }
  return 0;
}
