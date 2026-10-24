bool in_range(int v, int lo, int hi) {
  return v >= lo && v <= hi;
}

bool valid_date(int d, int m, int y) {
  if (!in_range(m, 1, 12)) {
    return false;
  }
  if (!in_range(d, 1, 31)) {
    return false;
  }
  return y > 0;
}

int main() {
  bool ok = valid_date(29, 2, 2024);
  if (ok) {
    return 0;
  }
  return 1;
}
