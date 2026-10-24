int best_sum(int a[], int n) {
  int best = a[0];
  int current = a[0];
  for (int i = 1; i < n; i = i + 1) {
    if (current < 0) {
      current = a[i];
    } else {
      current = current + a[i];
    }
    if (current > best) {
      best = current;
    }
  }
  return best;
}
