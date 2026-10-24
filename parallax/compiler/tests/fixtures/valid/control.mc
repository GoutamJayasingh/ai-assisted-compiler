int abs(int x) {
  if (x < 0)
    return -x;
  else
    return x;
}

int sum_to(int n) {
  int s = 0;
  for (int i = 0; i < n; i = i + 1) {
    if (i % 2 == 0) continue;
    s = s + i;
  }
  while (true) {
    break;
  }
  for (;;) { break; }
  return s;
}
