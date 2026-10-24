// The declaration of `total` is missing its ';'.
int main() {
  int total = 0
  int i = 1;
  while (i <= 10) {
    total = total + i;
    i = i + 1;
  }
  return total;
}
