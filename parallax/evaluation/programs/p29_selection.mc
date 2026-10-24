void selection_sort(int a[], int n) {
  for (int i = 0; i < n - 1; i = i + 1) {
    int smallest = i;
    for (int j = i + 1; j < n; j = j + 1) {
      if (a[j] < a[smallest]) {
        smallest = j;
      }
    }
    if (smallest != i) {
      int t = a[i];
      a[i] = a[smallest];
      a[smallest] = t;
    }
  }
}
