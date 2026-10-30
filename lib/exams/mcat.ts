// The MCAT as a reference for the guide prompts: four sections (Chemical and
// Physical Foundations, CARS, Biological and Biochemical Foundations,
// Psychological, Social and Biological Foundations), every item multiple
// choice with four options, most in passage-based sets. Exemplars written
// here in the test's voice.

import type { ExamProfile } from './types'

export const MCAT: ExamProfile = {
  id: 'mcat',
  pace: 97,
  name: 'the MCAT',
  detect: {
    exam: /\bMCAT\b/,
    subjectHints: /./,
    subjects: ['science', 'health', 'english'],
    explicit: /\bMCAT\b/,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Every item is multiple choice with exactly FOUR options A-D, as on all four sections of the MCAT. No true/false, no "I, II and III" lists (the real test has a few, but the player cannot show them well, so write each statement as its own item), no student-typed numbers, no free response.
- Most items come in passage-based sets. The passage (200-400 words for the science sections: a research study, an experiment or a clinical scenario, with its data described or given in a kind: table figure; 500-600 words for CARS: humanities or social sciences, an argument with a point of view) sits in a \`\`\`passage fence under the question line, and every item of a set repeats the passage so it stands alone. About a quarter of the science items are discrete (no passage), testing one concept directly.
- Stems in the AAMC's voice: "Based on the passage, which of the following best explains ...?", "Which of the following findings, if observed, would most weaken the researchers' hypothesis?", "The amino acid substitution described in the passage most likely affects the protein's ...", "Which of the following is the most likely mechanism ...?", "According to the passage, the author would most likely agree that ...", "Which of the following research designs would best address the limitation described in the passage?" Science items require content knowledge applied to the passage, never recalled in isolation from it when a passage is present; CARS items require no outside knowledge.
- Calculations are done without a calculator, so the numbers are clean (powers of ten, a pKa and a 10:1 ratio, a halving of radius); units matter and the options carry them. Wrong options are the common slips (the inverse relationship, the square forgotten, the wrong base).
- Explanations name the content category tested (e.g. "fluid dynamics: continuity equation", "amino acid chemistry", "operant conditioning") in two or three words before the one-sentence reason.
- Before writing an item's answer, solve it from the final numbers in the stem and check that the passage supports exactly one option. Never leave a note or a second attempt in the explanation.`,
  domains: [
    {
      id: 'chem-phys',
      name: 'Chemical and Physical Foundations of Biological Systems',
      share: 'one of the four sections (59 items, 95 minutes)',
      detect: /\b(chem\w*|physic\w*|C\/P|kinemat\w*|fluid|circuit|optic|thermodynam\w*|acid|base|pKa|buffer|titration|spectroscop\w*|enzyme kinetics|Michaelis|gas law|electrochem\w*|organic|stereochem\w*|carbonyl)\w*/i,
      skills: [
        'Physics in physiological contexts: fluids (continuity, Bernoulli, Poiseuille), circuits and membrane potentials, optics of the eye, sound and the Doppler effect, work and energy',
        'General chemistry: thermodynamics and kinetics, equilibrium, acids and bases with pH and buffers, electrochemistry, gas laws, periodic trends',
        'Organic chemistry: functional groups, stereochemistry, carbonyl and carboxylic acid chemistry, separations and spectroscopy (IR, NMR)',
        'Biochemistry in this section: enzyme kinetics and inhibition, amino acid acid-base properties, bioenergetics',
      ],
      hard: [
        'A fluids item where radius changes and the answer needs the square (area) or the fourth power (Poiseuille), not the first power',
        'A buffer item where the ratio must be read from a titration description before Henderson-Hasselbalch applies',
        'A kinetics item where two mechanisms fit the rate data and the passage rules one out',
        'An organic item where the correct product follows from stereochemistry the passage states only implicitly',
      ],
      traps: ['the inverse of the right relationship', 'a radius change applied linearly', 'pH and pOH swapped', 'a competitive inhibitor read as lowering Vmax'],
      exemplars: [
        `MC_QUESTION: Blood flows through a healthy artery of radius r at an average speed v. A plaque narrows a short segment of the artery to radius r/2. Assuming the blood is incompressible and the flow rate is unchanged, the average speed of the blood in the narrowed segment is most nearly:
A) v/4
B) v/2
C) 2v
D) 4v
Correct Answer: D
Explanation: Fluid dynamics: continuity equation. A₁v₁ = A₂v₂ and area scales with r², so halving the radius quarters the area and quadruples the speed. Choice C applies the radius change linearly.`,
        `MC_QUESTION: A buffer is prepared from a weak acid (pKa = 4.8) and its conjugate base. If the ratio of conjugate base to weak acid is 10:1, what is the pH of the buffer?
A) 3.8
B) 4.8
C) 5.8
D) 6.8
Correct Answer: C
Explanation: Acid-base chemistry: Henderson-Hasselbalch. pH = pKa + log([A⁻]/[HA]) = 4.8 + log 10 = 5.8. Choice A uses the inverse ratio.`,
      ],
    },
    {
      id: 'cars',
      name: 'Critical Analysis and Reasoning Skills (CARS)',
      share: 'one of the four sections (53 items, 90 minutes)',
      detect: /\b(CARS|critical analysis|reasoning skills|passage|humanities|philosophy|ethics|art history|literature|author'?s|main idea|tone)\b/i,
      skills: [
        'Foundations of comprehension: the main idea, the meaning of a term as the author uses it, the author\'s tone',
        'Reasoning within the text: how claims are supported, what the author assumes, the function of a paragraph or an example',
        'Reasoning beyond the text: applying the author\'s view to a new case; how a new fact would affect the argument',
        'Working from the passage alone: humanities and social science topics the reader may know nothing about',
      ],
      hard: [
        'An attitude item where the author grants a view some credit before rejecting it',
        'An application item where the right option extends the author\'s principle to an unfamiliar case',
        'A "most weaken" item where the distractors attack claims the author does not make',
        'A passage in which the author\'s own view appears only in the last paragraph',
      ],
      traps: ['a view the author reports taken for the author\'s own', 'an inference stronger than the text supports', 'outside knowledge used to choose an option', 'the most interesting paragraph taken for the main idea'],
      exemplars: [
        `MC_QUESTION: Based on the passage, the author would most likely agree with which of the following statements about museum labels?
\`\`\`passage
Visitors to art museums spend, on average, a few seconds looking at a painting and considerably longer reading the label beside it. Curators have drawn two opposite lessons from this. Some conclude that labels should be shortened or removed, so that the work itself regains the visitor's attention. Others conclude that labels are where the museum's teaching actually happens and should be expanded.

Both lessons rest on an assumption worth questioning: that looking and reading compete for a fixed quantity of attention. In my own observation, visitors who read a label often return to the painting and look longer than they otherwise would, as if the label had given them something to look for. The label does not steal attention from the work; it directs attention toward it. The visitor who glances at a landscape and moves on is not deprived of the painting by the text. She was never going to stay.

If that is right, the question is not how much to write but what to write. A label that tells the visitor the painting's date and the artist's birthplace gives her nothing to look for. A label that points to the single brushstroke that makes the sky recede, or to the figure the painter added and then half painted out, sends her back to the canvas. The best labels are not short or long. They are instructions for looking.
\`\`\`
A) Labels should be removed so that visitors attend to the paintings themselves.
B) A label's value depends less on its length than on whether it gives the visitor something to look for in the work.
C) Visitors who read labels carefully learn more about art history than visitors who do not.
D) Museums should expand their labels because labels are where most visitors learn.
Correct Answer: B
Explanation: Reasoning within the text. The author rejects both curatorial camps and argues in the last paragraph that what matters is whether the label directs looking. Choices A and D are the two positions the author sets aside; C introduces learning outcomes the passage never discusses.`,
      ],
    },
    {
      id: 'bio-biochem',
      name: 'Biological and Biochemical Foundations of Living Systems',
      share: 'one of the four sections (59 items, 95 minutes)',
      detect: /\b(bio\w*|biochem\w*|B\/B|amino acid|protein|enzyme|metabol\w*|glycolysis|Krebs|citric acid|oxidative|cell|membrane|genetic\w*|DNA|RNA|transcription|translation|mutation|physiology|organ|hormone|immune|microbiolog\w*|virus|bacteria)\w*/i,
      skills: [
        'Biochemistry: amino acid properties, protein structure and folding, enzyme kinetics and regulation, metabolic pathways and their control, bioenergetics',
        'Molecular biology: DNA replication, transcription, translation, gene regulation, mutations and repair, recombinant DNA techniques read from a described experiment',
        'Cell biology and genetics: organelles, the cell cycle, signaling, Mendelian and non-Mendelian inheritance, population genetics',
        'Physiology: the organ systems (nervous, endocrine, circulatory, respiratory, renal, digestive, immune, reproductive) and homeostasis; microbiology of bacteria and viruses',
      ],
      hard: [
        'A substitution described by residue and position whose effect must be reasoned from side-chain chemistry and the protein\'s location',
        'A kinetics item where the inhibitor type must be read from a described Lineweaver-Burk change',
        'An experiment with a knockout or a labeled substrate where the result rules out all but one pathway',
        'A physiology item that links a hormone change to a downstream variable two steps away',
      ],
      traps: ['a hydrophobic residue read as polar', 'Km and Vmax effects of inhibitors swapped', 'transcription and translation directions confused', 'a feedback loop read in the wrong direction'],
      exemplars: [
        `MC_QUESTION: A point mutation replaces a glutamate residue on the surface of a soluble protein with a valine residue. Which of the following is the most likely consequence of this substitution?
A) The protein becomes more soluble because valine carries a positive charge at physiological pH.
B) The protein tends to aggregate because a hydrophobic residue is now exposed on its surface.
C) The protein's secondary structure is destroyed because valine cannot form hydrogen bonds in a backbone.
D) The protein's net charge becomes more negative, increasing repulsion between molecules.
Correct Answer: B
Explanation: Amino acid chemistry. Glutamate is negatively charged and hydrophilic; valine is nonpolar, so a surface valine promotes hydrophobic association between proteins (the sickle hemoglobin mechanism). Choice D is backwards: losing a negative charge makes the net charge less negative.`,
        `MC_QUESTION: In the presence of a certain inhibitor, an enzyme shows an increased apparent Km with no change in Vmax. Which of the following best describes the inhibitor?
A) A competitive inhibitor that binds the active site and can be overcome by raising substrate concentration
B) A noncompetitive inhibitor that binds an allosteric site and lowers the number of functional enzymes
C) An uncompetitive inhibitor that binds only the enzyme-substrate complex
D) An irreversible inhibitor that covalently modifies the active site
Correct Answer: A
Explanation: Enzyme kinetics. A competitive inhibitor raises the substrate needed to reach half Vmax (higher apparent Km) and leaves Vmax unchanged, since enough substrate outcompetes it. Choice B describes a lower Vmax with unchanged Km.`,
      ],
    },
    {
      id: 'psych-soc',
      name: 'Psychological, Social and Biological Foundations of Behavior',
      share: 'one of the four sections (59 items, 95 minutes)',
      detect: /\b(psych\w*|social\w*|sociolog\w*|P\/S|perception|sensation|learning|conditioning|memory|cognition|emotion|stress|identity|attitude|attribution|conformity|stratification|demograph\w*|health disparit\w*|research method\w*|study design|correlation|confound)\w*/i,
      skills: [
        'Sensation and perception, consciousness, learning (classical and operant conditioning, observational learning), memory and cognition, language, emotion and stress',
        'Identity and personality theories, psychological disorders, motivation, attitudes and behavior (cognitive dissonance, the elaboration likelihood model)',
        'Social processes: conformity, obedience, group dynamics, attribution theory, stereotypes and prejudice, socialization, social institutions and stratification, demographics and health disparities',
        'Research methods and statistics in a described study: design, variables, confounds, validity, sampling, basic descriptive statistics',
      ],
      hard: [
        'A described study where the right option names the confound rather than the finding',
        'Two similar concepts (negative reinforcement vs punishment; fundamental attribution error vs self-serving bias) with the scenario fitting only one',
        'A disparities item where the mechanism (access, stress, built environment) must be inferred from the data pattern',
        'A memory item where the result pattern (primacy, recency) must be matched to the mechanism (long-term vs working memory)',
      ],
      traps: ['negative reinforcement read as punishment', 'correlation read as cause in a described study', 'conformity and obedience confused', 'a sociological concept named for a psychological one'],
      exemplars: [
        `MC_QUESTION: Which of the following is the most significant limitation of the study described in the passage?
\`\`\`passage
Researchers recruited 200 adults from a university's volunteer pool and asked each to complete a questionnaire on hours of sleep during the previous week and a standardized test of working memory. Participants who reported sleeping fewer than six hours per night scored, on average, 12 percent lower on the working memory test than participants who reported seven or more hours. The researchers concluded that insufficient sleep impairs working memory in adults.

Table: Mean working memory score by reported sleep (illustrative)
Fewer than 6 hours (n = 54): 71
6 to 7 hours (n = 78): 78
7 or more hours (n = 68): 81
\`\`\`
A) The sample size was too small to detect a difference between the groups.
B) The study's design cannot establish that sleep loss caused the lower scores, since a third variable such as stress could affect both sleep and memory.
C) Working memory cannot be measured with a standardized test.
D) The participants were not told the purpose of the study.
Correct Answer: B
Explanation: Research methods: correlational design. Sleep was measured, not manipulated, so the causal conclusion is not supported; a confound (stress, illness, shift work) could lower both. Choice A is wrong because 200 participants is adequate and a difference was in fact detected.`,
        `MC_QUESTION: A child cleans her room, and her parent stops nagging her about it. Afterward the child cleans her room more often. The parent's nagging, in this example, functioned as:
A) a positive reinforcer, because its presence increased the behavior
B) a negative reinforcer, because its removal increased the behavior
C) a positive punishment, because its presence decreased the behavior
D) a negative punishment, because its removal decreased the behavior
Correct Answer: B
Explanation: Operant conditioning. The behavior (cleaning) increased when an aversive stimulus (nagging) was removed, which is negative reinforcement. Choice C is the usual slip of calling anything unpleasant a punishment; punishment decreases behavior.`,
      ],
    },
  ],
  scoreRange: { min: 118, max: 132, step: 1 },
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: practice for a test taker past the basics. Skip the items nearly everyone gets (a definition, one direct read of a table): at most 1 item in 8 is that easy, and never the first item of a section. About half are typical passage-based items (one concept applied to the passage) and at least a third are the items described under WHAT HARD LOOKS LIKE. A stated score sets the level: section scores run 118-132 (a total is about four times a section score, 472-528); write at and above the stated level (a 125 needs typical items; a 129 needs mostly hard ones).`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 128 from a 131 or higher on a section (515+ overall). At least 4 of every 5 items must be ones a 125-level test taker would miss: a passage whose data rule out all but one mechanism, a calculation that needs the squared or fourth-power relationship, a substitution reasoned from side-chain chemistry, a study whose right option is the confound, two near-identical concepts with a scenario that fits only one, and CARS items where the author's view is qualified. Hard never means obscure facts outside the AAMC content outline or arithmetic a calculator would be needed for.`,
    easier: `DIFFICULTY ON THIS TEST: the items most test takers get right, one concept each, in the test's voice, with the passage stating what is needed plainly. Still real test items.`,
  },
}
