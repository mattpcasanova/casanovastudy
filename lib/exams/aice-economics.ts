// The Cambridge International AS & A Level Economics exam (9708; AICE
// Economics in Florida) as a reference for the guide prompts. Paper 1 (AS)
// and Paper 3 (A Level) are 30 four-option multiple-choice items in one hour;
// Paper 2 and Paper 4 are a data response on a short article plus essays
// marked by levels (knowledge, analysis, evaluation).

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_ECONOMICS: ExamProfile = {
  id: 'aice-economics',
  pace: 120,
  name: 'the Cambridge AS & A Level Economics exam (AICE Economics, 9708)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Econ(?:omics)?\b|\bEcon(?:omics)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['business', 'history', 'social-studies', 'social studies', 'mathematics'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Econ(?:omics)?\b|\bEcon(?:omics)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Economics exam', {
    mcq: true,
    structured: 'Papers 2 and 4 have a data-response question (parts of 2-6 marks on an article and its figures) and essays in two parts: "Explain ... [8]" and "Assess whether ... [12]" at AS, or a single "Assess whether ... [20]" at A Level.',
    extra: [
      '- Multiple-choice items (Papers 1 and 3) have exactly four options A-D; many sit on a described diagram or a small data set. Where numbers are given for a diagram, draw it as a kind: plane figure (demand and supply as straight-line segments with labelled intersections, a PPC as a curve); otherwise describe the diagram in the stem ("The diagram shows a demand curve that is perfectly inelastic ..."). Tables of data (output per worker, costs, trade figures) are kind: table figures.',
      '- The data-response question sits on a model-written article in a \`\`\`passage fence (150-250 words about a fictional or unnamed country, "Country X", a named fictional firm, with two or three figures a part will need and a "Fig. 1 shows ..." reference to a table or graph figure labelled as illustrative). Parts in the paper\'s words: "Define ... [2]", "With the help of a diagram, explain ... [4]", "Using the information in Fig. 1, calculate ... [2]", "Explain two reasons why ... [4]", "Discuss whether ... [6]". Never a real country\'s real statistics attributed as fact.',
      '- Essays are SA_QUESTION whose Sample Answer is a plan with the level descriptors: knowledge and understanding of the concepts and diagrams needed (named: "an AD/AS diagram showing a rightward shift of AD"), analysis as chains of reasoning ("lower interest rates reduce the cost of borrowing, so investment and consumption rise, so AD shifts right, so real output rises and the price level rises"), and evaluation that weighs the case ("this depends on the size of the output gap: near full capacity the effect is mostly on the price level") and reaches a judgement. "Assess whether ... [20]": Level 4 (16-20) full analysis with a supported judgement; Level 3 (11-15) sound analysis, limited evaluation; Level 2 (6-10) some relevant explanation; Level 1 (1-5) assertions.',
      '- Calculations are NUM_QUESTION items at most one in six, with the formula the paper expects: PED = % change in quantity demanded ÷ % change in price (negative; state it with the sign and interpret), YED and XED with their signs, PES, the multiplier k = 1/(1 - MPC) or 1/MPW, consumer surplus as the triangle area, the unemployment rate as a percentage of the labour force, a real value from a nominal value and a price index, opportunity cost from a PPC or a two-country output table.',
      '- Use the course\'s terms exactly: positive and normative statements, ceteris paribus, equilibrium, shortage and surplus, consumer and producer surplus, merit and demerit goods, public goods (non-rival, non-excludable), externalities (marginal private and social cost and benefit), the terms of trade, the current account (trade in goods, trade in services, primary income, secondary income), the Keynesian and classical (or monetarist) views, supply-side policy. British spelling: labour, behaviour, specialisation, stabilisation, programme.',
      '- Diagrams in an answer are described precisely enough to draw: the axes, the curves, the shift and the new equilibrium, with the welfare areas named ("the deadweight loss is the triangle between the demand curve, the marginal cost curve and the monopoly output").',
    ],
  }),
  domains: [
    {
      id: 'price-system',
      name: 'AS: basic economic ideas and the price system (scarcity, PPC, demand and supply, elasticities, surplus, market failure and government intervention)',
      share: 'about half of Paper 1 and Paper 2 (AS)',
      detect: /\b(scarcity|choice|opportunity cost|factor\w* of production|production possibility|ppc\b|ppf\b|positive statement\w*|normative|economic system\w*|market economy|planned economy|mixed economy|specialis\w+|division of labour|money\b|demand\b|supply\b|equilibrium|shortage|surplus|elasticit\w+|ped\b|yed\b|xed\b|pes\b|elastic\b|inelastic|consumer surplus|producer surplus|market failure|externalit\w+|public good\w*|merit good\w*|demerit good\w*|information failure|indirect tax\w*|specific tax|ad valorem|subsid\w+|maximum price|minimum price|price ceiling|price floor|buffer stock\w*|nationali[sz]ation|regulation|tradable permit\w*)\b/i,
      skills: [
        'Scarcity, choice and opportunity cost; positive and normative statements; the factors of production and their rewards; the production possibility curve (shape, shifts, points inside and on it, opportunity cost from its gradient); economic systems and the role of the market, the state and enterprise; specialisation and the functions of money',
        'Demand and supply: the determinants of each, movements along vs shifts, market equilibrium and disequilibrium, how a change in one market affects related markets (substitutes, complements, derived and joint supply)',
        'Elasticities: PED, YED (normal, inferior, luxury goods), XED (substitutes and complements), PES; their calculation, determinants, the relation between PED and total revenue, and their use by firms and governments (incidence of an indirect tax)',
        'Consumer and producer surplus, their change after a price change or a tax, and economic efficiency in a competitive market',
        'Market failure: externalities with marginal private and social cost and benefit diagrams and the deadweight loss, merit and demerit goods and information failure, public goods and the free-rider problem; government intervention (indirect taxes, subsidies, maximum and minimum prices, buffer stocks, regulation, provision, tradable permits) with its effects and the possibility of government failure',
      ],
      hard: [
        'Tracing a change in the market for a complement through to the market asked about, with both diagrams',
        'The incidence of a specific tax when PED and PES are given, with the consumer\'s and producer\'s shares worked out',
        'A maximum price set above the equilibrium (no effect) as a trap against one set below',
        'Choosing between a tax and a tradable permit for a negative externality, with the information problem each faces',
        'Consumer surplus recalculated after a shift, from a plane figure with the numbers',
      ],
      traps: [
        'a rise in price read as a shift of the demand curve',
        'PED reported as positive and "elastic because quantity changed a lot" without comparing percentages',
        'a subsidy shown as shifting the demand curve',
        'a public good confused with a merit good or a good provided by the public sector',
        'a maximum price drawn above the equilibrium and said to cause a shortage',
      ],
      exemplars: [
        `NUM_QUESTION: When the price of a magazine falls from $20 to $18, the quantity demanded rises from 100 copies to 125 copies a week. Calculate the price elasticity of demand over this price range.
Answer: -2.5 | 2.5
Explanation: Percentage change in quantity = +25/100 × 100 = +25%; percentage change in price = -2/20 × 100 = -10%. PED = 25% ÷ -10% = -2.5: demand is price elastic, so the price cut raises total revenue (from $2,000 to $2,250). Using the new values as the base, or inverting the ratio (-0.4), are the usual slips.`,
        `MC_QUESTION: A government imposes a specific tax of $2 per packet on cigarettes. The demand for cigarettes is price inelastic and supply is price elastic. Which statement is correct?
A) Consumers pay most of the tax and the quantity sold falls by a small proportion
B) Producers pay most of the tax and the quantity sold falls by a large proportion
C) Consumers and producers share the tax equally whatever the elasticities
D) The tax has no effect on the price paid by consumers because supply is elastic
Correct Answer: A
Explanation: The tax shifts supply upwards by $2; when demand is inelastic relative to supply, the price rises by most of the tax, so consumers bear the larger share and quantity falls little. B describes elastic demand with inelastic supply; C and D ignore elasticity.`,
        `SA_QUESTION: Read the article and answer the question.
\`\`\`passage
Rents in the capital of Country X rose by 18% last year, and a survey found that one in five young workers now spends more than half of their income on housing. The government has announced a maximum monthly rent for flats of $600, about $150 below the current average. Landlords' associations say that 8% of rented flats could be sold or left empty. Fig. 1 shows the estimated demand and supply of rented flats in the capital (figures illustrative).
\`\`\`
With the help of a diagram, explain the likely effect of the maximum rent on the market for rented flats in Country X. [4]
Sample Answer: 1 mark: a correct diagram described: price (rent) on the vertical axis, quantity of flats on the horizontal, downward-sloping demand, upward-sloping supply, equilibrium at $750, a horizontal line at the maximum rent of $600 below the equilibrium. 1 mark: at $600 the quantity demanded rises (more young workers can afford a flat) while the quantity supplied falls (the article's landlords sell or leave flats empty), so Qd > Qs. 1 mark: the gap is a shortage (excess demand) of rented flats, shown as the horizontal distance between the curves at $600. 1 mark: consequences: non-price rationing (waiting lists, queues, landlords choosing tenants), a possible informal or black market at rents above $600, and a fall in the quality of flats as landlords cut maintenance. Does not score: a maximum rent drawn above the equilibrium; "rents fall so everyone benefits" with no shortage identified.`,
        `MC_QUESTION: An economy is producing at a point inside its production possibility curve. Which of the following must be true?
A) Some of the economy's resources are unemployed or used inefficiently
B) The economy cannot produce more of either good without producing less of the other
C) The economy's resources have increased in quantity or quality
D) The economy is producing the combination of goods that consumers want most
Correct Answer: A
Explanation: Points inside the curve are attainable but inefficient: more of both goods could be produced with the existing resources. B describes a point on the curve; C describes an outward shift; D is about allocative efficiency, which the PPC alone does not show.`,
      ],
    },
    {
      id: 'as-macro',
      name: 'AS: the macro economy (AD/AS, national income, inflation, unemployment, the balance of payments, exchange rates, the multiplier, fiscal, monetary and supply-side policy)',
      share: 'about half of Paper 1 and Paper 2 (AS)',
      detect: /\b(aggregate demand|aggregate supply|ad\/as|ad\b|as\b|national income|gdp\b|gnp\b|gni\b|real gdp|nominal|circular flow|injection\w*|withdrawal\w*|leakage\w*|multiplier|mpc\b|mps\b|inflation|deflation|disinflation|consumer price\w*|cpi\b|price index|cost[- ]push|demand[- ]pull|unemployment|labour force|claimant|frictional|structural|cyclical|balance of payments|current account|trade in goods|trade in services|primary income|secondary income|financial account|exchange rate\w*|depreciation|appreciation|devaluation|revaluation|floating|fixed exchange|fiscal policy|government spending|taxation|budget deficit|national debt|monetary policy|interest rate\w*|money supply|central bank|supply[- ]side|protection\w*|tariff\w*|quota\w*|terms of trade)\b/i,
      skills: [
        'Aggregate demand (C + I + G + (X - M)) and its determinants, aggregate supply in the short and long run (Keynesian and classical shapes), macroeconomic equilibrium and shifts, the output gap',
        'National income: the circular flow, injections and withdrawals, GDP, GNI, real vs nominal values using a price index, the multiplier (k = 1/(1 - MPC) or 1/MPW) and its calculation',
        'Inflation: measurement with a weighted price index, demand-pull and cost-push causes, consequences for different groups, deflation and disinflation; unemployment: measurement (claimant count and labour force survey), types (frictional, structural, cyclical, seasonal), consequences',
        'The balance of payments: the current account (trade in goods and services, primary and secondary income), the capital and financial accounts, causes and consequences of a current account deficit or surplus; exchange rates: determination of a floating rate, depreciation and appreciation and their effects on prices and the current account (and the Marshall-Lerner condition and J-curve at A Level), fixed and managed systems',
        'Policies: fiscal (government spending and taxation, the budget position, automatic stabilisers), monetary (interest rates, the money supply, exchange rate intervention), supply-side (education and training, infrastructure, deregulation, tax incentives, labour market reform), protectionism (tariffs, quotas and their diagrams) and its arguments, the conflicts between macroeconomic objectives',
      ],
      hard: [
        'A multiplier calculation where the MPC must be found from the MPS, tax rate and MPM first',
        'Explaining why a depreciation may worsen the current account at first and improve it later (the J-curve), with elasticities',
        'Judging whether an interest-rate rise will reduce cost-push inflation, with the chain of reasoning and the time lag',
        'Using an AD/AS diagram to show why the same rise in AD gives different results on the Keynesian AS curve at different levels of output',
        'Classifying balance of payments transactions (a dividend from a foreign subsidiary, a migrant\'s remittance, the purchase of a foreign factory) into the right account',
      ],
      traps: [
        'a fall in the inflation rate read as prices falling',
        'the multiplier applied to the change in national income instead of the injection',
        'a current account deficit treated as the same thing as a budget deficit',
        'a depreciation said to make imports cheaper',
        'supply-side policy confused with any policy that raises AD',
      ],
      exemplars: [
        `MC_QUESTION: In an economy the marginal propensity to consume is 0.8 and there are no taxes or imports. The government increases its spending by $20 billion. By how much will national income eventually rise, other things being equal?
A) $100 billion
B) $20 billion
C) $25 billion
D) $16 billion
Correct Answer: A
Explanation: The multiplier k = 1/(1 - MPC) = 1/0.2 = 5, so national income rises by 5 × $20 billion = $100 billion. Choice C uses 1/MPC; D multiplies the injection by the MPC itself.`,
        `SA_QUESTION: Explain how an increase in the central bank's interest rate may reduce the rate of inflation in an economy. [4]
Sample Answer: 1 mark each for four links in the chain, in the mark scheme's terms: a higher interest rate raises the cost of borrowing and the reward for saving, so households reduce consumption (especially of durable goods bought on credit) and firms cut investment; mortgage payments rise, leaving less disposable income; aggregate demand falls (shifts left), which reduces demand-pull pressure on the price level, especially if the economy was near full capacity; a higher interest rate may also attract capital inflows, causing the exchange rate to appreciate, which lowers import prices and reduces cost-push inflation. Also credited: an AD/AS diagram showing a leftward shift of AD and a lower price level. Does not score: "it reduces inflation because that is what the central bank does"; a rise in AD; confusing a fall in inflation with a fall in prices.`,
        `MC_QUESTION: Which of the following transactions is recorded in the current account of a country's balance of payments?
A) Profits received by a domestic firm from its factory in another country
B) The purchase by a foreign company of a factory in the domestic economy
C) A domestic bank's deposit of funds in a foreign bank
D) A loan from the International Monetary Fund to the government
Correct Answer: A
Explanation: Profits, dividends and interest earned abroad are primary income, part of the current account. B is foreign direct investment, C a portfolio or other investment flow and D a liability to a foreign institution: all financial account items.`,
      ],
    },
    {
      id: 'a-level-micro',
      name: 'A Level microeconomics (utility and indifference curves, costs and revenue, market structures, the labour market, income inequality and poverty)',
      share: 'about half of Paper 3 and Paper 4 (A Level)',
      detect: /\b(utility|marginal utility|equi[- ]marginal|indifference curve\w*|budget line\w*|income effect|substitution effect|behavioural economics|bounded rationality|short run|long run|law of diminishing returns|marginal product|returns to scale|marginal cost|average cost|total cost|fixed cost\w*|variable cost\w*|revenue|marginal revenue|average revenue|profit maximi[sz]\w+|normal profit|supernormal|abnormal profit|shut[- ]down|market structure\w*|perfect competition|monopol\w+|natural monopoly|monopolistic competition|oligopol\w+|kinked demand|game theory|prisoner'?s dilemma|cartel\w*|collusion|contestab\w+|barrier\w* to entry|price discrimination|efficienc\w+|allocative|productive|dynamic efficiency|x[- ]inefficiency|labour market|wage\w*|marginal revenue product|mrp\b|monopsony|trade union\w*|minimum wage|wage differential\w*|income (?:inequality|distribution)|wealth|poverty|gini|lorenz)\b/i,
      skills: [
        'Utility: total and marginal utility, the equi-marginal principle, deriving demand; indifference curves and budget lines, the income and substitution effects of a price change (normal, inferior and Giffen goods); behavioural economics and bounded rationality',
        'Production and costs: the short run (diminishing marginal returns, the shapes of MC, AVC, ATC) and the long run (returns to scale, the envelope LRAC, economies of scale), revenue (TR, AR, MR for price takers and price makers), profit maximisation at MC = MR, normal and supernormal profit, the shut-down point',
        'Market structures: perfect competition (short- and long-run equilibrium, efficiency), monopoly (sources of power, equilibrium, deadweight loss, natural monopoly and regulation, price discrimination and its conditions), monopolistic competition, oligopoly (interdependence, the kinked demand curve, collusion and cartels, game theory and the prisoner\'s dilemma, non-price competition), contestable markets; comparing structures on allocative, productive, dynamic and X-efficiency',
        'The labour market: the demand for labour as a derived demand and the marginal revenue product, supply of labour, wage determination in competitive markets, monopsony, trade unions and minimum wages (and their effects under monopsony), wage differentials and economic rent vs transfer earnings',
        'Income and wealth: measuring inequality (the Lorenz curve and Gini coefficient), absolute and relative poverty, causes and policies (progressive taxation, transfers, minimum wages, negative income tax) and their trade-offs',
      ],
      hard: [
        'Using a monopoly diagram to show the deadweight loss and then arguing when a monopoly may still benefit consumers (economies of scale, dynamic efficiency)',
        'A kinked-demand explanation of price rigidity with the discontinuity in MR, against a game-theory explanation',
        'Finding the profit-maximising number of workers from an MRP table when the wage changes',
        'Deciding whether a firm should shut down in the short run from AVC and price, not ATC',
        'Evaluating a minimum wage in a monopsonistic labour market where employment may rise',
      ],
      traps: [
        'profit maximisation placed where AR = AC or where total revenue is highest',
        'a firm making a loss told to shut down although price exceeds AVC',
        'MRP computed as marginal product × wage',
        'perfect competition described as having differentiated products',
        'a Gini coefficient of 0 read as complete inequality',
      ],
      exemplars: [
        `MC_QUESTION: Which of the following describes the long-run equilibrium of a firm in a perfectly competitive market?
A) Price equals marginal cost and equals the minimum of average total cost, with normal profit only
B) Price exceeds marginal cost and the firm earns supernormal profit
C) Price equals average revenue and exceeds average total cost, with barriers to entry preserving profit
D) Marginal revenue exceeds marginal cost and output expands indefinitely
Correct Answer: A
Explanation: Free entry competes supernormal profit away until P = AR = MR = MC = minimum ATC: the firm is both allocatively (P = MC) and productively (minimum ATC) efficient and earns normal profit. B and C describe monopoly or short-run outcomes; D is not an equilibrium.`,
        `MC_QUESTION: A firm sells its product in a perfectly competitive market at a price of $5. The table shows the firm's total output as it hires workers. The wage is $25 per worker per day. How many workers should the profit-maximising firm employ?
\`\`\`graph
kind: table
title: Output per day
columns: Workers | Total output (units)
row: 1 | 10
row: 2 | 18
row: 3 | 24
row: 4 | 28
row: 5 | 30
\`\`\`
A) 3
B) 4
C) 2
D) 5
Correct Answer: A
Explanation: The marginal revenue product of each worker is the marginal product × $5: $50, $40, $30, $20, $10. The firm hires while MRP ≥ wage ($25): the third worker adds $30, the fourth only $20, so three workers. Choice B hires while total output still rises; C stops when MRP falls below $40.`,
        `SA_QUESTION: Assess whether a monopoly is always against the interests of consumers. [20]
Sample Answer: A plan with the level descriptors. Knowledge: define monopoly (a single seller, or 25%+ market share in some legal definitions), barriers to entry, the monopoly diagram with AR, MR, MC and AC and the profit-maximising output at MC = MR. Analysis for the view: compared with the competitive outcome the monopolist restricts output and raises price, so there is allocative inefficiency (P > MC) and a deadweight loss (the triangle between D, MC and the monopoly output); productive inefficiency if it does not produce at minimum AC, X-inefficiency from the absence of competition, less choice, and supernormal profit transfers consumer surplus to the producer. Analysis against the view: a natural monopoly can supply at lower average cost than many small firms (economies of scale), so price may be lower than under competition; supernormal profit can finance research and development (dynamic efficiency, Schumpeter), giving consumers new products; a monopolist may price-discriminate in ways that extend the market to consumers who could not otherwise buy; contestable markets limit monopoly behaviour even without actual entry; regulation (price caps, competition policy) can remove the worst outcomes. Evaluation and judgement: the answer depends on the source of the monopoly (natural vs created by barriers), on whether the market is contestable, on how profits are used, and on the strength of regulation; a reasoned conclusion such as "not always: where economies of scale are large and the market is regulated or contestable, consumers can gain, but an unregulated monopoly protected by barriers usually leaves them worse off". Level 4 (16-20): both sides analysed with diagrams and a supported judgement that says on what the answer depends; Level 3 (11-15): sound analysis of the costs of monopoly with some benefits, a weak conclusion; Level 2 (6-10): a description of monopoly with little comparison; Level 1 (1-5): assertions. Does not score for evaluation: "it depends" with nothing stated.`,
      ],
    },
    {
      id: 'a-level-macro',
      name: 'A Level macroeconomics (growth and development, Keynesian and classical models, money and the quantity theory, the Phillips curve, policy conflicts, international trade and development policies)',
      share: 'about half of Paper 3 and Paper 4 (A Level)',
      detect: /\b(economic growth|economic development|development indicator\w*|hdi\b|human development|living standard\w*|actual growth|potential growth|business cycle|trade cycle|keynesian|classical|monetarist|liquidity trap|money supply|quantity theory|fisher equation|mv ?= ?pt|velocity of circulation|demand for money|liquidity preference|credit creation|phillips curve|expectations[- ]augmented|natural rate of unemployment|nairu|stagflation|policy conflict\w*|crowding out|laffer|absolute advantage|comparative advantage|free trade|trade bloc\w*|customs union|free trade area|wto\b|dumping|infant industry|terms of trade|dependency|foreign aid|debt|microfinance|fair trade|sustainable development|demographic|population growth|urbani[sz]ation)\b/i,
      skills: [
        'Economic growth and development: actual and potential growth and the PPC, causes and costs of growth, the business cycle, development indicators (GDP per head at PPP, HDI, MPI, literacy, life expectancy) and their limitations, characteristics of developing economies',
        'The Keynesian and classical models: the Keynesian cross and the 45° diagram, the multiplier and the paradox of thrift, the classical view of self-correction and the vertical LRAS, the liquidity trap',
        'Money: its functions and characteristics, the money supply and credit creation, the quantity theory of money (MV = PT) and the monetarist view of inflation, the demand for money (Keynes\'s motives) and the liquidity preference theory of the interest rate',
        'The Phillips curve: the short-run trade-off between inflation and unemployment, the expectations-augmented long-run curve at the natural rate (NAIRU), stagflation, and the implications for demand-management policy; the conflicts between objectives (growth vs inflation, growth vs the current account, full employment vs inflation) and how supply-side policy relaxes them; crowding out and the Laffer curve',
        'International trade: absolute and comparative advantage with the opportunity cost calculation from an output table, the gains from trade and the terms of trade, free trade vs protection and the arguments for protection (infant industries, dumping, strategic industries), trade blocs (free trade areas, customs unions, trade creation and diversion), the WTO',
        'Development policies: market-based vs interventionist approaches, trade vs aid, debt and its relief, foreign direct investment, microfinance, population policies, sustainable development',
      ],
      hard: [
        'Explaining why the long-run Phillips curve is vertical through adaptive expectations, step by step with the short-run curves shifting',
        'Evaluating the quantity theory as an explanation of inflation when velocity and output are not constant',
        'A comparative advantage calculation where one country has an absolute advantage in both goods, with the terms of trade that benefit both',
        'Judging whether a developing country should rely on trade or aid, using the case\'s structure of exports and debt',
        'Distinguishing trade creation from trade diversion when a country joins a customs union',
      ],
      traps: [
        'comparative advantage decided from total output rather than opportunity cost',
        'the Phillips curve read as a permanent trade-off',
        'economic growth and economic development used as the same thing',
        'MV = PT applied with V assumed constant and no comment',
        'a tariff said to raise domestic consumption',
      ],
      exemplars: [
        `MC_QUESTION: According to the quantity theory of money, what is the effect on the price level of a 10% increase in the money supply if the velocity of circulation and the volume of transactions are constant?
A) The price level rises by 10%
B) The price level is unchanged, because output rises by 10%
C) The price level falls by 10%
D) The price level rises by more than 10%, because velocity increases
Correct Answer: A
Explanation: In MV = PT, with V and T fixed, P must rise in proportion to M: a 10% increase. B assumes T changes, which the stem rules out; D assumes V changes.`,
        `MC_QUESTION: The table shows the maximum output of two goods that Country X and Country Y can each produce with the same quantity of resources. Which conclusion is correct?
\`\`\`graph
kind: table
title: Maximum output with the same resources
columns: Country | Cars | Wheat (tonnes)
row: X | 10 | 20
row: Y | 4 | 16
\`\`\`
A) X should specialise in cars and Y in wheat, since X's opportunity cost of a car is 2 tonnes of wheat and Y's is 4 tonnes
B) X should specialise in wheat and Y in cars, since X produces more wheat than Y
C) There are no gains from trade because X has an absolute advantage in both goods
D) Y should specialise in cars, since cars are the more valuable good
Correct Answer: A
Explanation: X gives up 20/10 = 2 tonnes of wheat per car; Y gives up 16/4 = 4 tonnes, so X has the comparative advantage in cars and Y in wheat (Y gives up only 0.25 of a car per tonne against X's 0.5). An absolute advantage in both goods (C) does not remove the gains from trade; B and D ignore opportunity cost.`,
        `SA_QUESTION: Explain why the long-run Phillips curve is thought to be vertical. [6]
Sample Answer: 1 mark each for six links, in the mark scheme's terms: the short-run Phillips curve shows an inverse relation between inflation and unemployment; a government raises AD to cut unemployment below the natural rate (NAIRU), moving along the short-run curve to higher inflation; workers at first have unchanged (adaptive) expectations of inflation, so real wages fall and firms hire more; as workers realise inflation is higher they revise their expectations and demand higher money wages, so real wages return to their former level; firms cut employment back to the natural rate, so unemployment returns to NAIRU but at the higher rate of inflation; the short-run curve has shifted outwards, and repeating the process traces a vertical long-run curve at the natural rate: in the long run there is no trade-off, only higher inflation. Also credited: the monetarist conclusion that only supply-side policy can lower the natural rate. Does not score: a description of the short-run trade-off alone; "because unemployment cannot change in the long run" with no expectations mechanism.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
