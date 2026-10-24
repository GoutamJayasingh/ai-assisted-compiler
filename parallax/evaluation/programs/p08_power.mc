int power(int base, int exp) {
  int result = 1;
  while (exp > 0) {
    if (exp % 2 == 1) {
      result = result * base;
    }
    base = base * base;
    exp = exp / 2;
  }
  return result;
}

int main() {
  int p = power(2, 10);
  int q = power(3, 4);
  return p - q;
}
