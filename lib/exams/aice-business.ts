// The Cambridge International AS & A Level Business exam (9609; AICE Business
// in Florida) as a reference for the guide prompts. No multiple-choice paper:
// Paper 1 short answer and essay, Paper 2 data response on a case study,
// Paper 3 (A Level) case study with calculations and a strategic
// recommendation. Mark schemes credit knowledge, application to the case,
// analysis and evaluation.

import type { ExamProfile } from './types'
import { AICE_DIFFICULTY, AICE_ITEM_RULES } from './aice'

export const AICE_BUSINESS: ExamProfile = {
  id: 'aice-business',
  name: 'the Cambridge AS & A Level Business exam (AICE Business, 9609)',
  detect: {
    exam: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Business(?:\s+Studies)?\b|\bBusiness(?:\s+Studies)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
    subjectHints: /./,
    subjects: ['business'],
    explicit: /\b(?:AICE|Cambridge|(?:AS|A)[- ]?Level)\s+Business(?:\s+Studies)?\b|\bBusiness(?:\s+Studies)?\b.*\b(?:AICE|Cambridge|A[- ]?Level)\b/i,
  },
  itemRules: AICE_ITEM_RULES('the Cambridge AS & A Level Business exam', {
    mcq: false,
    structured: 'Paper 1 Section A is short answer ("Define ... [2]", "Explain ... [3]"), Section B an essay of two parts ("Analyse ... [8]" and "Discuss/Evaluate ... [12]"); Paper 2 is data response on a case study (parts of 2, 3, 8 and 12 marks); Paper 3 (A Level) is a longer case study with calculations and a 20-mark recommendation.',
    extra: [
      '- Paper 1 parts in the paper\'s words: "Define the term \'...\'. [2]" (2 for a full definition, 1 for partial), "Explain two ... [3+3]" or "Explain one benefit ... [3]" (knowledge 1, explanation 2), "Analyse two ways ... [8]" (knowledge, application, analysis), "Discuss whether ... [12]" or "Evaluate the view that ... [12]" marked by levels: Level 3 (9-12) analysis with a supported judgement; Level 2 (5-8) some analysis, limited judgement; Level 1 (1-4) knowledge with little application.',
      '- Data-response parts sit on a model-written case study in a \`\`\`passage fence: a named fictional business with an abbreviation the parts use ("Tasty Treats Ltd (TT)", "Riverside Gyms plc (RG)"), 120-250 words with two or three numbers a part will need, and a kind: table figure when the case has data (a cash flow forecast, two investment options, ratio data). Never a real company. Parts: "Identify ... [2]", "Calculate ... Show your working. [3]", "Analyse two ... for TT ... [8]", "Recommend whether TT should ... Justify your recommendation. [12]". Application marks need the case\'s own details (its product, market, numbers), so the Sample Answer uses them by name.',
      '- Calculations are NUM_QUESTION items with the formula the paper expects: break-even output = fixed costs ÷ contribution per unit; margin of safety = actual output - break-even output; contribution = price - variable cost per unit; PED = % change in quantity demanded ÷ % change in price; gross profit margin = gross profit ÷ revenue × 100; current ratio = current assets ÷ current liabilities; acid test = (current assets - inventory) ÷ current liabilities; gearing = non-current liabilities ÷ capital employed × 100; payback period in years and months (or decimal years); ARR = average annual profit ÷ initial investment × 100; NPV with the discount factors given in the stem. Money in $ unless the case says otherwise; state units.',
      '- British terms throughout: turnover or revenue (not sales revenue only), inventory (not stock), trade receivables and payables, gearing, limited company (Ltd) and public limited company (plc), sole trader, redundancy, trade union, annual leave.',
      '- Theories are cited by name for their published content only (Taylor\'s scientific management, Maslow\'s hierarchy, Herzberg\'s hygiene factors and motivators, McGregor\'s Theory X and Y, Vroom\'s expectancy theory, Mayo\'s Hawthorne studies, Ansoff\'s matrix, Porter\'s five forces and generic strategies, the Boston matrix, the product life cycle), never with invented quotations or statistics.',
      '- Recommendation and evaluation marks need a judgement that depends on the case ("TT should take Option B because its payback within 2 years matters to a business with the cash-flow problems described in lines 8-10, even though Option A has the higher ARR"), not a list of pros and cons ending in "it depends".',
    ],
  }),
  domains: [
    {
      id: 'business-environment',
      name: 'Business and its environment (enterprise, business structure, size, stakeholders, objectives, external influences, strategy)',
      share: 'about a quarter of the AS papers, with strategy added at A Level',
      detect: /\b(enterprise|entrepreneur\w*|business plan\w*|opportunity cost|added value|primary sector|secondary sector|tertiary sector|sole trader\w*|partnership\w*|private limited|public limited|plc\b|ltd\b|franchis\w+|joint venture\w*|social enterprise\w*|public sector|privati[sz]ation|business size|economies of scale|diseconomies|growth|merger\w*|takeover\w*|stakeholder\w*|objective\w*|mission statement|smart objectives|external (?:influence|environment)\w*|pest\w*|legal|technolog\w+|environment\w* (?:issue|factor)\w*|corporate social responsibility|csr|strategy|strategic|swot|porter|ansoff|five forces|core competenc\w+|contingency)\b/i,
      skills: [
        'Enterprise: the role of the entrepreneur, business plans, risk and uncertainty, opportunity cost, adding value and how a business can increase it, the sectors of the economy and the changes between them',
        'Business structure: sole traders, partnerships, private and public limited companies (limited liability, ownership and control, raising finance, disclosure), franchises, joint ventures, social enterprises, public corporations and privatisation, with the advantages and disadvantages of each in a given case',
        'Size and growth: measuring size (employees, revenue, market share, capital employed) and why measures disagree, internal and external growth, mergers and takeovers, economies and diseconomies of scale, why small firms survive',
        'Stakeholders and objectives: stakeholder groups and their conflicting interests, corporate objectives and how they change over the life of a business, SMART objectives, mission statements, the hierarchy of objectives, corporate social responsibility and the triple bottom line',
        'External influences: economic (business cycle, inflation, unemployment, interest rates, exchange rates), legal (employment, consumer, competition law), social and demographic change, technology, environmental pressures, and how a business responds',
        'A Level strategy: strategic analysis (SWOT, PEST, Porter\'s five forces, core competencies, Boston matrix), strategic choice (Ansoff\'s matrix, force-field analysis, decision trees with expected values), implementation (corporate culture, change management, contingency planning)',
      ],
      hard: [
        'Choosing a legal structure for the case\'s business with the trade-off argued from its own situation (finance needed vs control vs disclosure)',
        'Evaluating whether a takeover will meet the acquirer\'s objectives, using the stakeholder conflicts in the case',
        'A decision tree with expected values and a judgement that goes beyond the EV (risk, the business\'s cash position)',
        'Assessing the impact of one external change (a rise in interest rates, a new minimum wage) on a specific business with different effects on costs, demand and strategy',
      ],
      traps: [
        'a plc described as owned by the government',
        'limited liability explained as the company being protected rather than its owners',
        'shareholders and stakeholders used as the same word',
        'economies of scale explained as "bigger is cheaper" with no named economy (purchasing, technical, financial, managerial)',
        'a judgement that lists both sides and ends with "it depends" without saying on what, for this business',
      ],
      exemplars: [
        `SA_QUESTION: Define the term 'opportunity cost'. [2]
Sample Answer: 2 marks: the benefit of the next best alternative that is given up when a decision is made, for example the interest a business forgoes when it spends cash on new machinery rather than keeping it in the bank. 1 mark for a partial definition such as "what you give up when you choose something" with no reference to the next best alternative. Does not score: "the cost of an opportunity" or a money cost alone.`,
        `SA_QUESTION: Explain two benefits to a private limited company of converting to a public limited company. [6]
Sample Answer: Each benefit: 1 mark for identifying it, up to 2 marks for explaining it. Benefit 1: access to finance. A plc can sell shares to the public on a stock exchange, so it can raise far larger sums than a private company limited to selling shares to friends, family and existing shareholders; this finances expansion without the interest and repayment burden of loans. Benefit 2: status and credibility. Listed companies must publish audited accounts and meet exchange rules, so suppliers, banks and customers see them as lower risk; this can mean better credit terms and easier recruitment of senior staff. Also credited: shares become liquid (existing owners can realise their investment), takeovers can be paid for in shares, the business can offer share options to motivate staff. Does not score: "it becomes bigger" or "it is more famous" with no explanation; a drawback (loss of control, disclosure costs) offered as a benefit.`,
        `MC_QUESTION: A hotel group measures its size by the number of employees, while a software business of similar revenue measures its size by market capitalisation. Which statement best explains why no single measure of business size is used?
A) Capital-intensive and labour-intensive businesses rank differently on each measure
B) Large businesses are always public limited companies
C) Revenue is not disclosed by private limited companies
D) Market share can only be measured in manufacturing industries
Correct Answer: A
Explanation: A software firm may have few employees but a high market value, while a hotel group employs many people, so employee numbers and capital-based measures give different rankings; that is why the syllabus lists several measures and their limitations. B and D are false statements; C is true of some companies but is not the reason.`,
      ],
    },
    {
      id: 'people',
      name: 'People in organisations (human resource management, motivation, organisational structure, business communication, leadership)',
      share: 'about a quarter of the AS papers',
      detect: /\b(human resource\w*|hrm|workforce plan\w*|recruit\w+|selection|job description|person specification|training|induction|appraisal\w*|redundanc\w+|dismissal|labour turnover|absenteeism|flexible working|part[- ]time|zero[- ]hours|trade union\w*|collective bargaining|motivat\w+|taylor|scientific management|maslow|hierarchy of needs|herzberg|hygiene|motivator\w*|mcgregor|theory x|theory y|vroom|expectancy|mayo|hawthorne|piece rate|performance[- ]related pay|fringe benefit\w*|job enrichment|job enlargement|job rotation|empowerment|team ?working|organi[sz]ational structure|hierarch\w+|span of control|chain of command|delegat\w+|delayer\w+|centrali[sz]\w+|decentrali[sz]\w+|matrix structure|line manager\w*|staff manager\w*|communication|barrier\w*|leadership|leader\w*|autocratic|democratic|laissez[- ]faire|paternalistic|emotional intelligence|management by objectives|mbo)\b/i,
      skills: [
        'Human resource management: workforce planning, recruitment and selection (internal vs external, job descriptions and person specifications), training (induction, on- and off-the-job), appraisal, dismissal and redundancy, labour turnover and absenteeism measures, flexible working, the role of trade unions and collective bargaining',
        'Motivation theories and their application: Taylor (scientific management, piece rates), Mayo (Hawthorne, teamworking), Maslow (hierarchy of needs), Herzberg (hygiene factors vs motivators, job enrichment), McGregor (Theory X and Y managers), Vroom (expectancy theory); financial methods (time rate, piece rate, salary, commission, bonuses, performance-related pay, profit sharing, share options, fringe benefits) and non-financial methods (job rotation, enlargement, enrichment, empowerment, teamworking, quality circles)',
        'Organisational structure: the organisation chart, levels of hierarchy, span of control and chain of command and their trade-off, delegation and accountability, delayering, centralisation vs decentralisation, line and staff, functional and matrix structures, structures for different sizes and strategies',
        'Business communication: the communication process, formal and informal, one-way and two-way, channels and their choice, barriers to effective communication and how to reduce them, the effect of technology',
        'Leadership and management: the functions of management (Fayol: planning, organising, commanding, coordinating, controlling), leadership styles (autocratic, democratic, paternalistic, laissez-faire) and when each suits, McGregor\'s theories as management attitudes, emotional intelligence (Goleman), management by objectives',
      ],
      hard: [
        'Recommending a payment system for a specific workforce in the case (piece rates for a packing line vs salary plus bonus for designers) using two theories against each other',
        'Explaining why delayering widens spans of control and what that does to delegation, motivation and communication, with the case\'s structure',
        'Judging a leadership style from the case\'s description of a manager and evaluating whether a change of style would help, given the workforce and the situation (a crisis vs a creative team)',
        'Using labour turnover and absenteeism figures to diagnose a motivation problem and then applying Herzberg to the case\'s likely hygiene failures',
      ],
      traps: [
        'Herzberg\'s hygiene factors (pay, conditions) treated as motivators',
        'Maslow applied as "pay more" for every level of need',
        'span of control confused with chain of command',
        'delegation described as passing on responsibility while the manager keeps accountability reversed',
        'a leadership style recommended with no reference to the workforce or situation in the case',
      ],
      exemplars: [
        `SA_QUESTION: Explain two ways a business could use Herzberg's motivators to improve the motivation of its employees. [6]
Sample Answer: Each way: 1 mark identified, up to 2 marks explained. Way 1: job enrichment. Herzberg found that achievement, recognition, responsibility and the work itself motivate, so a business can redesign jobs to give employees a complete unit of work and some decision-making over how it is done, for example letting a customer-service team resolve complaints without referring them upwards, which gives achievement and responsibility. Way 2: recognition. Managers can give regular, specific feedback and public acknowledgement of good work (an employee of the month scheme, thanks in a team meeting, a mention in the company newsletter), which Herzberg classed as a motivator rather than a hygiene factor; it costs little and raises job satisfaction. Also credited: opportunities for advancement and promotion, training that develops the work itself. Does not score: higher pay, better conditions or job security (hygiene factors, which Herzberg said prevent dissatisfaction but do not motivate); "give rewards" with no link to a motivator.`,
        `MC_QUESTION: A retail business removes a layer of regional managers so that store managers now report directly to the operations director. Which change in the organisational structure is the most direct result?
A) The operations director's span of control widens
B) The chain of command lengthens
C) The business becomes more centralised
D) Store managers' spans of control narrow
Correct Answer: A
Explanation: Delayering removes a level of hierarchy, so the director now has every store manager reporting to them: a wider span and a shorter chain of command (B is backwards). Decision-making may become more or less centralised depending on what else changes (C), and store managers' own teams are unaffected (D).`,
      ],
    },
    {
      id: 'marketing-operations',
      name: 'Marketing and operations (marketing planning, market research, the marketing mix, elasticity, operations methods, capacity, inventory, lean production, quality, location)',
      share: 'about a third of the AS papers, with globalisation and project management at A Level',
      detect: /\b(marketing|market research|primary research|secondary research|sampl\w+|segment\w+|target market\w*|niche|mass market|market share|market growth|marketing mix|4 ?ps|7 ?ps|product\b|product life cycle|extension strateg\w+|boston matrix|brand\w*|usp|price\b|pricing|skimming|penetration|cost[- ]plus|price discrimination|elasticit\w+|ped\b|yed\b|promotion\w*|advertis\w+|above[- ]the[- ]line|below[- ]the[- ]line|distribution|channel\w*|place\b|marketing plan\w*|digital marketing|e[- ]commerce|operations|production method\w*|job production|batch production|flow production|mass customi[sz]ation|productivity|efficiency|capacity utili[sz]ation|outsourcing|inventory|stock control|economic order quantity|just[- ]in[- ]time|jit\b|lean production|kaizen|quality control|quality assurance|tqm|total quality|benchmarking|location|relocation|supply chain|project management|critical path|network diagram)\b/i,
      skills: [
        'Marketing: its role and objectives, demand and supply and market equilibrium, market size, growth and share calculations, mass and niche marketing, market segmentation (demographic, geographic, psychographic) and targeting, customer relationship marketing',
        'Market research: primary and secondary methods, sampling (random, quota, stratified), sample size and bias, qualitative vs quantitative data, presenting and interpreting data',
        'The marketing mix: product (USP, the product life cycle and extension strategies, portfolio analysis with the Boston matrix, branding), price (cost-plus, penetration, skimming, competitive, psychological, price discrimination; PED and YED calculations and their use), promotion (above and below the line, the promotional mix, digital marketing, promotion budgets), place (channels of distribution and their choice), and for services people, process and physical evidence; an integrated mix for a given case',
        'Operations: the production process, adding value, productivity and efficiency (labour productivity, unit costs), job, batch and flow production and when each suits, capacity utilisation and its calculation, outsourcing, inventory control (buffer stock, re-order level, lead time, the stock control chart, JIT), lean production (kaizen, cell production, waste reduction), quality control vs quality assurance, TQM, benchmarking, location decisions (quantitative and qualitative factors), supply chain management',
        'A Level: marketing analytics (sales forecasting, moving averages, correlation), international marketing and pan-global vs local strategies, operations planning, network analysis with critical paths and floats, enterprise resource planning',
      ],
      hard: [
        'Using a calculated PED to recommend a price change for the case\'s product and quantify the effect on revenue',
        'Recommending a production method or a move to lean production for the case\'s business, weighing the capital cost and the workforce\'s skills',
        'Judging whether low capacity utilisation should be met by rationalisation, new products or lower prices, from the case\'s data',
        'A critical path found from a network with the float on non-critical activities and what a delay would do',
      ],
      traps: [
        'PED reported as positive and read as elastic because "demand changed a lot"',
        'market share worked out as the business\'s sales over its own previous sales',
        'penetration pricing confused with skimming',
        'quality control (inspection at the end) described as quality assurance (built in at every stage)',
        'JIT recommended without the reliable suppliers it needs',
      ],
      exemplars: [
        `NUM_QUESTION: A business raises the price of its reusable water bottle from $10 to $12. Weekly sales fall from 500 units to 300 units. Calculate the price elasticity of demand for the bottle.
Answer: -2 | 2
Explanation: Percentage change in quantity = (300 - 500)/500 × 100 = -40%; percentage change in price = (12 - 10)/10 × 100 = +20%. PED = -40% ÷ 20% = -2, so demand is price elastic and weekly revenue falls from $5,000 to $3,600; the price rise was a mistake. The usual slips are dividing the price change by the quantity change (-0.5) or measuring the changes from the new values.`,
        `SA_QUESTION: Read the case study and answer the question.
\`\`\`passage
Tasty Treats Ltd (TT)

TT makes premium biscuits in batches of 2,000 at a factory in a small town. Demand has grown by 30% in two years after a supermarket chain listed two of its products. The factory is at 95% capacity utilisation and the production manager, Priya, says staff are working overtime every week and quality complaints have risen from 2 to 9 per month. TT holds six weeks of ingredients in stock because its flour supplier is 400 km away and deliveries are often late. The directors are considering moving from batch production to a flow production line costing $600,000, which would double capacity, or outsourcing production of the two supermarket products to a larger manufacturer.
\`\`\`
Analyse two advantages to TT of introducing lean production methods. [8]
Sample Answer: Marked for knowledge (2), application to TT (2), analysis (4). Advantage 1: reducing inventory. Lean production aims to hold the minimum inventory (just-in-time), so TT could cut its six weeks of ingredients, releasing cash tied up in flour and sugar and reducing storage and wastage costs; however, with a supplier 400 km away whose deliveries are often late, TT would first need a nearer or more reliable supplier, so the cash benefit depends on changing the supply chain. Advantage 2: kaizen and quality. Continuous improvement involves production staff in finding small improvements, and building quality in at each stage (quality assurance) rather than inspecting at the end; for TT, whose complaints have risen from 2 to 9 a month while staff work overtime, this could cut the cost of returned batches and protect the supermarket listing that drove its growth, though staff working overtime every week may have little time for improvement meetings until capacity is raised. Also credited: cell production improving flexibility between batches, waste reduction lowering unit costs. Does not score: a textbook list of lean techniques with no reference to TT's stock, complaints or supplier.`,
        `MC_QUESTION: A soft-drinks business finds that sales of its original cola have been falling for three years while its market share is still the largest in the category. Which marketing strategy is most consistent with the product life cycle model at this stage?
A) An extension strategy such as a new flavour or new packaging
B) Penetration pricing to build initial sales
C) Heavy informative advertising to make customers aware of the product
D) Withdrawing the product from the market immediately
Correct Answer: A
Explanation: Falling sales after a long period of leadership point to the decline stage, where extension strategies (new variants, new uses, repositioning, new markets) aim to revive sales. B and C belong to introduction; withdrawal (D) is premature while the product still leads its category and earns cash.`,
      ],
    },
    {
      id: 'finance-accounting',
      name: 'Finance and accounting (sources of finance, costs, break-even, budgets, cash flow forecasts, financial statements, ratio analysis, investment appraisal)',
      share: 'about a quarter of the AS papers, with ratio analysis and investment appraisal at A Level',
      detect: /\b(finance|source\w* of finance|start[- ]up capital|working capital|overdraft\w*|loan\w*|debenture\w*|venture capital|share issue|retained (?:profit|earnings)|leasing|hire purchase|trade credit|debt factoring|crowdfunding|cost\w*|fixed cost\w*|variable cost\w*|direct cost\w*|indirect cost\w*|overhead\w*|contribution|break[- ]even|margin of safety|full costing|absorption|marginal costing|budget\w*|variance\w*|cash flow|cash[- ]flow forecast|liquidity|income statement|profit and loss|gross profit|operating profit|net profit|statement of financial position|balance sheet|asset\w*|liabilit\w+|equity|depreciation|ratio\w*|current ratio|acid test|profit margin|return on capital employed|roce|gearing|dividend\w*|investment appraisal|payback|average rate of return|arr\b|net present value|npv|discount\w* (?:factor|rate)\w*)\b/i,
      skills: [
        'Sources of finance: the need for finance (start-up, working capital, expansion), internal (retained profit, sale of assets, working capital) and external (share issue, loans, debentures, overdraft, trade credit, leasing, hire purchase, debt factoring, venture capital, crowdfunding, grants); choosing by purpose, duration, cost, control and gearing; the finance available to each legal structure',
        'Costs: fixed, variable, direct, indirect and semi-variable; full (absorption) costing and contribution (marginal) costing and the decisions each supports (accept a special order below full cost, stop a product); break-even output, the break-even chart, margin of safety and the effect of price and cost changes; limitations of break-even analysis',
        'Budgets and cash flow: purposes of budgets, flexible budgets, adverse and favourable variances and their causes, cash flow forecasts (opening balance, inflows, outflows, net cash flow, closing balance), causes of cash flow problems and how to improve cash flow (not the same as profit)',
        'Financial statements: the income statement (revenue, cost of sales, gross profit, expenses, operating profit, finance costs, tax, profit for the year, dividends and retained profit) and the statement of financial position (non-current and current assets, current and non-current liabilities, working capital, shareholders\' equity), depreciation (straight line) and its effect, intangible assets and goodwill',
        'Ratio analysis: liquidity (current ratio, acid test), profitability (gross and operating profit margins, return on capital employed), financial efficiency (inventory turnover, trade receivables days), gearing, investor ratios (dividend yield, price/earnings), with their interpretation, comparison over time and against competitors, and the limitations of ratios',
        'Investment appraisal: payback period, average rate of return, net present value with discount factors given, qualitative factors, and the judgement between projects for a business with a given cash position and objectives',
      ],
      hard: [
        'A break-even calculation followed by the effect of a price cut and a rise in demand on profit, with a recommendation',
        'Reading a cash flow forecast to find the month of greatest need and the best source of finance for it (overdraft vs loan vs factoring) for this business',
        'Comparing two investments where payback and ARR disagree and the judgement must use the case\'s cash position and risk appetite',
        'Interpreting a falling current ratio alongside a rising inventory turnover to decide whether liquidity is really a problem',
      ],
      traps: [
        'profit and cash treated as the same thing',
        'break-even found as fixed costs ÷ price',
        'the acid test computed without removing inventory',
        'gearing worked out with current liabilities',
        'ARR computed on total profit rather than the average annual profit, or on the profit before deducting the investment',
      ],
      exemplars: [
        `NUM_QUESTION: A business making garden furniture has fixed costs of $60,000 a year. Each table sells for $25 and has variable costs of $15. Calculate the break-even output, in tables per year.
Answer: 6000 | 6,000
Explanation: Contribution per table = $25 - $15 = $10. Break-even output = fixed costs ÷ contribution per unit = $60,000 ÷ $10 = 6,000 tables. Dividing by the price ($60,000 ÷ 25 = 2,400) is the usual slip. If the business expects to sell 7,500 tables, its margin of safety is 1,500 tables.`,
        `SA_QUESTION: Read the case study and answer the question.
\`\`\`passage
Riverside Gyms plc (RG)

RG runs 14 gyms. Its finance director has warned that trade payables are being paid late because of cash-flow problems after two new gyms opened in the same year. RG is considering one of two options to raise revenue. Option A is a new app and online coaching service; Option B is extending opening hours at every gym with new staff. Each option costs $200,000 and the forecast net cash flows are shown in Table 1. RG's directors have said that any investment must "pay for itself quickly".
\`\`\`
\`\`\`graph
kind: table
title: Table 1: forecast net cash flows ($000)
columns: Year | Option A | Option B
row: 1 | 60 | 100
row: 2 | 80 | 100
row: 3 | 80 | 30
row: 4 | 60 | 30
\`\`\`
(a) Calculate the payback period and the average rate of return (ARR) for Option A. Show your working. [4]
(b) Recommend which option RG should choose. Justify your recommendation. [12]
Sample Answer: (a) Payback: after 2 years $140,000 has come back; $60,000 of year 3's $80,000 is still needed, so payback = 2 + 60/80 = 2.75 years (2 years 9 months) [2]. ARR: total inflows $280,000 - $200,000 cost = $80,000 profit over 4 years = $20,000 a year; ARR = 20,000 ÷ 200,000 × 100 = 10% [2]. (For comparison, Option B: payback 2.0 years; profit $60,000 over 4 years = $15,000 a year; ARR 7.5%.) (b) Level 3 (9-12): a recommendation justified from RG's situation using both methods and a qualitative factor. Model answer: RG should choose Option B. Its payback of exactly 2 years meets the directors' demand that an investment "pay for itself quickly", and returning $100,000 in each of the first two years matters most to a business that is already paying its trade payables late; Option A's higher ARR (10% against 7.5%) comes from cash in years 3 and 4 that RG may not survive to see. Against this, Option B's flows fall to $30,000 after year 2, so it is a short-term fix with extra staff costs continuing, while an app could grow the business beyond its 14 sites; if RG can secure an overdraft to cover the next year, Option A's longer-term return would be worth more. On balance the liquidity problem decides it: B now, and revisit the app once cash flow recovers. Level 2 (5-8): both calculations used but the judgement is not tied to RG's cash position. Level 1 (1-4): a choice stated with reasons that could apply to any business. Does not score: "it depends" with no decision.`,
        `MC_QUESTION: At the end of its financial year a business has current assets of $180,000, of which inventory is $60,000, and current liabilities of $120,000. Which pair of ratios is correct?
A) Current ratio 1.5 : 1, acid test ratio 1.0 : 1
B) Current ratio 1.5 : 1, acid test ratio 1.5 : 1
C) Current ratio 1.0 : 1, acid test ratio 0.5 : 1
D) Current ratio 2.0 : 1, acid test ratio 1.5 : 1
Correct Answer: A
Explanation: Current ratio = 180,000 ÷ 120,000 = 1.5; acid test = (180,000 - 60,000) ÷ 120,000 = 1.0. Choice B forgets to remove inventory; C removes it from both ratios; D treats inventory as a liability.`,
      ],
    },
  ],
  difficulty: AICE_DIFFICULTY,
}
