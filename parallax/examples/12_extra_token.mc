// A duplicated ')' after a call.
int twice(int x) {
  return x * 2;
}

int main() {
  int y = twice(4));
  return y;
}
