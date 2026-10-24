int queue[16];
int head = 0;
int tail = 0;
int size = 0;

bool enqueue(int v) {
  if (size == 16) {
    return false;
  }
  queue[tail] = v;
  tail = (tail + 1) % 16;
  size = size + 1;
  return true;
}

int dequeue() {
  if (size == 0) {
    return -1;
  }
  int v = queue[head];
  head = (head + 1) % 16;
  size = size - 1;
  return v;
}
