int stack[32];
int top = 0;

bool push(int v) {
  if (top >= 32) {
    return false;
  }
  stack[top] = v;
  top = top + 1;
  return true;
}

int pop() {
  if (top == 0) {
    return -1;
  }
  top = top - 1;
  return stack[top];
}

int main() {
  push(4);
  push(7);
  int a = pop();
  return a * pop();
}
