int search(int a[], int n, int key) {
  int lo = 0;
  int hi = n - 1;
  while (lo <= hi) {
    int mid = (lo + hi) / 2;
    if (a[mid] == key) {
      return mid;
    } else {
      if (a[mid] < key) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }
  return -1;
}
