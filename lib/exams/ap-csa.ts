// The AP Computer Science A exam (Java) as a reference for the guide prompts:
// Section I multiple choice (40 items, four options, code tracing and
// code-completion) and Section II free response (four "write the method /
// write the class" questions scored by rubric points). The 2025 course's four
// units are the four domains.
//
// Code travels in a ```java fence directly under the question line (the quiz
// parser keeps it as the question's passage, shown as a code block),
// so indentation survives.

import type { ExamProfile } from './types'

export const AP_CSA: ExamProfile = {
  id: 'ap-csa',
  pace: 135,
  name: 'the AP Computer Science A exam',
  detect: {
    exam: /\bAP\s+(?:Computer\s+Science\s+A|CS\s*A|CSA)\b/i,
    exclude: /\bprinciples\b|\bCSP\b/i,
    subjectHints: /./,
    subjects: ['computer-science', 'mathematics'],
    explicit: /\bAP\s+(?:Computer\s+Science\s+A|CS\s*A|CSA)\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly four options A-D, as on Section I. Every item is about Java code: the code goes in a \`\`\`java fence directly under the question line, indented as a Java programmer would write it. Keep segments short (3-12 lines). Never put code in a passage fence or in the question sentence. No true/false, no "I, II and III" lists.
- Stems are the exam's: "What is printed as a result of executing the following code segment?", "Consider the following method. What value is returned by the call ...?", "Which of the following code segments can be used to replace /* missing code */ so that the method works as intended?", "Which of the following best describes the behavior of the method?", "Assume that the ArrayList list has been declared and initialized ... What is the result of the following code?", "Which of the following statements compiles without error?". For replacement items the four options are code, written inline in the option (short) with the same spacing the exam uses.
- Only the Java subset the course uses: int, double, boolean, String and its methods (length, substring, indexOf, equals, compareTo), Math (abs, pow, sqrt, random), Integer/Double wrapper classes, if/else, while, for, enhanced for, arrays, 2D arrays, ArrayList (add, get, set, remove, size), classes with constructors, accessors, mutators, static members, this, inheritance (extends, super, overriding), polymorphism, interfaces are NOT in the 2025 course, recursion. Integer division, String immutability, off-by-one bounds, aliasing of object references and ArrayList index shifts after remove are the exam's favorite traps.
- Free-response items are SA_QUESTION, one per part, in the exam's form: the class or method header and its precondition/postcondition as the exam gives them, then "Write the method ... " or "Write the complete class ...". The Sample Answer is a correct Java implementation (one statement per line) followed by the rubric points the exam awards (e.g. "1 point: loops over every element of the array; 1 point: compares each element to the limit; 1 point: counts and returns the number"), and a note on what loses the point (an index out of bounds, returning inside the loop).
- Trace every code segment to its actual output before writing the key; the explanation walks the values ("k takes 1, 4, 7, 10, so sum is 22"). Never leave a note or a second attempt in the explanation.
- Explanations stay short: the trace and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'objects-methods',
      name: 'Unit 1: Using objects and methods',
      share: 'about 15-25% of the test',
      detect: /\b(unit 1\b|primitive|int\b|double\b|boolean|variable|assignment|cast\w*|integer division|modul\w*|String method\w*|substring|indexOf|\.length\(\)|compareTo|equals|Math\.\w+|Math class|wrapper|Integer\.|Double\.|method call|parameter|return type|object reference|constructor call|static method)\b/i,
      skills: [
        'Primitive types and expressions: int and double arithmetic, integer division and modulus, casting, compound assignment, overflow at Integer.MAX_VALUE',
        'Calling methods on objects and classes: constructors, void vs non-void methods, parameters and return values, static methods of Math (abs, pow, sqrt, random)',
        'String methods (length, substring, indexOf, equals, compareTo), String immutability and concatenation with numbers',
        'Wrapper classes Integer and Double, autoboxing, Integer.MAX_VALUE and MIN_VALUE',
      ],
      hard: [
        'Mixed int and double expressions where one cast or one integer division changes the result',
        'substring and indexOf bounds (end index exclusive, -1 when not found) chained in one expression',
        'String concatenation evaluated left to right, so "1" + 2 + 3 differs from 1 + 2 + "3"',
        'A method called on a reference that was reassigned (aliasing) or on a String that was never changed (immutability)',
      ],
      traps: ['7 / 2 read as 3.5', 'substring(3, 5) read as three characters', 'a String method expected to change the String', 'Math.random() * 10 read as 1 to 10'],
      exemplars: [
        `MC_QUESTION: What is printed as a result of executing the following code segment?
\`\`\`java
int a = 7;
int b = 2;
double c = a / b;
System.out.print(c);
\`\`\`
A) 3
B) 3.0
C) 3.5
D) 4.0
Correct Answer: B
Explanation: a / b is integer division because both operands are int, giving 3; the 3 is then widened to the double 3.0 when stored in c. Choice C would need a cast, such as (double) a / b.`,
        `MC_QUESTION: What is printed as a result of executing the following code segment?
\`\`\`java
String s = "computer";
System.out.print(s.substring(3, 5) + s.indexOf("t"));
\`\`\`
A) pu5
B) put5
C) pu6
D) mpu5
Correct Answer: A
Explanation: substring(3, 5) takes the characters at indexes 3 and 4, "pu" (the end index is excluded), and indexOf("t") is 5 because indexes start at 0. The concatenation prints pu5.`,
      ],
    },
    {
      id: 'selection-iteration',
      name: 'Unit 2: Selection and iteration',
      share: 'about 25-35% of the test',
      detect: /\b(unit 2\b|if\b|else|boolean expression|compound boolean|De Morgan|short[- ]circuit|while loop|for loop|nested loop\w*|iteration|loop\w*|String algorithm\w*|count\w* (?:the )?vowel\w*|reverse\w* (?:a |the )?string|palindrome|accumulat\w*|trace|output|printed)\b/i,
      skills: [
        'if, if/else, and else if chains; compound boolean expressions, De Morgan\'s laws, short-circuit evaluation; comparing objects with equals vs ==',
        'while and for loops, loop bounds and off-by-one errors, break-free loop design, nested loops and how many times the inner body runs',
        'Standard algorithms on Strings and numbers: counting, summing, finding a max or min, reversing a String, checking a palindrome, digit extraction with % and /',
        'Tracing code to its exact output, including spacing and line breaks',
      ],
      hard: [
        'A loop whose step is not 1 (k += 3) or whose bound is checked after an update inside the body',
        'Nested loops where the inner bound depends on the outer variable, counted exactly',
        'Equivalent code: which of four segments produces the same output as the given one, with one differing on an edge case (empty String, negative number)',
        'A boolean expression simplified with De Morgan\'s laws, where one option flips the wrong operator',
      ],
      traps: ['an off-by-one bound (<= vs <)', '== used to compare Strings', 'the inner loop counted as if it always ran the same number of times', 'a statement outside the loop body read as inside it'],
      exemplars: [
        `MC_QUESTION: What is printed as a result of executing the following code segment?
\`\`\`java
int sum = 0;
for (int k = 1; k <= 10; k += 3)
{
  sum += k;
}
System.out.print(sum);
\`\`\`
A) 19
B) 22
C) 25
D) 12
Correct Answer: B
Explanation: k takes the values 1, 4, 7 and 10 (10 satisfies k <= 10), so sum is 1 + 4 + 7 + 10 = 22. Choice D stops at 7 and choice A misses the 3 added by the step from 1 to 4.`,
        `MC_QUESTION: What is printed as a result of executing the following code segment?
\`\`\`java
for (int i = 1; i <= 3; i++)
{
  for (int j = i; j <= 3; j++)
  {
    System.out.print(j);
  }
  System.out.print(" ");
}
\`\`\`
A) 123 23 3
B) 1 12 123
C) 111 222 333
D) 321 32 3
Correct Answer: A
Explanation: The inner loop starts at the current i, so it prints 123, then 23, then 3, with a space after each outer pass. Choice B is what you get when the inner loop runs from 1 to i instead.`,
      ],
    },
    {
      id: 'class-creation',
      name: 'Unit 3: Class creation',
      share: 'about 15-25% of the test',
      detect: /\b(unit 3\b|class\w*|constructor\w*|accessor\w*|getter\w*|mutator\w*|setter\w*|instance variable\w*|field\w*|private|public|static (?:variable|field|count)|this\b|scope|encapsulat\w*|toString|write (?:a|the) class|design a class|object\w* state)\b/i,
      skills: [
        'Writing a class: private instance variables, constructors (including overloaded ones), accessor and mutator methods, toString, and the this keyword',
        'Static variables and methods shared by every object of the class vs instance data owned by one object',
        'Scope and lifetime of local variables, parameters and instance variables; passing object references into methods (the method can change the object, not the caller\'s variable)',
        'Reading a class and predicting the result of a sequence of constructor calls and method calls on two or more objects',
      ],
      hard: [
        'A static counter updated by two objects, where the question asks for the shared total or for one object\'s own value',
        'A mutator that changes a parameter object vs one that reassigns the parameter (the caller sees only the first)',
        'A constructor that shadows an instance variable by leaving out this, so the field stays at its default',
        'Which of four class designs keeps the data private and still lets the client do what the specification asks',
      ],
      traps: ['a static variable read as per object', 'a local variable with the same name as a field assumed to set the field', 'a reference parameter reassigned inside a method expected to change the caller\'s variable', 'calling a non-static method without an object'],
      exemplars: [
        `MC_QUESTION: Consider the following class and code segment. What is printed as a result of executing the code segment?
\`\`\`java
public class Counter
{
  private int count;
  private static int total = 0;
  public Counter() { count = 0; }
  public void add(int n) { count += n; total += n; }
  public static int getTotal() { return total; }
}
Counter a = new Counter();
Counter b = new Counter();
a.add(3);
b.add(5);
a.add(2);
System.out.print(Counter.getTotal());
\`\`\`
A) 10
B) 5
C) 2
D) 0
Correct Answer: A
Explanation: total is static, so every call to add on any Counter adds to the same variable: 3 + 5 + 2 = 10. Choice B is a's own count (5), which is instance data, not the shared total.`,
        `SA_QUESTION: The class Inventory keeps an array of item counts. Write the method countAbove, which returns the number of elements of vals that are strictly greater than limit.
\`\`\`java
/** @param vals an array of item counts; vals.length > 0
  * @param limit a threshold
  * @return the number of elements of vals that are greater than limit */
public int countAbove(int[] vals, int limit)
\`\`\`
Sample Answer: public int countAbove(int[] vals, int limit) { int count = 0; for (int v : vals) { if (v > limit) { count++; } } return count; } Rubric: 1 point for a loop that visits every element of vals (an enhanced for or an index loop from 0 to vals.length - 1); 1 point for comparing each element to limit with > (>= loses the point, since the specification says strictly greater); 1 point for counting the matches and returning the count after the loop (returning inside the loop, or returning a boolean, earns nothing for this point).`,
      ],
    },
    {
      id: 'data-collections',
      name: 'Unit 4: Data collections (arrays, ArrayList, 2D arrays, algorithms, recursion, inheritance)',
      share: 'about 30-40% of the test',
      detect: /\b(unit 4\b|array\w*|ArrayList|2D|two[- ]dimensional|row[- ]major|traversal|linear search|sequential search|binary search|selection sort|insertion sort|merge sort|sort\w*|recursion|recursive|base case|inherit\w*|extends|super\b|superclass|subclass|overrid\w*|polymorph\w*|Object class|abstract)\b/i,
      skills: [
        'Arrays and ArrayList: traversals, inserting and removing while iterating (indexes shift after remove), enhanced for limits, standard algorithms (max, sum, count, reverse, shift, duplicates)',
        '2D arrays in row-major order, nested traversals, row and column sums, the bounds arr.length and arr[0].length',
        'Searching and sorting: linear and binary search (iterations and midpoints), selection, insertion and merge sort (which elements are swapped or compared after a given pass)',
        'Recursion: tracing recursive calls to a value, identifying the base case, recursive String and array methods',
        'Inheritance and polymorphism: extends, super calls in constructors, overriding, which version of a method runs when a superclass reference points to a subclass object',
      ],
      hard: [
        'An ArrayList remove inside a forward loop that skips the element after each removal, traced to the final list',
        'A recursive method that returns a value built from two calls, or that works on a String by index, traced for a specific argument',
        'The state of an array after exactly two passes of selection or insertion sort',
        'Polymorphism where a superclass reference calls an overridden method that itself calls another method the subclass overrides',
        '2D array traversal where rows and columns are swapped in one option',
      ],
      traps: ['arr.length used as the last index', 'remove shifting later elements and the loop skipping one', 'a recursive call traced one level short', 'the declared type rather than the object type deciding which method runs', 'arr[r][c] read with r as the column'],
      exemplars: [
        `MC_QUESTION: What is printed as a result of executing the following code segment?
\`\`\`java
int[] nums = {4, 8, 15, 16, 23};
int x = 0;
for (int i = 1; i < nums.length; i++)
{
  if (nums[i] - nums[i - 1] > x)
  {
    x = nums[i] - nums[i - 1];
  }
}
System.out.print(x);
\`\`\`
A) 1
B) 23
C) 7
D) 4
Correct Answer: C
Explanation: The loop finds the largest gap between neighbors: the differences are 4, 7, 1 and 7, so x ends at 7. Choice B is the largest element, not the largest difference.`,
        `MC_QUESTION: Consider the following method. What value is returned by the call mystery(7)?
\`\`\`java
public static int mystery(int n)
{
  if (n <= 1)
  {
    return 1;
  }
  return n + mystery(n - 2);
}
\`\`\`
A) 28
B) 16
C) 12
D) 15
Correct Answer: B
Explanation: mystery(7) = 7 + mystery(5) = 7 + 5 + mystery(3) = 7 + 5 + 3 + mystery(1) = 7 + 5 + 3 + 1 = 16. Choice A adds every integer from 1 to 7 instead of every other one.`,
        `MC_QUESTION: Assume that list has been declared as an ArrayList of Integer and is initially empty. What is printed as a result of executing the following code segment?
\`\`\`java
list.add(5);
list.add(9);
list.add(1, 7);
list.remove(0);
list.set(1, 3);
System.out.print(list);
\`\`\`
A) [7, 3]
B) [5, 3, 9]
C) [7, 9, 3]
D) [3, 9]
Correct Answer: A
Explanation: The list goes [5], [5, 9], [5, 7, 9] after inserting 7 at index 1, [7, 9] after removing index 0, and [7, 3] after set(1, 3) replaces the 9. Choice B forgets that remove(0) removes an element and set replaces one.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the one-line recall items. At most 1 item in 8 that easy, never first in a section; about half typical (one loop or one class traced) and at least a third of the kind under WHAT HARD LOOKS LIKE (nested loops with dependent bounds, recursion with two calls, ArrayList removal during traversal, polymorphic calls). Free-response parts should need a full method, not a single statement.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: traces that hinge on one off-by-one bound, integer division or aliasing; recursion returning a value built from the calls; sorting state after a given pass; polymorphism through an overridden helper; "which replacement works for every input" items where one option fails only on an edge case. Hard never means Java features outside the course.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one idea each (one loop, one String method, one constructor), in the exam's voice, with short code. Still real exam items.`,
  },
}
