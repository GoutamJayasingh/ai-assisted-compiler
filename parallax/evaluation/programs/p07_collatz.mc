int steps(int n) {
  int count = 0;
  while (n != 1) {
    if (n % 2 == 0) {
      n = n / 2;
    } else {
      n = 3 * n + 1;
    }
    count = count + 1;
  }
  return count;
}

int longest(int limit) {
  int best = 0;
  int best_n = 1;
  for (int n = 1; n < limit; n = n + 1) {
    int s = steps(n);
    if (s > best) {
      best = s;
      best_n = n;
    }
  }
  return best_n;
}
