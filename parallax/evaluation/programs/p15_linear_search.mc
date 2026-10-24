int items[20];

int find(int key, int n) {
  int i = 0;
  while (i < n) {
    if (items[i] == key) {
      return i;
    }
    i = i + 1;
  }
  return -1;
}

int count(int key, int n) {
  int c = 0;
  for (int i = 0; i < n; i = i + 1) {
    if (items[i] == key) c = c + 1;
  }
  return c;
}
