int isqrt(int n) {
  if (n < 2) {
    return n;
  }
  int lo = 1;
  int hi = n;
  int ans = 1;
  while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (mid <= n / mid) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
