float compound(float principal, float rate, int years) {
  float amount = principal;
  int y = 0;
  while (y < years) {
    amount = amount * (1.0 + rate);
    y = y + 1;
  }
  return amount;
}

bool doubles(float rate) {
  float a = compound(1.0, rate, 10);
  return a >= 2.0;
}
