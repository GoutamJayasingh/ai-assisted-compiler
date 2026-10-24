int counts[26];

int letter_index(char c) {
  if (c >= 'a' && c <= 'z') {
    return c - 'a';
  }
  return -1;
}

void tally(char text[], int n) {
  for (int i = 0; i < n; i = i + 1) {
    int k = letter_index(text[i]);
    if (k != -1) {
      counts[k] = counts[k] + 1;
    }
  }
}
