bool is_prime(int n) {
  if (n < 2) {
    return false;
  }
  int d = 2;
  while (d * d <= n) {
    if (n % d == 0) {
      return false;
    }
    d = d + 1;
  }
  return true;
}

int count_primes(int limit) {
  int count = 0;
  for (int i = 0; i < limit; i = i + 1) {
    if (is_prime(i)) {
      count = count + 1;
    }
  }
  return count;
}
