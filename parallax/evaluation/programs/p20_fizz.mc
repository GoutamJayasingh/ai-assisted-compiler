int code(int n) {
  if (n % 15 == 0) {
    return 3;
  }
  if (n % 5 == 0) {
    return 2;
  }
  if (n % 3 == 0) {
    return 1;
  }
  return 0;
}

int total(int limit) {
  int t = 0;
  for (int i = 1; i <= limit; i = i + 1) {
    t = t + code(i);
  }
  return t;
}
