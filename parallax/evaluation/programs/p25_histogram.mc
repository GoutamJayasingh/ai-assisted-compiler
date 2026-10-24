int samples[50];
int buckets[5];

void histogram(int n) {
  for (int b = 0; b < 5; b = b + 1) {
    buckets[b] = 0;
  }
  for (int i = 0; i < n; i = i + 1) {
    int b = samples[i] / 20;
    if (b > 4) {
      b = 4;
    }
    if (b >= 0) {
      buckets[b] = buckets[b] + 1;
    }
  }
}
