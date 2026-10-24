int values[8];

void sort(int a[], int n) {
  for (int i = 0; i < n; i = i + 1) {
    for (int j = 0; j < n - i - 1; j = j + 1) {
      if (a[j] > a[j + 1]) {
        int tmp = a[j];
        a[j] = a[j + 1];
        a[j + 1] = tmp;
      }
    }
  }
}

int main() {
  sort(values, 8);
  return values[0];
}
