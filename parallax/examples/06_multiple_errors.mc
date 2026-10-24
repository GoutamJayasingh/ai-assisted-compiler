// Two independent errors: a missing ';' and a missing ')'.
int score(int a, int b) {
  int s = a + b
  if (s > 100 {
    s = 100;
  }
  return s;
}
