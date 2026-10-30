// The AP Macroeconomics exam as a reference for the guide prompts: Section I
// multiple choice (five options A-E, many on an AD-AS, money-market, loanable
// funds or foreign exchange diagram, or a table) and Section II free response
// (one long FRQ with correctly labeled graphs, two short ones; scored by
// points). Units 1-6 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_MACRO: ExamProfile = {
  id: 'ap-macroeconomics',
  pace: 70,
  name: 'the AP Macroeconomics exam',
  detect: {
    exam: /\bAP\s+Macro(?:economics)?\b/i,
    subjectHints: /./,
    subjects: ['business', 'mathematics', 'history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+Macro(?:economics)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly five options A-E, as on Section I of the AP Macroeconomics exam. No true/false, no "I, II and III" lists. About half the items sit on a stimulus: an AD-AS, money market, loanable funds, Phillips curve or foreign exchange diagram, a table of GDP components, prices and quantities (for a price index or real GDP), labor force numbers, or a bank's balance sheet. Give a diagram as a \`\`\`graph fence (kind: plane with x: and y: ranges, plot: or line: for the curves with " | AD" / " | SRAS" / " | LRAS" labels, point: for an equilibrium, vline: for full-employment output; never label the value being asked for) when the numbers are set, or describe it in a \`\`\`passage fence ("The economy is in short-run equilibrium at an output level below full employment ..."); give a table as a kind: table figure (columns: | 2023 | 2024; one row: per line). Items that share a stimulus each repeat it, so every item stands alone.
- Stems are the exam's: "Based on the table, real GDP in 2024 is", "The unemployment rate in this economy is", "Which of the following policies would most likely close the gap shown?", "If the central bank sells government bonds on the open market, which of the following will happen in the short run?", "An increase in government borrowing will most likely lead to which of the following changes in the loanable funds market and in investment?", "If the demand for the peso increases in the foreign exchange market, the peso will ... and the country's exports will ...". Options are five parallel statements, five values, or the exam's two- and three-column combination format ("Real GDP / Price level / Unemployment: increase / increase / decrease"); the wrong ones come from the usual confusions (see WRONG ANSWERS ARE BUILT FROM), and value options include the number from a one-step slip.
- Free-response items are SA_QUESTION, one per part, in the exam's voice: "Draw a correctly labeled graph of aggregate demand and aggregate supply and show the current equilibrium output and price level, labeled Y1 and PL1, and the full-employment output, labeled Yf.", "Calculate ... Show your work.", "Identify an open-market operation the central bank could use to ... Explain how it affects ...", "Will ... increase, decrease or remain unchanged? Explain." The Sample Answer is the scoring guideline: what each point requires (axes labeled, curves labeled, equilibrium marked; the number with its work; a chain of reasoning, "bond sales reduce reserves, so the policy rate rises, so interest-sensitive spending falls, so AD shifts left"). A graph part's answer describes the drawing in words. Monetary policy follows the course's current ample-reserves framework (the policy rate set through administered rates: interest on reserves and the discount rate; open-market operations shift the supply of reserves) unless the item is about the limited-reserves money-market model, and the item must say which model it uses.
- NUM_QUESTION only for a real calculation (nominal or real GDP, a price index or inflation rate, the unemployment rate, the spending or tax multiplier and the change in output, the money multiplier or a bank's excess reserves, real interest rate, a growth rate), at most one in six items; accept equivalent forms ("Answer: 5 | 5.0 | 5%").
- Every number must work: compute each key from the table before writing the item, and fix the numbers rather than leaving a note. Countries, banks and currencies may be generic ("Country X", "the peso") or real in name only; never a real country's actual statistics.
- Explanations stay short: the chain of cause and effect in one line and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'basics-indicators',
      name: 'Units 1-2: Basic Economic Concepts; Economic Indicators and the Business Cycle',
      share: 'about 17-27% of the test',
      detect: /\b(unit [12]\b|scarcity|opportunity cost|production possibilit\w+|PPC|PPF|comparative advantage|absolute advantage|terms of trade|circular flow|GDP|gross domestic product|nominal GDP|real GDP|GDP deflator|expenditure approach|income approach|intermediate good\w*|unemployment|labor force|participation rate|frictional|structural|cyclical|natural rate|discouraged worker\w*|underemploy\w+|inflation|deflation|disinflation|CPI|consumer price index|price index|base year|market basket|real income|real interest|nominal interest|Fisher|business cycle|recession|expansion|peak|trough|real wage)\b/i,
      skills: [
        'Scarcity, opportunity cost and the production possibilities curve; comparative advantage from output or input data and terms of trade; the circular flow model',
        'GDP: the expenditure approach (C + I + G + Xn), what is excluded (intermediate goods, used goods, transfers, financial transactions), nominal vs real GDP and the GDP deflator, limits of GDP as a measure of well-being',
        'Unemployment: who counts in the labor force, the unemployment and participation rates, frictional, structural and cyclical unemployment, the natural rate, discouraged workers and underemployment',
        'Inflation: price indexes and the market basket, the inflation rate between years, real vs nominal values, the costs of unanticipated inflation (who gains and loses), real vs nominal interest rates (Fisher relation)',
        'The business cycle: phases, output gaps, how indicators move across the cycle',
      ],
      hard: [
        'Real GDP and the inflation rate computed from a price-and-quantity table with a stated base year',
        'The unemployment rate from population, labor force and employment numbers, with a trap group (discouraged workers, students) to exclude',
        'A described job loss classified as frictional, structural or cyclical',
        'Who gains from unanticipated inflation, reasoned from fixed nominal contracts (a borrower with a fixed-rate loan)',
      ],
      traps: ['intermediate goods or used-good sales counted in GDP', 'discouraged workers counted as unemployed', 'the inflation rate computed as the change in the index points rather than the percent change', 'nominal and real interest rates swapped in the Fisher relation', 'a recession identified by a slowdown in growth rather than a fall in real GDP'],
      exemplars: [
        `MC_QUESTION: The table shows the prices and quantities of the only two goods produced in an economy. Using 2023 as the base year, real GDP in 2024 is
\`\`\`graph
kind: table
columns: | 2023 price | 2023 quantity | 2024 price | 2024 quantity
row: Bread | $2 | 100 | $3 | 110
row: Shirts | $10 | 20 | $12 | 25
\`\`\`
A) $400
B) $470
C) $520
D) $630
E) $720
Correct Answer: B
Explanation: Real GDP values 2024 quantities at 2023 prices: ($2 x 110) + ($10 x 25) = $220 + $250 = $470. $630 (D) is nominal GDP for 2024, and $400 (A) is GDP for 2023.`,
        `MC_QUESTION: In a country of 200 million adults, 120 million are employed, 10 million are not working but looked for a job in the past four weeks, and 8 million want a job but have stopped looking. The unemployment rate is approximately
A) 5.0%
B) 7.7%
C) 9.0%
D) 13.0%
E) 15.0%
Correct Answer: B
Explanation: The labor force is the employed plus those actively looking: 130 million. Unemployment is 10 / 130 = 7.7%. Counting the 8 million discouraged workers (D) is the usual slip; they are not in the labor force.`,
      ],
    },
    {
      id: 'ad-as-financial',
      name: 'Units 3-4: National Income and Price Determination; The Financial Sector',
      share: 'about 32-45% of the test',
      detect: /\b(unit [34]\b|aggregate demand|aggregate supply|AD|SRAS|LRAS|short[- ]run aggregate|long[- ]run aggregate|wealth effect|interest[- ]rate effect|exchange[- ]rate effect|sticky wage\w*|multiplier|MPC|MPS|marginal propensity|spending multiplier|tax multiplier|balanced budget|output gap|recessionary gap|inflationary gap|fiscal policy|expansionary|contractionary|automatic stabilizer\w*|discretionary|stagflation|supply shock|self[- ]correct\w*|money|M1|M2|liquidity|functions of money|bank\w*|reserve\w*|required reserve\w*|excess reserve\w*|money multiplier|balance sheet|T[- ]account|money market|money supply|money demand|nominal interest|central bank|Federal Reserve|the Fed|open[- ]market|discount rate|interest on reserves|IOR|ample reserves|limited reserves|policy rate|federal funds|monetary policy|loanable funds|real interest rate|national saving|private saving|public saving|bond\w*|bond price\w*|quantity theory|velocity|MV\s*=\s*PQ|equation of exchange|financial asset\w*)\b/i,
      skills: [
        'Aggregate demand: components, why it slopes down (wealth, interest-rate and exchange-rate effects), shifters; the spending and tax multipliers from the MPC and the change in output they produce',
        'Aggregate supply: short run (sticky wages and prices) vs long run (vertical at full employment), shifters, supply shocks; short-run equilibrium, recessionary and inflationary gaps, and the long-run self-correction through wages',
        'Fiscal policy: expansionary and contractionary tools, their size relative to the gap and the multiplier, automatic stabilizers vs discretionary policy, lags',
        'Money and banking: functions and measures of money, fractional reserve banking, a bank\'s balance sheet, required and excess reserves, the money multiplier and the maximum change in the money supply from a deposit',
        'The money market (limited-reserves model: money supply vertical, nominal interest rate) and the ample-reserves framework (the policy rate set by interest on reserves and the discount rate; open-market operations change reserves), how a central bank\'s tools move interest rates, investment and AD; bond prices and interest rates move opposite',
        'The loanable funds market: real interest rate, national saving as supply, investment demand, shifts from government borrowing or saving behavior; the quantity theory of money (MV = PQ) and inflation in the long run',
      ],
      hard: [
        'The change in government spending needed to close a gap from the MPC (tax changes need a larger amount than spending changes)',
        'The maximum change in the money supply from a described deposit with a reserve requirement, distinguishing the new deposit from the new excess reserves',
        'A contractionary monetary action traced through the correct model to output, the price level and interest rates in one combination option',
        'A supply shock distinguished from a demand shock by what happens to the price level and output together, and the long-run adjustment when policy does nothing',
      ],
      traps: ['the tax multiplier used with the spending multiplier\'s size', 'the whole deposit treated as excess reserves in the money multiplier', 'bond prices and interest rates moved in the same direction', 'the nominal interest rate (money market) and the real interest rate (loanable funds) swapped', 'LRAS shifted by a change in aggregate demand', 'expansionary monetary policy shifting SRAS'],
      exemplars: [
        `MC_QUESTION: An economy is in a recessionary gap of $200 billion. If the marginal propensity to consume is 0.8, which of the following changes in government spending, with no change in taxes, would close the gap?
A) An increase of $40 billion
B) An increase of $50 billion
C) An increase of $160 billion
D) An increase of $200 billion
E) An increase of $1,000 billion
Correct Answer: A
Explanation: The spending multiplier is 1 / (1 - 0.8) = 5, so $200 billion / 5 = $40 billion of new spending. $50 billion (B) comes from the tax multiplier (0.8 / 0.2 = 4), which applies to a tax cut, not spending.`,
        `MC_QUESTION: The central bank operates in an ample-reserves framework and wants to reduce inflation. Which of the following actions and short-run effects is most likely?
A) Lower the interest rate paid on reserves; AD shifts right; the price level rises
B) Raise the interest rate paid on reserves; AD shifts left; the price level falls
C) Buy government bonds; the policy rate falls; investment rises
D) Raise the interest rate paid on reserves; SRAS shifts right; the price level falls
E) Lower the discount rate; the money supply falls; AD shifts left
Correct Answer: B
Explanation: In the ample-reserves framework the central bank raises its administered rates (interest on reserves, the discount rate) to raise the policy rate; borrowing costs rise, interest-sensitive spending falls, and AD shifts left. Monetary policy works through AD, not SRAS (D).`,
      ],
    },
    {
      id: 'long-run-stabilization',
      name: 'Unit 5: Long-Run Consequences of Stabilization Policies',
      share: 'about 20-30% of the test',
      detect: /\b(unit 5\b|Phillips curve|short[- ]run Phillips|long[- ]run Phillips|SRPC|LRPC|expectations|expected inflation|money neutrality|neutrality of money|crowding out|crowding[- ]out|deficit\w*|debt|national debt|budget deficit|budget surplus|government borrowing|policy mix|fiscal and monetary|long[- ]run growth|economic growth|productivity|human capital|physical capital|technology|capital stock|real GDP per capita|growth rate|supply[- ]side|rule of 70|investment tax credit)\b/i,
      skills: [
        'The Phillips curve: the short-run trade-off between inflation and unemployment, the vertical long-run curve at the natural rate, how demand shocks move along the SRPC and supply shocks or changed expectations shift it; the link to the AD-AS model',
        'Money growth and inflation in the long run: the neutrality of money, inflation expectations and the quantity theory',
        'Government deficits, debt and crowding out: borrowing in the loanable funds market raises the real interest rate and reduces private investment; the fiscal-monetary policy mix and its effect on interest rates and output',
        'Economic growth: sources (physical and human capital, technology, productivity), the production function and the PPC, policies that raise long-run aggregate supply, growth rates and real GDP per capita',
      ],
      hard: [
        'An AD-AS change translated into a movement along or a shift of the short-run Phillips curve',
        'The long-run effect of expansionary fiscal policy in an economy already at full employment (price level up, output back, interest rates up, investment down)',
        'The crowding-out chain through the loanable funds market with the direction of each variable in a combination option',
        'Distinguishing a policy that shifts LRAS (growth) from one that moves output along SRAS',
      ],
      traps: ['a supply shock shown as a movement along the SRPC instead of a shift', 'the long-run Phillips curve drawn with a trade-off', 'crowding out attributed to monetary expansion', 'a one-time rise in the price level called inflation', 'a rise in AD treated as long-run growth'],
      exemplars: [
        `MC_QUESTION: An economy is operating at full employment. The government increases spending and finances it by borrowing. In the long run, which of the following is the most likely result?
A) Higher real output and a lower price level
B) Higher real interest rates, lower private investment, and a higher price level
C) Lower real interest rates and higher private investment
D) A leftward shift of the long-run aggregate supply curve
E) Lower unemployment and lower inflation
Correct Answer: B
Explanation: Borrowing raises the demand for loanable funds, so the real interest rate rises and private investment falls (crowding out); with the economy already at full employment, the demand increase ends as a higher price level, with output back at full employment.`,
      ],
    },
    {
      id: 'open-economy',
      name: 'Unit 6: Open Economy: International Trade and Finance',
      share: 'about 10-13% of the test',
      detect: /\b(unit 6\b|balance of payments|current account|capital account|financial account|trade deficit|trade surplus|net exports|exports?|imports?|foreign exchange|exchange rate\w*|currency|appreciat\w+|depreciat\w+|peso|euro|yen|dollar|capital flow\w*|net capital|capital inflow\w*|capital outflow\w*|real interest rate differential|tariff\w*|quota\w*|protectionis\w+|trade polic\w+)\b/i,
      skills: [
        'The balance of payments: current account (goods, services, income, transfers) and the capital and financial account; why they sum to zero',
        'Foreign exchange markets: the demand for and supply of a currency, appreciation and depreciation, what shifts them (relative interest rates, incomes, price levels, tastes, speculation), and the effect on net exports and AD',
        'Links between policy and the exchange rate: higher domestic interest rates attract capital inflows and appreciate the currency, reducing net exports',
        'Trade barriers: tariffs and quotas and who gains and loses',
      ],
      hard: [
        'A change in one country\'s interest rate traced to both currencies\' exchange rates and that country\'s net exports',
        'A transaction placed in the current or financial account and the matching entry on the other side',
        'A foreign exchange graph where the stimulus is a change in the other country\'s income or price level',
        'The combined effect of expansionary fiscal policy on interest rates, capital flows, the currency and net exports',
      ],
      traps: ['a currency appreciation read as good for exports', 'demand for a currency confused with supply of it (one country\'s demand for pesos is its supply of dollars)', 'a current account deficit treated as a sign of a financial account deficit', 'higher interest rates linked to depreciation'],
      exemplars: [
        `MC_QUESTION: Suppose real interest rates rise in the United States while they stay the same in Mexico. In the foreign exchange market for the U.S. dollar, which of the following will most likely occur?
A) The demand for dollars increases, the dollar appreciates, and U.S. net exports fall.
B) The demand for dollars decreases, the dollar depreciates, and U.S. net exports rise.
C) The supply of dollars increases, the dollar depreciates, and U.S. net exports fall.
D) The demand for dollars increases, the dollar depreciates, and U.S. net exports rise.
E) The supply of dollars decreases, the dollar appreciates, and U.S. net exports rise.
Correct Answer: A
Explanation: Higher U.S. returns draw financial capital in, so foreigners demand more dollars and the dollar appreciates; a stronger dollar makes U.S. goods dearer abroad, so net exports fall. Appreciation never raises net exports (E).`,
        `SA_QUESTION: Country X's economy is in a recessionary gap. (a) Draw a correctly labeled graph of aggregate demand and aggregate supply showing the current equilibrium output and price level, labeled Y1 and PL1, and full-employment output, labeled Yf. (b) Identify an open-market operation the central bank could use to close the gap. (c) Explain how that operation affects the nominal interest rate and, in turn, the international value of Country X's currency.
Sample Answer: (a) 2 points: axes labeled Price level and Real GDP; downward-sloping AD, upward-sloping SRAS and a vertical LRAS at Yf; Y1 and PL1 marked at the AD-SRAS intersection with Y1 to the left of Yf. (b) 1 point: buy government bonds (an open-market purchase). (c) 2 points: the purchase increases bank reserves and the money supply, so the nominal interest rate falls; lower returns in Country X reduce foreign demand for its currency (and raise residents' demand for foreign assets), so the currency depreciates. A response that says the interest rate falls but does not connect it to capital flows or currency demand earns the first point only.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the definition items. At most 1 item in 8 that only asks what a term means, never first in a section; about half typical (one shift traced to one outcome, one calculation from a table) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts must need the chain of reasoning or a correct calculation, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: multipliers applied to the right instrument, real values and rates from tables, policy traced through two markets (money or loanable funds, then AD-AS, then the exchange rate) in a combination option, supply shocks and the long-run adjustment with no policy, crowding out at full employment, and FRQ parts where a missing label or an unconnected step loses the point. Hard never means trivia outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one shift or one formula each, with the stimulus stated plainly. Still real exam items in the exam's voice.`,
  },
}
