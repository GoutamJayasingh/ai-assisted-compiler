int data[10];

int sum(int a[], int n) {
  int s = 0;
  for (int i = 0; i < n; i = i + 1) {
    s = s + a[i];
  }
  return s;
}

int max_of(int a[], int n) {
  int m = a[0];
  for (int i = 1; i < n; i = i + 1) {
    if (a[i] > m) {
      m = a[i];
    }
  }
  return m;
}

float average(int a[], int n) {
  return sum(a, n) / 1.0 / n;
}
