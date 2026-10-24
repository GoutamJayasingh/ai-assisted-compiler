int fib(int n) {
  if (n < 2) {
    return n;
  }
  int a = 0;
  int b = 1;
  for (int i = 2; i <= n; i = i + 1) {
    int c = a + b;
    a = b;
    b = c;
  }
  return b;
}

int main() {
  return fib(10);
}
