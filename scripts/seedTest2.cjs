/**
 * Seed "TEST 2" with 14 C programming questions into Firestore using firebase-admin.
 * 
 * This uses the Google Application Default Credentials (ADC).
 * Before running:
 *   1. Install gcloud CLI and run: gcloud auth application-default login
 *   OR
 *   2. Place a serviceAccountKey.json in scripts/ folder
 *   OR
 *   3. Run: set GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
 *
 * Usage: node scripts/seedTest2.cjs
 */

const fs = require('fs');
const path = require('path');

async function main() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    console.error("firebase-admin is not installed. Run 'npm i -D firebase-admin'.");
    process.exit(1);
  }

  // Try service account key first, then fall back to ADC
  const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Using service account key');
  } else {
    // Try Application Default Credentials (gcloud auth)
    try {
      admin.initializeApp({
        projectId: 'futurecodeai-f7dab',
      });
      console.log('✅ Using Application Default Credentials');
    } catch (e) {
      console.error(`
❌ No service account key found at ${keyPath} and ADC not available.

To fix this, do ONE of the following:
  1. Download your service account key from:
     Firebase Console -> Project Settings -> Service Accounts -> "Generate new private key"
     Save it as: scripts/serviceAccountKey.json

  2. Install gcloud CLI and run:
     gcloud auth application-default login

  3. Set environment variable:
     set GOOGLE_APPLICATION_CREDENTIALS=path/to/your/key.json
`);
      process.exit(1);
    }
  }

  const db = admin.firestore();

  console.log('🚀 Creating TEST 2...');

  // ── MCQ questions (Predict the Output) ──────────────────────────
  const mcqQuestions = [
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 5;
    int b = a++ + a++ + ++a;
    printf("%d %d", a, b);
    return 0;
}
\`\`\``,
      options: ['8 19', '8 22', '7 18', '8 21'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int x = 10, y = 5, z;
    z = x++ - --y + x-- + --y;
    printf("%d %d %d", x, y, z);
    return 0;
}
\`\`\``,
      options: ['10 3 20', '10 4 18', '11 3 20', '10 3 18'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = -1;
    unsigned int b = 1;
    if (a < b)
        printf("a is less than b");
    else
        printf("a is greater than b");
    return 0;
}
\`\`\``,
      options: ['a is greater than b', 'a is less than b', 'Compilation Error', 'Undefined Behavior'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 6;
    printf("%d", ~a);
    printf(" %d", ~a + 1);
    return 0;
}
\`\`\``,
      options: ['-7 -6', '-6 -5', '-7 -7', '7 8'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 5, b = 3, c = 2;
    int result = a > b > c;
    printf("%d", result);
    return 0;
}
\`\`\``,
      options: ['0', '1', 'Compilation Error', 'Undefined Behavior'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int x = 4;
    x <<= 2;
    x |= 3;
    x &= 12;
    x ^= 5;
    printf("%d", x);
    return 0;
}
\`\`\``,
      options: ['5', '7', '9', '12'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 3, b = 4, c;
    c = (a++, b++, a + b);
    printf("%d %d %d", a, b, c);
    return 0;
}
\`\`\``,
      options: ['4 5 9', '3 4 7', '4 5 7', '3 4 9'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 10, b = 20, c = 30;
    int max = a > b ? (a > c ? a : c) : (b > c ? b : c);
    printf("%d", max);
    return 0;
}
\`\`\``,
      options: ['30', '20', '10', 'Compilation Error'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 5, b = 0, c = 10;
    printf("%d ", a && b++ && c);
    printf("%d", b);
    return 0;
}
\`\`\``,
      options: ['0 1', '0 0', '1 1', '1 0'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 12, b = 25;
    int result = (a & b) + (a | b) - (a ^ b);
    printf("%d", result);
    return 0;
}
\`\`\``,
      options: ['16', '37', '8', '21'],
      correctAnswers: [0],
      marks: 2,
    },
    {
      questionText:
`Predict the output:
\`\`\`c
#include <stdio.h>
int main() {
    int a = 5;
    printf("%d\\n", a << 2);
    printf("%d\\n", a >> 1);
    return 0;
}
\`\`\``,
      options: ['20 then 2', '10 then 2', '20 then 3', '10 then 1'],
      correctAnswers: [0],
      marks: 2,
    },
  ];

  // ── Coding questions (Write a Program) ──────────────────────────
  const codingQuestions = [
    {
      problemStatement:
`**WAP to Swap Two Numbers Without Using a Third Variable**

Write a C program that takes two integer values from the user and swaps them without using any temporary/third variable.

**Example:**
- Input: a = 5, b = 10
- Output: a = 10, b = 5

**Hint:** You can use arithmetic operators (+, -).`,
      sampleInput: '5 10',
      sampleOutput: 'Before Swap: a = 5, b = 10\nAfter Swap: a = 10, b = 5',
      expectedOutput: 'a = 10, b = 5',
      language: 'c',
      marks: 5,
    },
    {
      problemStatement:
`**WAP to Find the Maximum of Four Numbers**

Write a C program that takes four integer values from the user and prints the maximum among all four.

**Example:**
- Input: 12 45 7 33
- Output: Maximum = 45

Use nested if-else or ternary operators.`,
      sampleInput: '12 45 7 33',
      sampleOutput: 'Maximum = 45',
      expectedOutput: '45',
      language: 'c',
      marks: 5,
    },
    {
      problemStatement:
`**WAP to Swap Two Numbers Using XOR**

Write a C program that takes two integer values from the user and swaps them using only XOR (^) bitwise operator. Do not use any third variable or arithmetic operators.

**Example:**
- Input: a = 7, b = 3
- Output: a = 3, b = 7

**Approach:**
\`\`\`
a = a ^ b
b = a ^ b
a = a ^ b
\`\`\``,
      sampleInput: '7 3',
      sampleOutput: 'Before Swap: a = 7, b = 3\nAfter Swap: a = 3, b = 7',
      expectedOutput: 'a = 3, b = 7',
      language: 'c',
      marks: 5,
    },
  ];

  const totalMcqMarks = mcqQuestions.reduce((s, q) => s + q.marks, 0);
  const totalCodingMarks = codingQuestions.reduce((s, q) => s + q.marks, 0);
  const totalMarks = totalMcqMarks + totalCodingMarks;
  const totalQuestions = mcqQuestions.length + codingQuestions.length;

  // 1. Create the test document
  const testRef = db.collection('tests').doc();
  await testRef.set({
    title: 'TEST 2',
    description: 'C Programming – Predict the Output & Write a Program (Operators, Bitwise, Expressions)',
    type: 'mixed',
    durationMinutes: 60,
    passPercentage: 40,
    maxAttempts: 1,
    courseId: '',
    courseName: '',
    startDate: null,
    endDate: null,
    isActive: true,
    totalMarks,
    questionsCount: totalQuestions,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const testId = testRef.id;
  console.log(`✅ Test created with ID: ${testId}`);

  // 2. Add MCQ questions
  let order = 1;
  const batch1 = db.batch();
  for (const q of mcqQuestions) {
    const qRef = db.collection('tests').doc(testId).collection('questions').doc();
    batch1.set(qRef, {
      type: 'mcq',
      questionText: q.questionText,
      options: q.options,
      correctAnswers: q.correctAnswers,
      marks: q.marks,
      order: order++,
    });
  }
  await batch1.commit();
  console.log(`   📝 ${mcqQuestions.length} MCQ questions added`);

  // 3. Add Coding questions
  const batch2 = db.batch();
  for (const q of codingQuestions) {
    const qRef = db.collection('tests').doc(testId).collection('questions').doc();
    batch2.set(qRef, {
      type: 'coding',
      problemStatement: q.problemStatement,
      sampleInput: q.sampleInput,
      sampleOutput: q.sampleOutput,
      expectedOutput: q.expectedOutput,
      language: q.language,
      marks: q.marks,
      order: order++,
    });
  }
  await batch2.commit();
  console.log(`   💻 ${codingQuestions.length} Coding questions added`);

  console.log(`\n🎉 Done! TEST 2 created with ${totalQuestions} questions (${totalMarks} total marks)`);
  console.log(`   • ${mcqQuestions.length} MCQ (Predict the Output) — ${totalMcqMarks} marks`);
  console.log(`   • ${codingQuestions.length} Coding (Write a Program) — ${totalCodingMarks} marks`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
