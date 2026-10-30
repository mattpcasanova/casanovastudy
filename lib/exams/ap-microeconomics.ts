// The AP Microeconomics exam as a reference for the guide prompts: Section I
// multiple choice (five options A-E, many on a graph, table or payoff matrix)
// and Section II free response (one long FRQ with a correctly labeled graph,
// two short ones; scored by points). Units 1-6 grouped into four domains.

import type { ExamProfile } from './types'

export const AP_MICRO: ExamProfile = {
  id: 'ap-microeconomics',
  pace: 70,
  name: 'the AP Microeconomics exam',
  detect: {
    exam: /\bAP\s+Micro(?:economics)?\b/i,
    subjectHints: /./,
    subjects: ['business', 'mathematics', 'history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+Micro(?:economics)?\b/i,
  },
  itemRules: `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):
- Multiple-choice items have exactly five options A-E, as on Section I of the AP Microeconomics exam. No true/false, no "I, II and III" lists. About half the items sit on a stimulus: a market or cost-curve diagram, a table of output and costs, a production-possibilities table, or a payoff matrix. Give a diagram as a \`\`\`graph fence (kind: plane with x: and y: ranges, plot: or line: for the curves with " | S" / " | D" / " | MC" labels, point: for an equilibrium, vline:/hline: for a price floor or quantity; never label the value being asked for) when the numbers are set, or describe it in a \`\`\`passage fence ("The graph shows a perfectly competitive firm whose price is above average total cost at the profit-maximizing quantity ..."); give a table as a kind: table figure (columns: | Quantity | Total cost | ...; one row: per line). Items that share a stimulus each repeat it, so every item stands alone.
- Stems are the exam's: "Based on the table, the marginal cost of the third unit is", "Which of the following will most likely occur in the market for X if ...?", "If the government imposes a price ceiling at P1, the result will be", "A profit-maximizing monopolist will produce the quantity at which", "In the long run, firms in this industry will ... because", "The deadweight loss created by the tax is represented by the area", "The dominant strategy for Firm A is". Options are five parallel statements or five values; the wrong ones come from the usual confusions (see WRONG ANSWERS ARE BUILT FROM), and value options include the number from a one-step slip.
- Free-response items are SA_QUESTION, one per part, in the exam's voice: "Draw a correctly labeled graph of ... and show each of the following: (i) ..., (ii) ...", "Calculate ... Show your work.", "Explain why ...", "Identify whether ... will increase, decrease or stay the same. Explain." The Sample Answer is the scoring guideline: what each point requires (the labeled axes and curves, the equilibrium marked and labeled, the shaded area; a numerical answer with the work; an explanation that uses the mechanism, "price above marginal cost, so consumers value the next unit more than it costs to make, so output is below the efficient level"). A graph part's answer describes the drawing in words.
- NUM_QUESTION only for a real calculation (profit, total revenue, marginal cost, price elasticity by the midpoint method as the course uses it, deadweight loss as a triangle area, a tax's incidence), at most one in six items; accept equivalent forms ("Answer: 150 | 150.0").
- Every number must work: compute each key from the table or graph before writing the item, and fix the numbers rather than leaving a note. Firm and product names are generic (Firm A, a wheat farmer); never a real company's actual figures.
- Explanations stay short: the rule applied (MR = MC, P = min ATC, a shift vs a movement) and the trap in the most tempting wrong option.`,
  domains: [
    {
      id: 'basics-supply-demand',
      name: 'Units 1-2: Basic Economic Concepts; Supply and Demand',
      share: 'about 32-40% of the test',
      detect: /\b(unit [12]\b|scarcity|opportunity cost|production possibilit\w+|PPC|PPF|comparative advantage|absolute advantage|terms of trade|specializ\w+|marginal analysis|marginal benefit|utility|diminishing marginal|consumer choice|budget constraint|demand|supply|equilibrium|shortage|surplus|shift\w*|determinant\w*|substitute\w*|complement\w*|normal good|inferior good|elasticit\w+|inelastic|elastic|midpoint|cross[- ]price|income elasticity|total revenue test|consumer surplus|producer surplus|deadweight|price ceiling|price floor|tax incidence|excise tax|subsid\w+|quota|tariff|international trade|world price)\b/i,
      skills: [
        'Scarcity, opportunity cost and the production possibilities curve (shape, efficiency, growth); comparative advantage from output or input data and the range of mutually beneficial terms of trade',
        'Marginal analysis and consumer choice: diminishing marginal utility, the utility-maximizing rule (MU per dollar equal across goods), budget constraints',
        'Supply and demand: determinants, shifts vs movements along a curve, equilibrium and how a change in one or both curves moves price and quantity (indeterminate cases)',
        'Elasticity: price elasticity of demand and supply (midpoint method, determinants), the total revenue test, cross-price and income elasticity and what their signs mean',
        'Market efficiency and government intervention: consumer and producer surplus, deadweight loss, binding price ceilings and floors, per-unit taxes and subsidies (incidence depends on relative elasticities), quotas; international trade with a world price, tariffs',
      ],
      hard: [
        'A comparative-advantage item from input data (hours per unit), where the student must invert before comparing',
        'A double shift (demand and supply both change) where only price or only quantity is determinate',
        'Tax incidence reasoned from relative elasticities: who bears more when demand is inelastic',
        'The total revenue test applied to a described price change to classify demand, or deadweight loss computed from a graph as a triangle',
      ],
      traps: ['comparative advantage judged from absolute output', 'a shift of the curve confused with a movement along it', 'a non-binding price control treated as binding', 'elastic and inelastic swapped on the total revenue test', 'the tax burden assigned to whoever legally pays it'],
      exemplars: [
        `MC_QUESTION: Based on the table, which of the following statements is true?
\`\`\`graph
kind: table
title: Output per worker per day
columns: | Bushels of wheat | Bolts of cloth
row: Country A | 40 | 20
row: Country B | 10 | 10
\`\`\`
A) Country A has a comparative advantage in both goods.
B) Country B has a comparative advantage in wheat.
C) Country A has a comparative advantage in cloth, and Country B in wheat.
D) Country A has a comparative advantage in wheat, and Country B in cloth.
E) Neither country can gain from trade because Country A has an absolute advantage in both goods.
Correct Answer: D
Explanation: A's opportunity cost of a bushel of wheat is 0.5 bolt; B's is 1 bolt, so A has the comparative advantage in wheat and B (1 bushel per bolt vs A's 2) in cloth. Absolute advantage in both (E) does not rule out gains from trade.`,
        `MC_QUESTION: The market for gasoline is in equilibrium. A hurricane shuts down several refineries at the same time that a popular new electric car sharply reduces the demand for gasoline. In the gasoline market, the equilibrium price will
A) rise, and the equilibrium quantity will fall
B) fall, and the equilibrium quantity will fall
C) be indeterminate, and the equilibrium quantity will fall
D) rise, and the equilibrium quantity will be indeterminate
E) be indeterminate, and the equilibrium quantity will rise
Correct Answer: C
Explanation: Supply shifts left (price up, quantity down) and demand shifts left (price down, quantity down): quantity falls for sure, while the price change depends on which shift is larger.`,
      ],
    },
    {
      id: 'production-perfect-competition',
      name: 'Unit 3: Production, Cost, and the Perfect Competition Model',
      share: 'about 22-25% of the test',
      detect: /\b(unit 3\b|production function|marginal product|diminishing (marginal )?returns|total product|average product|fixed cost\w*|variable cost\w*|total cost|marginal cost|average total cost|ATC|AVC|AFC|MC|short[- ]run cost|long[- ]run cost|economies of scale|diseconomies|constant returns|minimum efficient scale|profit maximi\w+|MR\s*=\s*MC|marginal revenue|price taker|perfect\w* competiti\w+|shutdown|shut down|break[- ]even|economic profit|accounting profit|normal profit|explicit cost|implicit cost|long[- ]run equilibrium|entry|exit|allocative efficien\w+|productive efficien\w+|constant[- ]cost industry|increasing[- ]cost)\b/i,
      skills: [
        'Production in the short run: total, marginal and average product, diminishing marginal returns, and the link between marginal product and marginal cost',
        'Costs: fixed, variable, total, marginal and the averages; the shape and relationships of the curves (MC crosses AVC and ATC at their minimums); explicit vs implicit costs and economic vs accounting profit; long-run average cost and economies of scale',
        'Profit maximization: MR = MC for every firm; for a price taker P = MR = AR = D; profit or loss as (P - ATC) x Q; the shutdown rule (P below minimum AVC) and the firm\'s supply curve',
        'Long-run equilibrium in perfect competition: entry and exit drive economic profit to zero, P = MC = minimum ATC, allocative and productive efficiency; constant-, increasing- and decreasing-cost industries',
      ],
      hard: [
        'Costs computed from a table with a gap (marginal cost of the fourth unit from total costs, fixed cost from the zero-output row)',
        'The shutdown decision from a price between minimum AVC and minimum ATC (produce at a loss in the short run)',
        'What happens to price, firm output and the number of firms when demand rises in a constant-cost industry, in the short run and the long run',
        'Economic profit from a description that gives accounting profit and an implicit cost',
      ],
      traps: ['accounting profit taken for economic profit', 'shutting down whenever profit is negative', 'MC compared with ATC instead of AVC for the shutdown rule', 'the market demand curve drawn for the individual price-taking firm', 'diminishing returns confused with diseconomies of scale'],
      exemplars: [
        `MC_QUESTION: The table shows a firm's short-run total costs. The marginal cost of the third unit of output is
\`\`\`graph
kind: table
columns: | Quantity | Total cost ($)
row: 0 | 60
row: 1 | 90
row: 2 | 110
row: 3 | 140
row: 4 | 190
\`\`\`
A) $20
B) $30
C) $46.67
D) $50
E) $140
Correct Answer: B
Explanation: Marginal cost is the change in total cost: $140 - $110 = $30. $46.67 (C) is average total cost at 3 units, and $50 (D) is the marginal cost of the fourth unit.`,
        `MC_QUESTION: A perfectly competitive firm is producing the output at which marginal revenue equals marginal cost. At that output, price is $8, average total cost is $10, and average variable cost is $7. In the short run, the firm should
A) shut down, because it is earning a loss
B) continue producing, because price exceeds average variable cost
C) raise its price to $10 to cover average total cost
D) increase output until price equals average total cost
E) continue producing, because it is earning an economic profit
Correct Answer: B
Explanation: Price ($8) covers average variable cost ($7), so producing loses less than shutting down and paying all fixed costs; a price taker cannot raise its price (C), and a loss alone does not mean shutting down (A).`,
      ],
    },
    {
      id: 'imperfect-competition',
      name: 'Unit 4: Imperfect Competition',
      share: 'about 15-22% of the test',
      detect: /\b(unit 4\b|monopol\w+|natural monopoly|barrier\w* to entry|price maker|price discriminat\w+|regulat\w+|fair[- ]return|socially optimal|monopolistic\w* competiti\w+|excess capacity|product differentiation|oligopol\w+|game theory|payoff matrix|dominant strategy|Nash equilibrium|collusion|cartel|prisoner|kinked|market power|Lerner|concentration ratio|HHI|antitrust|deadweight loss of monopoly)\b/i,
      skills: [
        'Monopoly: sources of market power, the downward-sloping MR curve below demand, profit maximization at MR = MC with price read from demand, deadweight loss, natural monopoly and regulation (fair-return vs socially optimal price), price discrimination (perfect discrimination removes deadweight loss and consumer surplus)',
        'Monopolistic competition: differentiated products, short-run profit or loss, long-run zero profit with excess capacity (P = ATC above its minimum, P > MC)',
        'Oligopoly: interdependence, collusion and cartels, game theory with a payoff matrix (dominant strategy, Nash equilibrium, the prisoner\'s dilemma), why cartels break down',
      ],
      hard: [
        'A monopolist\'s profit computed from a described graph: price from demand at the MR = MC quantity, cost from ATC at that quantity',
        'A payoff matrix where one firm has a dominant strategy and the other does not, so the Nash equilibrium must be found by best responses',
        'The effect of a per-unit tax or a lump-sum tax on a monopolist\'s output and price',
        'Monopolistic competition in the long run: why P = ATC but the outcome is still not efficient',
      ],
      traps: ['price read off the MR curve instead of the demand curve', 'a monopolist assumed to produce where demand meets MC', 'Nash equilibrium confused with the outcome that is best for both firms jointly', 'long-run zero profit in monopolistic competition read as efficiency', 'a natural monopoly\'s fair-return price set where P = MC'],
      exemplars: [
        `MC_QUESTION: Two firms, A and B, each choose a high or low advertising budget. The payoffs (A's profit, B's profit) in millions are shown. Which of the following is true?
\`\`\`graph
kind: table
title: Payoff matrix (A's profit, B's profit)
columns: | B: High | B: Low
row: A: High | (4, 4) | (9, 2)
row: A: Low | (2, 9) | (7, 7)
\`\`\`
A) Both firms have a dominant strategy to choose Low.
B) Both firms have a dominant strategy to choose High, and the Nash equilibrium is (High, High).
C) Firm A has a dominant strategy, but Firm B does not.
D) The Nash equilibrium is (Low, Low), because it gives each firm the highest joint profit.
E) There is no Nash equilibrium in this game.
Correct Answer: B
Explanation: Whatever B does, A earns more with High (4 vs 2; 9 vs 7), and the game is symmetric for B, so both choose High. (Low, Low) pays more to each (7, 7) but is not an equilibrium, since either firm gains by switching.`,
      ],
    },
    {
      id: 'factor-markets-market-failure',
      name: 'Units 5-6: Factor Markets; Market Failure and the Role of Government',
      share: 'about 23-33% of the test',
      detect: /\b(unit [56]\b|factor market\w*|resource market\w*|derived demand|labor market|wage\w*|marginal revenue product|MRP|marginal factor cost|MFC|marginal resource cost|least[- ]cost|monopson\w+|minimum wage|union\w*|market failure|externalit\w+|spillover|marginal social|marginal private|Pigouvian|corrective tax|public good\w*|free[- ]rider|non[- ]?rival|non[- ]?excludable|common resource|tragedy of the commons|asymmetric information|adverse selection|moral hazard|income inequality|Lorenz|Gini|progressive tax|regressive tax|proportional tax|redistribution|antitrust)\b/i,
      skills: [
        'Factor markets: derived demand, marginal revenue product and the hiring rule (MRP = MFC), the wage-taking firm vs a monopsonist (MFC above supply, lower wage and employment), the least-cost combination of inputs (MP per dollar equal), minimum wages and unions',
        'Externalities: marginal social vs private cost and benefit, overproduction with a negative externality and underproduction with a positive one, deadweight loss, corrective (Pigouvian) taxes and subsidies, property rights',
        'Public goods and common resources: non-rivalry and non-excludability, the free-rider problem, the tragedy of the commons; asymmetric information (adverse selection, moral hazard)',
        'Income distribution and taxation: Lorenz curve and Gini coefficient, progressive, regressive and proportional taxes, the effects of redistribution',
      ],
      hard: [
        'The profit-maximizing number of workers from a table of output and a product price, with the wage given',
        'A monopsonist\'s wage and employment read from a described graph (MFC above the supply curve, wage read off supply)',
        'The size of a corrective tax that fixes a negative externality (the marginal external cost at the efficient quantity, not at the market quantity)',
        'Classifying a good from a description as public, common resource, club or private using both rivalry and excludability',
      ],
      traps: ['hiring until MRP equals price of output instead of the wage', 'the monopsonist\'s wage read off MFC instead of supply', 'a corrective tax set equal to the external cost at the market quantity', 'a non-rival but excludable good called a public good', 'a progressive tax identified by the dollar amount paid rather than the share of income'],
      exemplars: [
        `MC_QUESTION: A competitive firm sells its output for $4 per unit and hires workers at a market wage of $70 per day. Based on the table, how many workers should the firm hire to maximize profit?
\`\`\`graph
kind: table
columns: | Workers | Total output per day
row: 0 | 0
row: 1 | 30
row: 2 | 55
row: 3 | 75
row: 4 | 90
row: 5 | 100
\`\`\`
A) 1
B) 2
C) 3
D) 4
E) 5
Correct Answer: C
Explanation: Marginal revenue products are $120, $100, $80, $60, $40 (marginal product times the $4 price). The third worker adds $80, more than the $70 wage; the fourth adds only $60, so the firm hires three. Comparing marginal product to the wage without multiplying by price is the usual slip.`,
        `SA_QUESTION: The production of paper by a competitive industry releases pollutants into a river, imposing a constant marginal external cost of $5 per ton on downstream communities. (a) Draw a correctly labeled graph of the paper market and show the market equilibrium quantity, labeled Q1, and the socially optimal quantity, labeled Q2. (b) Identify the per-unit tax that would lead the market to produce Q2. (c) Explain why the market produces more than the socially optimal quantity without the tax.
Sample Answer: (a) 2 points: axes labeled Price and Quantity of paper, a downward-sloping demand curve labeled D = MSB and an upward-sloping supply curve labeled S = MPC, with a second curve MSC drawn parallel above supply; Q1 at the intersection of D and MPC, Q2 at the intersection of D and MSC, with Q2 left of Q1. (b) 1 point: a per-unit tax of $5, equal to the marginal external cost, which shifts MPC up to MSC. (c) 1 point: producers consider only their private costs, so for units between Q2 and Q1 the price buyers pay covers the private cost but not the full social cost; those units cost society more than they are worth, and the market still makes them. "Because of pollution" alone earns nothing.`,
      ],
    },
  ],
  difficulty: {
    standard: `DIFFICULTY ON THIS TEST: the real mix minus the definition items. At most 1 item in 8 that only asks what a term means, never first in a section; about half typical (one rule applied to one graph or table) and at least a third of the kind under WHAT HARD LOOKS LIKE. Free-response parts must need the mechanism or a correct calculation, not a term.`,
    hard: `DIFFICULTY ON THIS TEST: the items that separate a 4 from a 5. At least 4 of every 5 items must be ones a student headed for a 3 would miss: two-step calculations from a table, double shifts with an indeterminate outcome, a shutdown or long-run entry decision from numbers, a monopolist's or monopsonist's outcome read off a described graph, a payoff matrix without a dominant strategy for one player, a corrective tax sized at the efficient quantity, and FRQ parts where one unlabeled curve loses the point. Hard never means trivia outside the course framework.`,
    easier: `DIFFICULTY ON THIS TEST: the items most students get right, one rule each, with the graph or table stated plainly. Still real exam items in the exam's voice.`,
  },
}
