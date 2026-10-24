int count_digits(int n) {
  if (n == 0) {
    return 1;
  }
  int count = 0;
  while (n > 0) {
    n = n / 10;
    count = count + 1;
  }
  return count;
}

int reverse(int n) {
  int r = 0;
  while (n > 0) {
    r = r * 10 + n % 10;
    n = n / 10;
  }
  return r;
}

bool is_palindrome(int n) {
  return reverse(n) == n;
}
