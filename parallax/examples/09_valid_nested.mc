// Valid program with nested blocks, arrays, for-loops and logic.
int grid[16];

int count_even(int a[], int n) {
  int count = 0;
  for (int i = 0; i < n; i = i + 1) {
    if (a[i] % 2 == 0 && a[i] != 0) {
      count = count + 1;
    } else {
      if (!(a[i] < 0)) {
        continue;
      }
    }
  }
  return count;
}

int main() {
  for (int i = 0; i < 16; i = i + 1) {
    grid[i] = i * (i - 3);
  }
  return count_even(grid, 16);
}
