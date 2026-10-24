int m[9];

int at(int r, int c) {
  return m[r * 3 + c];
}

int trace() {
  int t = 0;
  for (int i = 0; i < 3; i = i + 1) {
    t = t + at(i, i);
  }
  return t;
}

int determinant() {
  int a = at(0, 0) * (at(1, 1) * at(2, 2) - at(1, 2) * at(2, 1));
  int b = at(0, 1) * (at(1, 0) * at(2, 2) - at(1, 2) * at(2, 0));
  int c = at(0, 2) * (at(1, 0) * at(2, 1) - at(1, 1) * at(2, 0));
  return a - b + c;
}
