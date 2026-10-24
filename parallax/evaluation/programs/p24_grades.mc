char grade(int score) {
  if (score >= 90) {
    return 'A';
  } else {
    if (score >= 75) {
      return 'B';
    } else {
      if (score >= 50) {
        return 'C';
      }
    }
  }
  return 'F';
}

int passed(int scores[], int n) {
  int count = 0;
  for (int i = 0; i < n; i = i + 1) {
    if (grade(scores[i]) != 'F') {
      count = count + 1;
    }
  }
  return count;
}
