int classify(int a, int b, int c) {
  if (a + b <= c || a + c <= b || b + c <= a) {
    return 0;
  }
  if (a == b && b == c) {
    return 3;
  }
  if (a == b || b == c || a == c) {
    return 2;
  }
  return 1;
}

int main() {
  int kind = classify(3, 4, 5);
  return kind;
}
