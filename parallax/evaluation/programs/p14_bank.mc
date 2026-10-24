int balance = 0;
int failures = 0;

bool withdraw(int amount) {
  if (amount <= 0 || amount > balance) {
    failures = failures + 1;
    return false;
  }
  balance = balance - amount;
  return true;
}

void deposit(int amount) {
  if (amount > 0) {
    balance = balance + amount;
  }
}

int main() {
  deposit(100);
  withdraw(30);
  withdraw(500);
  return balance - failures;
}
