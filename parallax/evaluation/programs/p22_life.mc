int cells[16];
int next[16];

int neighbours(int i) {
  int n = 0;
  if (i > 0 && cells[i - 1] == 1) {
    n = n + 1;
  }
  if (i < 15 && cells[i + 1] == 1) {
    n = n + 1;
  }
  return n;
}

void step() {
  for (int i = 0; i < 16; i = i + 1) {
    int k = neighbours(i);
    if (k == 1) {
      next[i] = 1;
    } else {
      next[i] = 0;
    }
  }
  for (int i = 0; i < 16; i = i + 1) {
    cells[i] = next[i];
  }
}
