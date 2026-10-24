int data[10];
int total = 0;

void fill(int a[], int n) {
  int i = 0;
  while (i < n) {
    a[i] = i * i;
    i = i + 1;
  }
}

int main(void) {
  fill(data, 10);
  total = data[3] + data[data[1]];
  ;
  {
    int inner = total;
    total = inner;
  }
  return total;
}
