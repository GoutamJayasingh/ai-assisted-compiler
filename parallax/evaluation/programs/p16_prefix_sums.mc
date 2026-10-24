int input[12];
int prefix[13];

void build(int n) {
  prefix[0] = 0;
  for (int i = 0; i < n; i = i + 1) {
    prefix[i + 1] = prefix[i] + input[i];
  }
}

int range_sum(int lo, int hi) {
  return prefix[hi + 1] - prefix[lo];
}

int main() {
  build(12);
  return range_sum(2, 5);
}
