// The AP United States History exam as a reference for the guide prompts.
// Periods 1-9 (1491 to the present) grouped into four domains; item rules
// and difficulty shared with AP World (ap-history.ts).

import type { ExamProfile } from './types'
import { AP_HISTORY_DIFFICULTY, AP_HISTORY_ITEM_RULES } from './ap-history'

export const AP_USH: ExamProfile = {
  id: 'ap-ush',
  pace: 60,
  name: 'the AP United States History exam',
  detect: {
    exam: /\b(?:APUSH|AP\s+(?:US|U\.S\.|United States|American)\s+History)\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: /\b(?:APUSH|AP\s+(?:US|U\.S\.|United States|American)\s+History)\b/i,
  },
  itemRules: AP_HISTORY_ITEM_RULES('the AP U.S. History exam'),
  domains: [
    {
      id: 'colonial-founding',
      name: 'Periods 1-3: 1491-1800 (contact, colonies, revolution and the early republic)',
      share: 'about 22% of the test',
      detect: /\b(period [123]\b|unit [123]\b|1491|columbian exchange|encomienda|pueblo revolt|jamestown|chesapeake|new england|puritan|middle passage|triangular trade|mercantilism|navigation acts|salutary neglect|great awakening|enlightenment|french and indian|seven years|proclamation of 1763|stamp act|townshend|boston|coercive|intolerable|continental congress|declaration of independence|revolution\w*|articles of confederation|shays|constitution\w*|federalist|anti[- ]federalist|bill of rights|hamilton|jefferson|washington'?s|neutrality|xyz|alien and sedition|election of 1800)\b/i,
      skills: [
        'Period 1 (1491-1607): Native societies before contact, the Columbian Exchange, Spanish colonization (encomienda, the casta system), European and Native views of land and labor',
        'Period 2 (1607-1754): regional colonial differences (Chesapeake, New England, Middle, Southern), the Atlantic slave trade and the development of slavery, mercantilism and salutary neglect, the Great Awakening and the Enlightenment, Anglicization and colonial self-government',
        'Period 3 (1754-1800): the Seven Years\' War and imperial reorganization, colonial resistance and republican ideology, the Revolution and its limits (women, enslaved people, Native nations), the Articles of Confederation and the Constitution (compromises, ratification debate), the first party system, Washington\'s and Adams\'s administrations, the "Revolution of 1800"',
      ],
      hard: [
        'A colonial source whose region must be inferred from its labor system or religion before the question can be answered',
        'Causation between the Seven Years\' War\'s debt and the imperial policies of the 1760s, against options from the 1770s',
        'The ratification debate: which argument is Federalist and which Anti-Federalist, from an excerpt without names',
        'Continuity and change for groups the Revolution did not free, against options that overstate the change',
      ],
      traps: ['a 1770s development offered as the cause of a 1760s protest', 'New England and Chesapeake characteristics swapped', 'the Articles\' weaknesses attributed to the Constitution', 'the Revolution read as ending slavery nationally'],
      exemplars: [
        `MC_QUESTION: The sentiments expressed in the excerpt most directly reflect which of the following?
\`\`\`passage
Resolutions adopted at a town meeting in a Massachusetts port, 1765

That the only representatives of the people of this province are persons chosen by themselves, and that no taxes ever have been or can be constitutionally imposed on them but by their respective legislatures. That the late act of Parliament, by imposing duties on stamped paper, is an infringement of our rights.
\`\`\`
A) Colonial acceptance of Parliament's authority to regulate trade but not to levy internal taxes
B) A desire for immediate independence from Great Britain
C) Opposition to the Proclamation of 1763's limits on westward settlement
D) Support for the policy of salutary neglect as formal imperial law
Correct Answer: A
Explanation: The resolutions object to a direct tax (the Stamp Act) on the ground of representation, the 1765 position; independence (B) was not a widespread demand for another decade.`,
        `SA_QUESTION: a) Briefly describe ONE specific way the Seven Years' War (French and Indian War) changed the relationship between Great Britain and its North American colonies. b) Briefly explain ONE specific colonial response to that change in the period 1763-1775.
Sample Answer: a) One point for a specific change: Britain's war debt and the cost of defending new territory led Parliament to tax the colonies directly for the first time (the Sugar Act of 1764, the Stamp Act of 1765) and to station troops in America, ending salutary neglect. b) One point for a specific response with explanation: colonists organized boycotts of British goods through nonimportation agreements and groups such as the Sons of Liberty, arguing that only their own assemblies could tax them; the Stamp Act Congress (1765) coordinated this protest. "Colonists got angry" earns nothing without a specific action and its reasoning.`,
      ],
    },
    {
      id: 'republic-civil-war',
      name: 'Periods 4-5: 1800-1877 (the early republic, expansion, sectional crisis, Civil War and Reconstruction)',
      share: 'about 25% of the test',
      detect: /\b(period [45]\b|unit [45]\b|marshall court|marbury|mcculloch|louisiana purchase|war of 1812|era of good feelings|missouri compromise|monroe doctrine|market revolution|erie canal|lowell|second great awakening|abolition\w*|seneca falls|jackson\w*|nullification|indian removal|trail of tears|whig|manifest destiny|mexican[- ]american war|texas|oregon|wilmot|compromise of 1850|fugitive slave|kansas[- ]nebraska|dred scott|lincoln|secession|civil war|emancipation|gettysburg|reconstruction|freedmen|13th|14th|15th amendment|black codes|sharecropp\w+|compromise of 1877|redeemers)\b/i,
      skills: [
        'Period 4 (1800-1848): the Marshall Court and federal power, the War of 1812 and nationalism, the Market Revolution (transportation, factories, the cotton economy), the Second Great Awakening and reform (abolition, temperance, women\'s rights), Jacksonian democracy, the Bank War, Indian Removal, the Missouri Compromise',
        'Period 5 (1844-1877): Manifest Destiny and the Mexican-American War, the sectional crisis (Wilmot Proviso, Compromise of 1850, Kansas-Nebraska Act, Dred Scott), the rise of the Republican Party, secession and the Civil War (Union advantages, emancipation as a war aim), Reconstruction (Presidential vs Radical, the Reconstruction Amendments, Black political participation, sharecropping, the end of Reconstruction in 1877)',
      ],
      hard: [
        'A source on expansion whose author\'s section and interest (free soil vs slavery\'s extension) must be inferred',
        'Why each 1850s compromise failed, against options that describe the previous compromise',
        'Reconstruction\'s achievements and limits in the same item (the 15th Amendment and sharecropping)',
        'The Market Revolution\'s regional effects (Northern factories and Southern cotton) as linked, not separate, developments',
      ],
      traps: ['the Missouri Compromise and the Compromise of 1850 swapped', 'emancipation presented as the Union\'s war aim from 1861', 'Reconstruction read as a complete success or a complete failure', 'Jackson\'s democracy applied to women and Black Americans'],
      exemplars: [
        `MC_QUESTION: The excerpt is best understood in the context of which of the following?
\`\`\`passage
Letter from a farmer in Illinois to his brother, 1854

The Nebraska bill has stirred this country as nothing before it. Men who voted the Democratic ticket all their lives say they will never again vote for a party that would open the free territory to slavery. There is talk in every town of a new party of all who oppose the extension.
\`\`\`
A) The collapse of the Second Party System and the emergence of the Republican Party
B) The debate over the annexation of Texas as a slave state
C) Southern reaction to the Wilmot Proviso
D) Northern enforcement of the Fugitive Slave Act of 1850
Correct Answer: A
Explanation: The Kansas-Nebraska Act of 1854 repealed the Missouri Compromise line and drove antislavery Democrats and Whigs toward a new party. B and C are earlier events; D is a different grievance.`,
      ],
    },
    {
      id: 'gilded-age-wwii',
      name: 'Periods 6-7: 1865-1945 (industrialization, the Gilded Age, Progressivism, the World Wars and the New Deal)',
      share: 'about 30% of the test',
      detect: /\b(period [67]\b|unit [67]\b|gilded age|industrializ\w+|railroad|carnegie|rockefeller|trust|social darwinism|gospel of wealth|labor union|knights of labor|AFL|haymarket|pullman|homestead strike|populis\w+|farmers'? alliance|immigration|nativis\w+|chinese exclusion|urbanization|political machine|jim crow|plessy|new south|progressiv\w+|muckraker|settlement house|hull house|sherman antitrust|imperialis\w+|spanish[- ]american|philippines|roosevelt corollary|world war i|wilson|fourteen points|league of nations|red scare|1920s|harlem renaissance|prohibition|great depression|new deal|dust bowl|world war ii|pearl harbor|japanese internment|home front)\b/i,
      skills: [
        'Period 6 (1865-1898): industrial growth and big business, labor organizing and its limits, the New South and Jim Crow, the West (railroads, Native dispossession, the Dawes Act), immigration and nativism, urban political machines, Populism and the gold standard debate, Gilded Age politics',
        'Period 7 (1890-1945): Progressive reform (muckrakers, regulation, the 16th-19th Amendments), American imperialism and the Spanish-American War, World War I at home and abroad (Wilson, the League fight), the 1920s (consumerism, nativism, the Harlem Renaissance, Prohibition), the Great Depression and the New Deal (relief, recovery, reform; critics left and right), World War II (mobilization, the home front, internment, the atomic bomb)',
      ],
      hard: [
        'A Populist or labor source read for the specific grievance (railroad rates, the gold standard, the eight-hour day) against options that are general discontent',
        'Progressivism\'s limits on race alongside its reforms, in one item',
        'Causes of the Great Depression distinguished from its effects and from the New Deal\'s responses',
        'Continuity and change in federal power from the Gilded Age through the New Deal',
      ],
      traps: ['Populists and Progressives conflated', 'the New Deal credited with ending the Depression', 'World War I and World War II home-front developments swapped', 'the Dawes Act read as protecting Native land'],
      exemplars: [
        `MC_QUESTION: A historian could best use the excerpt as evidence for which of the following?
\`\`\`passage
Platform of a farmers' political convention, Nebraska, 1892

We demand that the government own and operate the railroads in the interest of the people, that the currency be expanded by the free and unlimited coinage of silver, and that a graduated income tax be laid upon the wealth of the nation.
\`\`\`
A) The Populist movement's call for government action against the economic power of corporations and creditors
B) Progressive-era support for breaking up trusts through the courts
C) Labor unions' demand for an eight-hour workday
D) Southern Democrats' opposition to federal intervention in the economy
Correct Answer: A
Explanation: Railroad ownership, free silver and the income tax are the Populist (People's Party) platform of 1892; B belongs to a later movement with different tools, and D is the opposite stance.`,
      ],
    },
    {
      id: 'postwar-present',
      name: 'Periods 8-9: 1945-present (the Cold War, civil rights, liberalism and conservatism, globalization)',
      share: 'about 23% of the test',
      detect: /\b(period [89]\b|unit [89]\b|cold war|containment|truman doctrine|marshall plan|NATO|korean war|mccarthy\w*|red scare|eisenhower|suburb\w*|levittown|baby boom|brown v\.? board|civil rights|montgomery|little rock|sit[- ]ins|march on washington|voting rights act|great society|vietnam|counterculture|feminis\w+|watergate|nixon|stagflation|conservativ\w+|reagan\w*|moral majority|end of the cold war|globalization|9\/11|war on terror|immigration since 1965)\b/i,
      skills: [
        'Period 8 (1945-1980): containment and the early Cold War, McCarthyism, postwar prosperity and suburbanization, the civil rights movement (legal strategy, direct action, legislation, Black Power), the Great Society, Vietnam and the antiwar movement, the counterculture and feminism, Nixon, Watergate and stagflation',
        'Period 9 (1980-present): the rise of conservatism and Reagan, the end of the Cold War, economic and demographic change (deindustrialization, immigration after 1965, the Sun Belt), the digital economy and globalization, September 11 and the wars that followed, political polarization',
      ],
      hard: [
        'A civil rights source read for its strategy (litigation, nonviolent direct action, self-defense) against options from a different phase of the movement',
        'The Great Society and the New Deal compared for scope and critics',
        'Causes of conservatism\'s rise linked across economic, social and religious developments',
        'Continuity in containment across administrations with changes in method (Korea, Vietnam, détente)',
      ],
      traps: ['Brown v. Board credited with ending segregation in practice', 'the Great Society and the New Deal swapped', 'détente read as the end of the Cold War', 'the 1965 immigration law read as restricting immigration'],
      exemplars: [
        `MC_QUESTION: Which of the following developments most directly contributed to the trend shown in the table?
\`\`\`graph
kind: table
title: Share of the U.S. population living in suburbs
columns: Year | Percent in suburbs
row: 1940 | 15%
row: 1950 | 23%
row: 1960 | 31%
row: 1970 | 37%
\`\`\`
A) Federal highway construction and government-backed home mortgages after World War II
B) The migration of African Americans from the South to Northern cities
C) The restriction of immigration by the National Origins Act of 1924
D) The growth of factory employment in central cities during the New Deal
Correct Answer: A
Explanation: The GI Bill's and FHA's mortgage guarantees and the 1956 Interstate Highway Act made suburban homeownership and commuting possible for millions. B describes movement into cities, not out of them.`,
      ],
    },
  ],
  difficulty: AP_HISTORY_DIFFICULTY,
}
