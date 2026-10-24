// Operator precedence and associativity
int main() {
  int a = 1 + 2 * 3;
  int b = (1 + 2) * 3;
  int c = a - b - 1;
  bool d = a < b || b <= c && !(a == c);
  float f = 1.5e3 / 2.0;
  char ch = '\n';
  return -a % 4;
}
