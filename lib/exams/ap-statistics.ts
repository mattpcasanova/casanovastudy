// The AP Statistics exam as a reference for the guide prompts: Section I
// multiple choice with FIVE options A-E (unlike the SAT and the AP sciences)
// and Section II free response scored E/P/I per part, with inference written
// as state, plan, do, conclude in context. Units 1-9 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_STATISTICS: ExamProfile = {
  id: 'ap-statistics',
  name: 'the AP Statistics exam',
  detect: {
    exam: /\bAP\s+stat(?:s|istics)?\b/i,
    subjectHints: /./,
    subjects: ['mathematics', 'math', 'statistics'],
    explicit: /\bAP\s+stat(?:s|istics)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly FIVE options A-E, as on Section I of this exam (never four). No true/false, no "I, II and III" lists. Each item gives its data in a figure block (a table, a dot plot, a histogram, a scatterplot with a fitted line, a box plot) or in the stem, and every number the answer needs is there.
- Free-response items are SA_QUESTION, one per part, in the exam's voice: a context in 2-4 sentences (a study, a sample, a process), then the part: "Describe the distribution ...", "Interpret the slope in context.", "Is there convincing statistical evidence that ...? Justify.", "Construct and interpret a 95% confidence interval ...", "Describe a Type II error in context and a consequence of it.", "Explain why random assignment was used.", "Calculate the probability ...". A part that asks for an inference procedure expects the full four steps.
- The Sample Answer for an SA_QUESTION is the scoring guideline: what an essentially correct (E) response contains, in the order the rubric checks it. For inference: (1) the hypotheses with the parameter defined in context, (2) the named procedure and the conditions checked with the numbers (random, 10% condition, large counts or normality), (3) the test statistic and p-value or the interval, (4) a conclusion in context linked to the p-value and the alpha level, never "accept H₀". For a description: shape, center, spread and unusual features, in context, with comparisons when two groups.
- A calculation as a multiple-choice item has five numeric options, as on Section I (the wrong ones from a skipped step, a wrong sign or a wrong factor). NUM_QUESTION is only for a free-response calculation part whose answer is one number (give the value to the exam's precision; alternates with |); keep it to at most one in six items.
- Calculators are allowed throughout; the hard part is choosing the procedure, checking conditions and interpreting, never the arithmetic. Give any needed values (a z or t critical value, a standard deviation) in the stem when they are not read from a table.
- Options for conceptual items are five parallel statements of similar length; the wrong ones are the misinterpretations under WRONG ANSWERS ARE BUILT FROM (a probability-of-the-hypothesis reading of a p-value, a confidence-level reading of an interval, causation from an observational study, a sample statistic called a parameter).
- Before writing an item's answer, work it from the numbers in the stem and check that exactly one option (or one sample answer) is right. If the numbers do not work out, change them. Never leave a note or a second attempt in the explanation.
- Explanations stay short: the key reasoning step and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'data',
      name: 'Exploring One- and Two-Variable Data (Units 1-2)',
      share: 'about 20-30% of the test',
      detect: /\b(unit [12]\b|one[- ]variable|two[- ]variable|distribution|histogram|dot plot|box ?plot|stemplot|shape|center|spread|skew\w*|outlier|mean|median|standard deviation|IQR|z[- ]score|normal (?:distribution|curve|model)|empirical rule|percentile|scatter ?plot|correlation|least[- ]squares|regression|residual|slope|intercept|r\^?2|coefficient of determination|influential|transform\w*|two[- ]way table|conditional (?:distribution|relative)|association)\b/i,
      skills: [
        'Describing and comparing distributions (shape, center, spread, outliers, in context), choosing mean/SD vs median/IQR, the 1.5 × IQR rule, effects of adding or multiplying values',
        'The normal model: z-scores, percentiles, the empirical rule, finding values from areas and areas from values',
        'Two-way tables, marginal and conditional distributions, and association between categorical variables',
        'Scatterplots, correlation (and what it does not measure), least-squares regression: interpreting slope and y-intercept in context, r² and s, residuals and residual plots, outliers and influential points, transformations to achieve linearity',
      ],
      hard: [
        'Interpreting the slope and r² in context in the exam\'s exact form ("for each additional ..., the predicted ... increases by ...", "... % of the variation in y is explained by the linear relationship with x")',
        'Deciding from a residual plot whether a linear model is appropriate, or reading a computer regression output table',
        'How removing an influential point changes the slope, the correlation and r²',
        'A conditional distribution from a two-way table used to argue association, with the right denominator',
        'A normal calculation that needs the value for a given percentile, then a back-calculation of the mean or SD',
      ],
      traps: ['"y increases by" instead of "predicted y increases by"', 'r² read as the correlation', 'correlation implying causation', 'the marginal distribution used where a conditional one was asked', 'describing one group instead of comparing both'],
      exemplars: [
        `MC_QUESTION: A least-squares regression line for predicting a car's fuel efficiency, in miles per gallon, from its weight, in thousands of pounds, is ŷ = 48.2 - 7.5x. Which of the following is the best interpretation of the slope?
A) For each additional thousand pounds of weight, fuel efficiency decreases by 7.5 miles per gallon.
B) For each additional thousand pounds of weight, the predicted fuel efficiency decreases by 7.5 miles per gallon.
C) For each additional mile per gallon, the predicted weight decreases by 7.5 thousand pounds.
D) A car weighing 1,000 pounds is predicted to get 48.2 - 7.5 = 40.7 miles per gallon.
E) 7.5% of the variation in fuel efficiency is explained by weight.
Correct Answer: B
Explanation: The slope is a predicted change in the response per unit of the explanatory variable. A omits "predicted" (the line does not say every car loses exactly 7.5), and C reverses the variables.`,
        `SA_QUESTION: The dot plots show the number of minutes 20 students in Class A and 20 students in Class B spent on homework one night. Compare the two distributions.
\`\`\`graph
kind: dotplot
title: Class A (minutes)
data: 15, 20, 20, 25, 25, 25, 30, 30, 30, 30, 35, 35, 35, 40, 40, 45, 45, 50, 60, 95
\`\`\`
\`\`\`graph
kind: dotplot
title: Class B (minutes)
data: 30, 35, 35, 40, 40, 40, 45, 45, 45, 45, 50, 50, 50, 55, 55, 55, 60, 60, 65, 70
\`\`\`
Sample Answer: Shape: Class A is skewed right with a possible high outlier at 95 minutes; Class B is roughly symmetric (1 point for both shapes). Center: the median for Class B (about 47.5 minutes) is higher than for Class A (about 32.5 minutes) (1 point for a comparison of centers with values). Spread: Class A's times are more spread out (range 80 minutes; IQR about 20) than Class B's (range 40; IQR about 15), with the 95-minute value an unusual feature (1 point for spread compared in context). All statements in the context of homework minutes.`,
      ],
    },
    {
      id: 'collecting',
      name: 'Collecting Data (Unit 3)',
      share: 'about 12-15% of the test',
      detect: /\b(unit 3\b|collecting data|sampl\w+ (?:method|design|technique)|simple random|stratified|cluster|systematic|convenience|voluntary response|bias|undercoverage|nonresponse|experiment\w*|observational|random assignment|treatment|control group|placebo|blind|blocking|block design|matched pairs|confounding|generaliz\w+|causation|cause[- ]and[- ]effect)\b/i,
      skills: [
        'Sampling methods (SRS, stratified, cluster, systematic) and when each is used; sources of bias (undercoverage, nonresponse, voluntary response, question wording, convenience)',
        'Experiments vs observational studies; the principles of experimental design (comparison, random assignment, control, replication); completely randomized, randomized block and matched-pairs designs; blinding and placebos; confounding',
        'What can be concluded: random sampling allows generalization to the population; random assignment allows a cause-and-effect conclusion',
      ],
      hard: [
        'A scenario where stratified and cluster sampling both appear, and the right one depends on whether the groups are alike inside (cluster) or different between (strata)',
        'Why blocking was used, stated as reducing variability due to the blocking variable so the treatment effect is easier to detect',
        'The scope of a conclusion when there was random assignment but not random sampling (or the reverse)',
        'Identifying a confounding variable, as a variable associated with both the explanatory variable and the response',
      ],
      traps: ['"random" used for both sampling and assignment without saying which', 'a confounding variable that is not linked to the treatment', 'causation claimed from an observational study', 'blocking confused with stratifying', 'a placebo described as a control for bias in the experimenter'],
      exemplars: [
        `MC_QUESTION: A researcher wants to know whether a new fertilizer increases tomato yield. She has 40 plants, 20 in a sunny field and 20 in a shaded field. She randomly assigns 10 plants in each field to receive the fertilizer and 10 to receive none. Which of the following best describes this design and the reason for it?
A) A completely randomized design, because the fertilizer was randomly assigned.
B) A stratified random sample, because the plants were divided by field before selection.
C) A randomized block design with the field as the block, because sunlight is expected to affect yield.
D) A matched-pairs design, because each fertilized plant is paired with an unfertilized one.
E) An observational study, because the researcher did not choose which plants to grow.
Correct Answer: C
Explanation: Treatments were randomly assigned within each field, so the field is a block that removes the variability due to sunlight. B confuses blocking in an experiment with stratifying a sample.`,
        `SA_QUESTION: A school surveyed a random sample of 200 of its 1,800 students and found that students who eat breakfast have higher average grades than those who do not. A newspaper reported that eating breakfast causes higher grades. Explain why this conclusion is not justified, and describe one variable that could explain the association.
Sample Answer: The study is observational: students chose whether to eat breakfast, so there was no random assignment to breakfast and no-breakfast groups, and a cause-and-effect conclusion cannot be drawn (1 point: no random assignment, so no causation). A confounding variable such as parental involvement could be associated with both eating breakfast (parents who prepare breakfast) and higher grades (parents who help with schoolwork), so it, not breakfast, could explain the association (1 point: a variable linked to both the explanatory variable and the response). The random sample does allow generalizing the association to the school's students.`,
      ],
    },
    {
      id: 'probability',
      name: 'Probability, Random Variables and Sampling Distributions (Units 4-5)',
      share: 'about 17-25% of the test',
      detect: /\b(unit [45]\b|probability|random variable|expected value|binomial|geometric|independent|mutually exclusive|disjoint|conditional probability|tree diagram|simulation|law of large numbers|sampling distribution|central limit|standard error|unbiased|\bCLT\b|sample mean|sample proportion|\bp̂\b|x̄)\b/i,
      skills: [
        'Probability rules: complements, addition for unions, conditional probability and independence (checked with P(A|B) = P(A)), tree diagrams and two-way tables, simulations',
        'Discrete random variables: mean (expected value) and standard deviation, combining independent random variables (means add; variances add, SDs do not), binomial and geometric settings and their means and SDs',
        'Sampling distributions of a sample proportion and a sample mean: center, spread (σ/√n), shape (the normal condition for p̂, the central limit theorem for x̄), unbiased estimators, how n changes the spread',
      ],
      hard: [
        'Deciding independence from a two-way table by comparing a conditional probability with a marginal one',
        'The SD of a difference of two independent random variables (variances add even for a difference)',
        'A sampling-distribution probability that first requires checking the shape condition, then a z-score with σ/√n',
        'Choosing binomial vs geometric from the wording ("the number of successes in 10 trials" vs "the number of trials until the first success")',
        'How large a sample makes a given probability for x̄ small, solved from σ/√n',
      ],
      traps: ['dividing σ by n instead of √n', 'SDs added instead of variances', 'mutually exclusive treated as independent', 'the probability of an event confused with its conditional probability', 'the binomial mean used for a geometric setting'],
      exemplars: [
        `MC_QUESTION: The weights of apples from an orchard have mean 180 grams and standard deviation 24 grams, with a distribution that is skewed right. A random sample of 36 apples is selected. Which of the following best describes the sampling distribution of the sample mean weight?
A) Skewed right with mean 180 grams and standard deviation 24 grams.
B) Approximately normal with mean 180 grams and standard deviation 24 grams.
C) Approximately normal with mean 180 grams and standard deviation 4 grams.
D) Skewed right with mean 180 grams and standard deviation 4 grams.
E) Approximately normal with mean 180 grams and standard deviation 0.67 gram.
Correct Answer: C
Explanation: With n = 36 (at least 30) the central limit theorem gives an approximately normal shape, and the standard deviation is σ/√n = 24/6 = 4. E divides by n instead of √n.`,
        `NUM_QUESTION: In a certain population, 30% of adults are left-handed. If 8 adults are selected at random, what is the probability that exactly 2 of them are left-handed? Give your answer to four decimal places.
Answer: 0.2965 | 0.296 | 0.30
Explanation: Binomial with n = 8 and p = 0.3: C(8, 2)(0.3)²(0.7)⁶ = 28 × 0.09 × 0.117649 = 0.2965.`,
      ],
    },
    {
      id: 'inference',
      name: 'Statistical Inference (Units 6-9)',
      share: 'about 30-40% of the test',
      detect: /\b(unit [6789]\b|inference|confidence interval|margin of error|significance test|hypothesis|null|alternative|p[- ]value|alpha|type i|type ii|power|z[- ]test|t[- ]test|one[- ]sample|two[- ]sample|paired|proportions?|means?|chi[- ]square|goodness of fit|homogeneity|independence|regression inference|slope|conditions|degrees of freedom|critical value|statistically significant|convincing evidence)\b/i,
      skills: [
        'Confidence intervals for a proportion, a difference of proportions, a mean, a difference of means, a paired mean difference and a regression slope: construction, interpretation of the interval and of the confidence level, and how n and the confidence level change the margin of error',
        'Significance tests for the same parameters: hypotheses in context, conditions, the test statistic, the p-value and its interpretation, the conclusion; Type I and Type II errors and their consequences in context; power and what raises it',
        'Chi-square tests: goodness of fit, homogeneity and independence; expected counts, degrees of freedom, which test fits the design',
        'Reading computer output for a t-test or a regression, and using a given critical value',
      ],
      hard: [
        'The interpretation of a confidence level vs a confidence interval, in the exam\'s wording ("if we took many samples, about 95% of the intervals would capture ...")',
        'A p-value interpretation that must say "assuming the null hypothesis is true, the probability of a statistic at least this extreme"',
        'Choosing between a two-sample t test and a paired t test from the design, or between chi-square homogeneity and independence from how the sample was taken',
        'A Type II error and its consequence in context, and what would increase power (larger n, larger alpha, a true value farther from the null)',
        'A conclusion that must be written as "fail to reject" with the evidence stated, never "accept H₀" or "prove"',
      ],
      traps: ['"95% probability that the parameter is in this interval"', 'the p-value read as the probability that H₀ is true', '"accept the null hypothesis"', 'the alternative written about a sample statistic (p̂, x̄) instead of a parameter', 'the 10% condition or the large-counts condition skipped', 'a two-sample test used on paired data'],
      exemplars: [
        `MC_QUESTION: A 95% confidence interval for the proportion of a city's residents who support a new park is (0.52, 0.60). Which of the following is a correct interpretation?
A) There is a 95% probability that the true proportion is between 0.52 and 0.60.
B) 95% of the city's residents support the park with a proportion between 0.52 and 0.60.
C) We are 95% confident that the interval from 0.52 to 0.60 captures the true proportion of residents who support the park.
D) If the survey were repeated, 95% of the sample proportions would be between 0.52 and 0.60.
E) Since 0.50 is not in the interval, there is a 95% chance that a majority supports the park.
Correct Answer: C
Explanation: Confidence is about the method capturing the parameter, not a probability about the fixed parameter (A, E) or about future sample proportions (D).`,
        `SA_QUESTION: A coffee company claims that its 12-ounce bags contain a mean of at least 12.0 ounces of coffee. A consumer group weighs a random sample of 40 bags and finds a sample mean of 11.92 ounces with a sample standard deviation of 0.25 ounce. The weights appear roughly symmetric with no outliers. Is there convincing statistical evidence, at the α = 0.05 level, that the true mean weight is less than 12.0 ounces? Justify your answer.
Sample Answer: Step 1: H₀: μ = 12.0 ounces and Hₐ: μ < 12.0 ounces, where μ is the true mean weight of coffee in the company's 12-ounce bags (1 point for hypotheses with the parameter defined). Step 2: one-sample t test for a mean; conditions: random sample (given), 40 bags are less than 10% of all bags, and n = 40 ≥ 30 with a roughly symmetric sample, so the sampling distribution of x̄ is approximately normal (1 point for the named procedure with conditions checked). Step 3: t = (11.92 - 12.0) / (0.25/√40) = -0.08 / 0.0395 = -2.02 with df = 39; p-value ≈ 0.025 (1 point for the statistic and p-value). Step 4: because the p-value 0.025 is less than α = 0.05, we reject H₀; there is convincing statistical evidence that the true mean weight of coffee in the bags is less than 12.0 ounces (1 point for a conclusion in context linked to the p-value).`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the recall items (a definition, a one-step calculation). At most 1 item in 8 that easy, never first in a section; about half typical (choose the procedure or interpret one statistic in context) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts should need the exam's wording to earn the point.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: interpretations where one word changes the score (predicted, confident, assuming H₀ is true), the choice between designs or procedures from subtle wording, conditions that fail, errors and power in context, combining random variables, and free-response parts with every rubric element required. Hard never means content outside the course framework or arithmetic for its own sake.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one idea each, in the exam's voice, with the statistic or procedure named plainly. Still real exam items.`,
  },
}
