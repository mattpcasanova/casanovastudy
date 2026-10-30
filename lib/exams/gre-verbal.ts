// The GRE General Test's Verbal Reasoning section (the shorter test since
// September 2023: two sections, 27 items in 41 minutes, scored 130-170) as a
// reference for the guide prompts: Text Completion, Sentence Equivalence,
// Reading Comprehension (with Critical Reasoning items) and, for the writing
// measure, the Analytical Writing Issue task.

import type { ExamProfile } from './types'
import { GRE_NAME } from './gre-quant'

export const GRE_VERBAL: ExamProfile = {
  id: 'gre-verbal',
  pace: 91,
  name: 'the GRE Verbal Reasoning section',
  detect: {
    exam: GRE_NAME,
    exclude: /\b(quant\w*|math\w*|arithmetic|algebra|geometry)\b/i,
    subjectHints: /\b(verbal|reading|text completion|sentence equivalence|vocab\w*|passage|critical reasoning|analytical writing|essay|issue task)\b/i,
    subjects: ['english'],
    explicit: /\bGRE\s+(?:verbal|reading|vocab\w*|text completion|sentence equivalence)\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- The section's mix, roughly: a third Text Completion, a fifth Sentence Equivalence, the rest Reading Comprehension including one or two Critical Reasoning items. No true/false, no "I, II and III" lists, no "explain why" items, no vocabulary-definition items ("what does laconic mean?"): every word is tested in a sentence.
- Text Completion: the sentence or short paragraph goes in a \`\`\`passage fence directly under the question line, with each blank written as ______ and, when there is more than one blank, labelled "(i) ______" and "(ii) ______". A one-blank item is one MC_QUESTION with exactly five options A-E, single words or short phrases. A two- or three-blank item is written as one MC_QUESTION PER BLANK, each repeating the whole passage, with the stem "Select the word that best fits Blank (i)." and exactly three options A-C for that blank, as on the test. The right word is fixed by a structural clue in the text (a contrast word, a colon, a definition, a parallel), never by vocabulary alone; wrong options are real words of the right part of speech that fit the sentence's grammar but not its logic, including one that is the opposite of what is needed.
- Sentence Equivalence: one sentence with one ______ in a passage fence; the stem is "Select the two answer choices that, when used to complete the sentence, fit the meaning of the sentence as a whole and produce completed sentences that are alike in meaning." Written as one MC_QUESTION with exactly five options A-E, each option a PAIR of words joined by "and" ("A) ephemeral and fleeting"); exactly one pair consists of two words that both fit and mean the same, and at least two wrong pairs contain one word that fits (the trap: one right word with a non-synonym).
- Reading Comprehension: a passage of one to five paragraphs (80-450 words) in a \`\`\`passage fence under each item that uses it, written by you in the register of the test's sources (humanities, social science, natural science, business; a scholarly, argumentative voice; never a real author's text or a real named person's invented words). Stems are the test's: "The primary purpose of the passage is to", "It can be inferred from the passage that the author would most likely agree with which of the following?", "The author mentions ... primarily in order to", "Which of the following best describes the function of the sentence [[in brackets]]?", "The author's attitude toward ... can best be described as". Exactly five options A-E. A "select all that apply" item is written as a single-answer item; a "select the sentence" item asks which sentence does the job and offers sentences as options.
- Critical Reasoning: a short argument (40-110 words) in a passage fence; stems: "Which of the following, if true, most seriously weakens/strengthens the argument?", "The argument depends on which of the following assumptions?", "Which of the following, if true, best explains the discrepancy?", "Which of the following can be properly inferred?" Five options; the right one bears on the link between evidence and conclusion, the wrong ones are true-sounding but off the link.
- Analytical Writing (the Issue task) appears only as SA_QUESTION: an Issue prompt in the test's form ("Claim: ... Reason: ... Write a response in which you discuss the extent to which you agree or disagree with the claim and the reason on which it is based.") followed by a bounded task: "Write a thesis and your first body paragraph." or "Plan the essay: your position, two supporting arguments with examples, and one consideration that complicates your position." The Sample Answer gives a model response to the bounded task and the 6-point holistic guide (6: insightful, well-supported position that addresses complexity; 4: clear position with adequate support; 2: unclear position or little support), with what loses points (ignoring the reason, no examples, one-sided).
- Vocabulary is at the test's level (laconic, obviate, equivocal, prosaic, mercurial, pellucid, enervate, sanguine, inchoate) and used precisely; options are never nonsense or archaic words.
- Before writing a key, read the completed sentence or the passage once more to confirm that exactly one option (or one pair) fits and that each wrong option fails for a nameable reason.
- Explanations stay short: the clue in the text that fixes the answer, and why the most tempting wrong option fails.`,
  domains: [
    {
      id: 'text-completion',
      name: 'Text Completion',
      share: 'about a third of the section',
      detect: /\b(text completion\w*|blank\w*|fill[- ]in|vocab\w*|word\w* in context|context clue\w*|contrast word\w*|transition\w*|paradox\w*|although|two[- ]blank|three[- ]blank)\b/i,
      skills: [
        'Reading for structure before vocabulary: contrast words (although, yet, far from, paradoxically), continuation (indeed, moreover), cause (because, hence), colons and semicolons that define or restate, parallel phrases',
        'One-blank items: five candidates, usually two near the right meaning and one the exact opposite; choosing by the sentence\'s logic, not by which word is most impressive',
        'Two- and three-blank items: finding the blank the text fixes first (often the second), then using it to fix the others; keeping track of tone (praise vs criticism)',
        'Vocabulary at the test\'s level, including second meanings (qualify, sanction, temper, discriminating, economy)',
      ],
      hard: [
        'A blank fixed by a word three clauses away rather than the adjacent one',
        'A sentence whose tone is ironic, so the surface praise is really criticism',
        'A three-blank item where the first blank cannot be fixed until the third is',
        'A second-meaning word (a "qualified" success) among options that read as first meanings',
      ],
      traps: ['the most impressive word rather than the fitting one', 'the opposite of the right word when a contrast word is missed', 'first meanings of words used in their second sense', 'fixing blanks in reading order instead of by the clues'],
      exemplars: [
        `MC_QUESTION: Select the word that best completes the text.
\`\`\`passage
Far from being ______, the committee's report was a model of candour, naming every error and the person responsible for it.
\`\`\`
A) evasive
B) exhaustive
C) prolix
D) candid
E) tendentious
Correct Answer: A
Explanation: "Far from being" sets up a contrast with "a model of candour", so the blank is the opposite of candid: evasive. Choice D repeats the idea instead of contrasting with it; choice E (biased) is a different fault from the one the sentence denies.`,
        `MC_QUESTION: Select the word that best fits Blank (i).
\`\`\`passage
The biography is (i) ______ in its research yet oddly (ii) ______ in its judgements: every date has been verified, but the author will not say what any of it means.
\`\`\`
A) meticulous
B) cursory
C) partisan
Correct Answer: A
Explanation: "Every date has been verified" tells us the research is careful, so Blank (i) is meticulous. Cursory is its opposite, and partisan describes bias, which the colon does not support.`,
        `MC_QUESTION: Select the word that best fits Blank (ii).
\`\`\`passage
The biography is (i) ______ in its research yet oddly (ii) ______ in its judgements: every date has been verified, but the author will not say what any of it means.
\`\`\`
A) severe
B) reticent
C) lavish
Correct Answer: B
Explanation: "The author will not say what any of it means" describes a refusal to judge, so Blank (ii) is reticent. "Yet" contrasts thorough research with withheld judgement; severe would mean harsh judgements, the reverse of withholding them.`,
      ],
    },
    {
      id: 'sentence-equivalence',
      name: 'Sentence Equivalence',
      share: 'about a fifth of the section',
      detect: /\b(sentence equivalence|two (?:words|answers|choices)|synonym\w*|pair\w* of words|alike in meaning|equivalent)\b/i,
      skills: [
        'Predicting the blank\'s meaning from the sentence before looking at the six words, then finding the two that both deliver it',
        'Spotting the test\'s traps: a pair of synonyms that do not fit the sentence, and a word that fits but has no partner',
        'Vocabulary pairs at the test\'s level (prolix and verbose, laconic and terse, ameliorate and mitigate, sanguine and optimistic, ephemeral and fleeting, capricious and mercurial)',
        'Checking that both completed sentences mean the same, not just that both words are plausible',
      ],
      hard: [
        'A sentence where a fitting word\'s only synonym in the list is a second-meaning word',
        'Two synonym pairs among the six, only one of which fits the sentence\'s logic',
        'A blank whose tone (approving or disapproving) is set by a clue late in the sentence',
      ],
      traps: ['picking two synonyms without rereading the sentence', 'one right word paired with a near-synonym that shifts the meaning', 'missing a negation that reverses the required tone'],
      exemplars: [
        `MC_QUESTION: Select the two answer choices that, when used to complete the sentence, fit the meaning of the sentence as a whole and produce completed sentences that are alike in meaning.
\`\`\`passage
The senator's speech was so ______ that reporters left before it ended, unable to find a single quotable line in the hour they had sat through.
\`\`\`
A) prolix and verbose
B) incisive and trenchant
C) terse and laconic
D) inflammatory and provocative
E) prolix and trenchant
Correct Answer: A
Explanation: An hour-long speech with nothing quotable is wordy, so prolix and verbose both fit and mean the same. Choice C is the opposite (brief); choice E pairs a fitting word with trenchant, which means sharp and does not match it.`,
      ],
    },
    {
      id: 'reading-comprehension',
      name: 'Reading Comprehension',
      share: 'about half of the section',
      detect: /\b(reading\s+comprehension|reading|passage\w*|main idea|primary purpose|inference\w*|infer\w*|author'?s? (?:attitude|tone|purpose|view)|function of|in order to|structure of the passage|paragraph\w*|humanities|social science\w*|natural science\w*|scholar\w*|literary criticism|select[- ]in[- ]passage|highlight\w*)\b/i,
      skills: [
        'Main idea and primary purpose: distinguishing what the passage argues from what it discusses; the test\'s verbs (challenge, qualify, reconcile, trace, evaluate)',
        'Inference: what must be true given the passage, as opposed to what is plausible or merely consistent; the author\'s likely view on a related claim',
        'Function and structure: why a sentence, example or concession is there; how a paragraph relates to the one before; the role of the marked sentence',
        'Attitude and tone: qualified approval, measured scepticism, detached analysis; recognising when the author reports a view without endorsing it',
      ],
      hard: [
        'A passage that presents a scholarly consensus and then qualifies it, with options that describe the consensus rather than the author\'s qualification',
        'An inference item whose tempting wrong option goes one step beyond the text',
        'A function item where the marked sentence concedes a point before the author rebuts it',
        'An attitude item where the author is critical of a method but not of the conclusion',
      ],
      traps: ['the primary purpose stated too broadly or too narrowly', 'an inference that is plausible but not supported', 'confusing a reported view with the author\'s own', 'an option that uses the passage\'s words with a different claim'],
      exemplars: [
        `MC_QUESTION: Which of the following best describes the function of the sentence in brackets?
\`\`\`passage
Historians of science long treated the eighteenth-century craze for electrical demonstrations as a sideshow to the real work of theory, a matter of parlour tricks and sparks drawn from the noses of volunteers. [[Yet the demonstrators' apparatus, built to impress paying audiences, was often more sensitive than anything in a university cabinet.]] It was precisely because showmen competed to produce larger and more visible effects that the instruments improved, and the theorists who later claimed to have "discovered" the properties of charge were frequently working with equipment the showmen had perfected a decade earlier. The sideshow, in other words, supplied the laboratory.
\`\`\`
A) It summarises the view of historians that the passage goes on to defend.
B) It introduces evidence against the view stated in the first sentence, which the rest of the passage develops.
C) It concedes that the demonstrations were trivial before arguing that they were nonetheless popular.
D) It offers an exception that the author then dismisses as unrepresentative.
E) It explains why theorists ignored the demonstrators' work.
Correct Answer: B
Explanation: "Yet" turns against the historians' dismissal, and the next sentences build the case that the showmen's instruments drove discovery, so the bracketed sentence introduces the counter-evidence the passage develops. Choice A reverses the author's position; choice C misreads the concession, which is in the first sentence, not here.`,
        `MC_QUESTION: The author's attitude toward the historians mentioned in the first sentence can best be described as
\`\`\`passage
Historians of science long treated the eighteenth-century craze for electrical demonstrations as a sideshow to the real work of theory, a matter of parlour tricks and sparks drawn from the noses of volunteers. Yet the demonstrators' apparatus, built to impress paying audiences, was often more sensitive than anything in a university cabinet. It was precisely because showmen competed to produce larger and more visible effects that the instruments improved, and the theorists who later claimed to have "discovered" the properties of charge were frequently working with equipment the showmen had perfected a decade earlier. The sideshow, in other words, supplied the laboratory.
\`\`\`
A) open hostility toward their motives
B) qualified agreement with their conclusions
C) measured disagreement with their assessment
D) indifference to their methods
E) admiration for their thoroughness
Correct Answer: C
Explanation: The author corrects the historians' dismissal with evidence and an argument, in an even tone ("long treated", "in other words"), which is measured disagreement rather than hostility (A); nothing in the passage agrees with or admires them (B, E).`,
      ],
    },
    {
      id: 'critical-reasoning-writing',
      name: 'Critical Reasoning and the Analytical Writing Issue task',
      share: 'one or two items per section, plus the writing measure',
      detect: /\b(critical reasoning|argument\w*|weaken\w*|strengthen\w*|assumption\w*|conclusion\w*|premise\w*|discrepanc\w+|paradox\w*|resolve|logical|analytical writing|issue task|essay\w*|thesis|writing measure|awa)\b/i,
      skills: [
        'Finding the conclusion and the evidence in a short argument, and the gap between them; the kinds of gap (correlation taken as cause, a sample taken as representative, a change in one factor with others ignored, a definition shifted)',
        'Weaken and strengthen items: the right option bears on the gap; the wrong ones are true-sounding statements about the topic that leave the link untouched',
        'Assumption items (what must be true for the conclusion to follow) and the negation test; explain-the-discrepancy items (a fact that makes both findings true at once)',
        'The Issue task: taking a position on a claim and its stated reason, supporting it with specific examples, addressing a complication, and organising a 30-minute essay; the 6-point holistic scale',
      ],
      hard: [
        'A weaken item where the tempting option attacks the evidence\'s truth rather than its relevance',
        'An assumption item whose right option is a modest "no other cause" statement rather than a bold claim',
        'A discrepancy item where both findings are true and the right option reconciles rather than denies one',
        'An Issue prompt whose reason is weaker than its claim, so the best response splits them',
      ],
      traps: ['picking an option about the topic rather than about the link', 'attacking the premise instead of the inference', 'a strengthener that merely repeats the conclusion', 'an essay that argues the claim and ignores the reason'],
      exemplars: [
        `MC_QUESTION: Which of the following, if true, most seriously weakens the argument?
\`\`\`passage
A city council member argues: "Since the city installed brighter streetlights on Elm Avenue two years ago, reported burglaries on that street have fallen by 40 percent. Installing the same lights across the city would therefore cut burglaries citywide by a similar amount."
\`\`\`
A) The brighter streetlights on Elm Avenue cost more to operate than the lights they replaced.
B) During the same two years, reported burglaries fell by about 40 percent in every neighbourhood of the city, including those with no new lighting.
C) Some residents of Elm Avenue have complained that the new lights shine into their bedrooms at night.
D) Burglaries are more likely to be reported when residents believe the police will respond.
E) Other cities that installed brighter streetlights saw reductions in car theft as well as burglary.
Correct Answer: B
Explanation: The argument assumes the lights caused the fall; if burglaries fell by the same amount everywhere, the fall on Elm Avenue is explained by a citywide trend, not the lights. Choices A and C are costs, not evidence about cause; choice E strengthens.`,
        `SA_QUESTION: Issue task. "Claim: Universities should require every student to take courses outside the student's field of study. Reason: Innovation most often comes from people who can connect ideas across fields." Write a response in which you discuss the extent to which you agree or disagree with the claim and the reason on which it is based. For this practice, write your thesis and your first body paragraph.
Sample Answer: A model response to the bounded task. Thesis: I agree with the claim but only partly with its reason: breadth requirements are justified less by the promise of innovation, which is rare and unplannable, than by what every graduate needs, the ability to evaluate claims made in fields other than their own. First body paragraph: The reason given for the claim is seductive but weak. It is true that celebrated innovations often join two fields, as when statistical methods remade genetics in the early twentieth century, but a requirement that every chemistry student take a course in art history is not what produced such joins; they came from people who pursued a second field deeply, for years, because a problem demanded it. A semester's survey course gives a student vocabulary, not the fluency that connecting ideas requires. If breadth requirements are to be defended, it should be on grounds that apply to every student, not on the hope of producing the occasional polymath. Scoring guide (6-point holistic): 6, an insightful, well-articulated position that addresses both the claim and the reason, with compelling and specific examples and an acknowledgement of complexity; 5, a thoughtful position with well-chosen examples and generally clear organisation; 4, a clear position with adequate support and some development; 3, a position with limited support or lapses in clarity; 2, an unclear or unsupported position; 1, little evidence of the ability to develop a position. What loses points here: arguing only the claim and never the reason (caps the score at 4), examples that are generic ("many famous inventors"), and a thesis that merely restates the prompt.`,
      ],
    },
  ],
  scoreRange: { min: 130, max: 170, step: 1 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for someone already past the basics. Skip the items nearly everyone gets (a blank fixed by the next word, a main-idea item with one plausible option): at most 1 item in 8 is that easy, and never first in a section. About half are typical test items and at least a third are the kind under WHAT HARD LOOKS LIKE, the items of the harder second section. If a current or target score is given, write at and above that level: a 150 wants the 150-160 items, a 160 wants 160-170.`,
    hard: `DIFFICULTY ON THIS TEST: the items from the harder second section, the ones that separate 160 from 170. At least 4 of every 5 items must be ones a test taker scoring around 155-160 would miss: three-blank completions fixed by a distant clue, second-meaning words, passages that qualify a consensus, inference items with a one-step-too-far option, weaken items where the tempting option attacks the premise. Hard never means rarer words for their own sake; it means a text whose logic must be read closely.`,
    easier: `DIFFICULTY ON THIS TEST: the first-section items most test takers get right, one clue each, in the test's voice, with vocabulary at the lower end of the test's range. Still real test items.`,
  },
}
