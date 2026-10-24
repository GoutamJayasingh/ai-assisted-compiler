// A small, valid MiniC program: functions, loops and arithmetic.
int factorial(int n) {
  int result = 1;
  while (n > 1) {
    result = result * n;
    n = n - 1;
  }
  return result;
}

int main() {
  int x = factorial(5);
  return x;
}
