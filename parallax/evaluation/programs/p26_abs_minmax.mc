int abs(int x) {
  if (x < 0) {
    return -x;
  }
  return x;
}

int min(int a, int b) {
  if (a < b) {
    return a;
  }
  return b;
}

int max(int a, int b) {
  if (a > b) {
    return a;
  }
  return b;
}

int distance(int a, int b) {
  return abs(max(a, b) - min(a, b));
}
