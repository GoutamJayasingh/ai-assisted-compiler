int gcd(int a, int b) {
  while (b != 0) {
    int t = b;
    b = a % b;
    a = t;
  }
  return a;
}

int lcm(int a, int b) {
  return a / gcd(a, b) * b;
}

int main() {
  int x = gcd(48, 18);
  int y = lcm(4, 6);
  return x + y;
}
