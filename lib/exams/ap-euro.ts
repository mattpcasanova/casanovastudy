// The AP European History exam (c. 1450 to the present) as a reference for
// the guide prompts. Units 1-9 grouped into four domains; item rules and
// difficulty shared with APUSH and World (ap-history.ts).

import type { ExamProfile } from './types'
import { AP_HISTORY_DIFFICULTY, AP_HISTORY_ITEM_RULES } from './ap-history'

export const AP_EURO: ExamProfile = {
  id: 'ap-euro',
  pace: 60,
  name: 'the AP European History exam',
  detect: {
    exam: /\bAP\s+(?:Euro(?:pean)?)(?:\s+History)?\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+Euro\b/i,
  },
  itemRules: AP_HISTORY_ITEM_RULES('the AP European History exam'),
  domains: [
    {
      id: 'renaissance-reformation',
      name: 'Units 1-2: c. 1450-1648 (Renaissance and exploration; the Reformation and wars of religion)',
      share: 'about 20-25% of the test',
      detect: /\b(unit [12]\b|1450|1648|renaissance|humanis\w+|civic humanism|printing press|new monarch\w*|exploration|columbian exchange|commercial revolution|price revolution|reformation|luther\w*|calvin\w*|anabaptist\w*|anglican|counter[- ]reformation|catholic reformation|council of trent|jesuit\w*|peace of augsburg|thirty years'? war|peace of westphalia|french wars of religion|edict of nantes|st\.? bartholomew|dutch revolt|spanish armada|habsburg\w*|witch (?:hunt|craze|trial)s?|mannerism|baroque)\b/i,
      skills: [
        'Unit 1: Renaissance humanism and its civic and Christian forms, the printing press, the new monarchies and their centralizing tools, exploration and its motives, the Columbian Exchange, the commercial and price revolutions, changing social hierarchies',
        'Unit 2: Luther, Calvin and the radical reformers compared on doctrine and church-state relations; the English Reformation as a political act; the Catholic Reformation (Trent, the Jesuits); religious wars from the Peace of Augsburg to Westphalia and the shift from confession to state interest',
      ],
      hard: [
        'A humanist text read for what it praises before the question about how it differs from medieval thought',
        'Two reformers\' positions distinguished on a single doctrine (the Eucharist, predestination, the role of the magistrate)',
        'The Thirty Years\' War\'s end read as the beginning of state sovereignty rather than the end of religious conflict',
        'Economic change (price inflation, the putting-out system) connected to social consequences in one item',
      ],
      traps: ['Luther credited with Calvin\'s doctrine or vice versa', 'the English Reformation read as doctrinal first', 'Westphalia read as a Catholic victory', 'the Renaissance dated after the Reformation'],
      exemplars: [
        `MC_QUESTION: The ideas expressed in the excerpt most directly reflect which of the following developments?
\`\`\`passage
Letter from a Florentine scholar to a friend, 1470s

I have spent the week with the orator's speeches and I confess the old monks would call it time stolen from God. Yet I find in these pagan pages a school for living in the city: how a man ought to speak in council, how to serve the republic without losing his soul. The ancients were not Christians, but they were men, and we are men who must govern.
\`\`\`
A) The spread of civic humanism, which valued classical learning as preparation for active public life
B) The Protestant rejection of monastic vows and clerical celibacy
C) The scholastic synthesis of Aristotelian philosophy with Christian theology
D) The scientific revolution's turn from ancient authorities to observation
Correct Answer: A
Explanation: Reading a pagan orator as "a school for living in the city" and serving the republic is the civic humanist program of 15th-century Florence. B is a later movement, C is the medieval tradition the writer sets himself against, and D rejects the ancients the writer embraces.`,
      ],
    },
    {
      id: 'absolutism-enlightenment',
      name: 'Units 3-4: 1648-1815 (absolutism and constitutionalism; the scientific revolution, the Enlightenment, the French Revolution and Napoleon)',
      share: 'about 25-30% of the test',
      detect: /\b(unit [34]\b|1648|1815|absolutis\w+|louis xiv|versailles|intendant\w*|mercantilis\w+|colbert|constitutionalis\w+|english civil war|glorious revolution|bill of rights|dutch republic|golden age|peter the great|partition of poland|balance of power|scientific revolution|copernic\w+|galileo|newton\w*|bacon|descartes|enlightenment|philosophe\w*|voltaire|rousseau|montesquieu|locke|salon\w*|enlightened (?:absolutis\w+|despot\w*)|agricultural revolution|enclosure|atlantic slave trade|seven years'? war|french revolution|estates[- ]general|national assembly|declaration of the rights of man|jacobin\w*|reign of terror|robespierre|thermidor|napoleon\w*|napoleonic code|congress of vienna)\b/i,
      skills: [
        'Unit 3: absolutism (Louis XIV\'s tools: Versailles, intendants, mercantilism, religious uniformity) against constitutionalism (the English civil wars and the Glorious Revolution, the Dutch Republic); eastern absolutism (Peter the Great, Prussia, the Habsburgs); the balance of power and the partitions of Poland',
        'Unit 4: the scientific revolution\'s new methods and institutions; Enlightenment thought on government, religion, economics and society, and its spread through salons and print; enlightened absolutism\'s reforms and limits; the agricultural revolution and consumer society; the French Revolution\'s phases (liberal, radical, Thermidor, Directory), Napoleon\'s reforms and empire, and the Congress of Vienna',
      ],
      hard: [
        'A royal edict read for the absolutist claim it makes before the question about what limited it in practice',
        'Comparing England and France in the 17th century by the outcome of the crown\'s conflict with representative bodies',
        'An Enlightenment text whose author is not named, identified by position (separation of powers, the general will, natural rights) from its words',
        'The Revolution\'s radical phase explained by war and counterrevolution rather than by ideology alone',
        'Napoleon read as both preserver and betrayer of revolutionary principles in one item',
      ],
      traps: ['Locke and Rousseau swapped on the social contract', 'the Glorious Revolution read as a democratic revolution', 'the Terror dated before the war of 1792', 'the Congress of Vienna read as restoring everything to 1789'],
      exemplars: [
        `MC_QUESTION: The excerpt is best understood in the context of which of the following?
\`\`\`passage
Pamphlet circulated in Paris, autumn 1793

Citizens, the Republic is one and indivisible, and so must be its will. While the armies of kings stand at our frontiers and traitors sit in our towns, there can be no liberty for the enemies of liberty. The Convention has made terror the order of the day, and virtue without terror is powerless. Let the suspect tremble; the people will not.
\`\`\`
A) The radical phase of the French Revolution, in which the Committee of Public Safety justified repression by foreign war and internal counterrevolution
B) The liberal phase of the Revolution, in which the National Assembly drafted a constitutional monarchy
C) The Thermidorian Reaction, which dismantled the apparatus of the Terror
D) Napoleon's consolidation of power through the Concordat and the Civil Code
Correct Answer: A
Explanation: Terror as "the order of the day," armies of kings at the frontiers and "virtue without terror" are the language of the Jacobin Republic in 1793-94. B is 1789-91 and C is what ended the Terror in 1794, so both are the wrong phase; D is a decade later.`,
      ],
    },
    {
      id: 'industry-nationalism',
      name: 'Units 5-6: 1815-1914 (conflicts and ideologies; industrialization and its effects; nationalism, unification and imperialism)',
      share: 'about 25-30% of the test',
      detect: /\b(unit [56]\b|1815|1848|1914|conservatis\w+|metternich|liberalis\w+|nationalis\w+|romanticis\w+|socialis\w+|utopian|marx\w*|communist manifesto|anarchis\w+|revolutions? of 1848|industrial revolution|factory|railway|railroad|steam|urbaniz\w+|working class|bourgeois\w*|trade union\w*|chartis\w+|reform (?:act|bill)|crimean war|unification|cavour|garibaldi|bismarck|realpolitik|franco[- ]prussian|kulturkampf|dreyfus|second industrial revolution|mass (?:politics|society)|suffrag\w+|new imperialism|scramble for africa|berlin conference|social darwinism|positivis\w+|darwin\w*|freud\w*|impressionis\w+|modernis\w+)\b/i,
      skills: [
        'Unit 5: the Concert of Europe and the ideologies that contested it (conservatism, liberalism, nationalism, socialism, romanticism); the revolutions of 1830 and 1848 and why they failed; reform in Britain against repression elsewhere',
        'Unit 6: why Britain industrialized first and how the continent followed; the factory, the new classes, urban conditions and responses (unions, reform laws, socialism); the second industrial revolution and mass society; Italian and German unification by realpolitik; the new imperialism\'s motives, methods and critics; the sciences and the arts from positivism to modernism',
      ],
      hard: [
        'An 1848 source read for which ideology its demands reflect and why its allies deserted it',
        'Cavour\'s and Bismarck\'s methods compared from sources rather than names',
        'An argument for empire read for its assumption (social Darwinism, the civilizing mission, markets) before the question',
        'Industrialization\'s effects on women and the family traced across classes',
      ],
      traps: ['1848 read as a success in central Europe', 'liberalism confused with democracy before 1867', 'German unification credited to liberal nationalists rather than Prussian policy', 'the Scramble for Africa dated before the 1880s'],
      exemplars: [
        `MC_QUESTION: The sentiments expressed in the excerpt most directly reflect which of the following?
\`\`\`passage
Speech by a minister to a German state parliament, 1860s

Germany does not look to this parliament's liberalism but to its power. The great questions of the day will not be decided by speeches and majority resolutions; that was the mistake of 1848 and 1849. They will be decided by blood and iron.
\`\`\`
A) The belief that national unification would be achieved through practical power politics rather than liberal constitutionalism
B) The conservative hope that the Concert of Europe would suppress nationalist movements
C) The socialist argument that the working class would unify the nation
D) The romantic nationalist faith in a shared culture as the basis of the state
Correct Answer: A
Explanation: Dismissing "speeches and majority resolutions" and "the mistake of 1848" in favor of power is realpolitik, the method of Prussia's unification of Germany. D is the nationalism the speaker sets aside, and B is the Metternich system the speaker is about to overturn.`,
      ],
    },
    {
      id: 'twentieth-century',
      name: 'Units 7-9: 1914-present (global conflict; the Cold War and the postwar order; European integration and recent trends)',
      share: 'about 20-25% of the test',
      detect: /\b(unit [789]\b|1914|world war i|world war ii|total war|trench|treaty of versailles|fourteen points|league of nations|russian revolution|bolshevik\w*|lenin|stalin\w*|five[- ]year plan|collectiviz\w+|great depression|fascis\w+|mussolini|nazi\w*|hitler|appeasement|holocaust|genocide|blitz\w*|yalta|potsdam|cold war|iron curtain|marshall plan|nato|warsaw pact|berlin (?:wall|airlift|blockade)|decoloniz\w+|algeria|suez|welfare state|existentialis\w+|consumer society|second[- ]wave feminism|1968|prague spring|solidarity|détente|detente|gorbachev|glasnost|perestroika|fall of the berlin wall|european (?:union|community|integration)|maastricht|euro\b|yugoslav\w*|immigration|brexit)\b/i,
      skills: [
        'Unit 7: causes and conduct of the First World War as total war, the Russian Revolution and the Soviet state, the Versailles settlement, the interwar crisis (depression, fascism, Nazism, appeasement), the Second World War and the Holocaust',
        'Unit 8: the Cold War\'s division of Europe (Marshall Plan, NATO and the Warsaw Pact, Berlin), decolonization, the welfare state and consumer society, dissent in both blocs (1968, Prague Spring, Solidarity), the end of the Soviet bloc',
        'Unit 9: European integration from the Coal and Steel Community to the EU, nationalism and the Yugoslav wars, migration and the welfare state\'s strains, Europe\'s place in a globalized economy',
      ],
      hard: [
        'A propaganda text or described poster read for its audience and purpose before the question about the regime',
        'Fascism and communism compared by what each promised and whom each excluded, from sources',
        'Postwar western Europe\'s recovery explained by several causes (Marshall aid, integration, the welfare state) rather than one',
        'The end of the Cold War traced from Gorbachev\'s reforms through eastern European movements, in order',
      ],
      traps: ['the Treaty of Versailles read as the sole cause of Nazism', 'fascism read as a form of conservatism', 'the Marshall Plan confused with NATO', 'European integration dated to the Maastricht Treaty rather than the 1950s'],
      exemplars: [
        `MC_QUESTION: A historian could best use the excerpt as evidence for which of the following?
\`\`\`passage
Address by a western European foreign minister proposing a joint authority for coal and steel production, 1950

Europe will not be made all at once, or according to a single plan. It will be built through concrete achievements which first create a de facto solidarity. The pooling of coal and steel production will make it plain that any war between our two countries becomes not merely unthinkable, but materially impossible.
\`\`\`
A) The origins of European economic integration as a means of preventing another Franco-German war
B) The formation of NATO as a military alliance against the Soviet Union
C) The Marshall Plan's requirement that aid recipients adopt free-market policies
D) The nationalization of heavy industry under postwar socialist governments
Correct Answer: A
Explanation: Pooling coal and steel so that war "becomes materially impossible" is the founding logic of the European Coal and Steel Community (1951), the first step toward the EU. B is a military alliance of 1949 and C an American aid program; D describes national, not supranational, control.`,
      ],
    },
  ],
  difficulty: AP_HISTORY_DIFFICULTY,
}
