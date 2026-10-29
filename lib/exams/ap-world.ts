// The AP World History: Modern exam (c. 1200 to the present) as a reference
// for the guide prompts. Units 1-9 grouped into four domains; item rules and
// difficulty shared with APUSH (ap-history.ts).

import type { ExamProfile } from './types'
import { AP_HISTORY_DIFFICULTY, AP_HISTORY_ITEM_RULES } from './ap-history'

export const AP_WORLD: ExamProfile = {
  id: 'ap-world',
  name: 'the AP World History: Modern exam',
  detect: {
    exam: /\bAP\s+World(?:\s+History)?(?:\s*:?\s*Modern)?\b/i,
    subjectHints: /./,
    subjects: ['history', 'social-studies', 'social studies'],
    explicit: /\bAP\s+World\b/i,
  },
  itemRules: AP_HISTORY_ITEM_RULES('the AP World History: Modern exam'),
  domains: [
    {
      id: 'global-tapestry',
      name: 'Units 1-2: c. 1200-1450 (the global tapestry and networks of exchange)',
      share: 'about 16-20% of the test',
      detect: /\b(unit [12]\b|1200|1450|song dynasty|song china|champa rice|neo[- ]confucian\w*|dar al[- ]islam|abbasid|delhi sultanate|mali|mansa musa|swahili|great zimbabwe|aztec|mexica|inca|feudal\w*|manorial\w*|byzantine|silk road\w*|indian ocean trade|trans[- ]saharan|mongol\w*|pax mongolica|black death|marco polo|ibn battuta|diffusion|caravanserai)\b/i,
      skills: [
        'Unit 1: state building in Song China, the Islamic world (Abbasids, Delhi Sultanate), South and Southeast Asia, the Americas (Aztec, Inca), Africa (Mali, Swahili city-states, Great Zimbabwe) and Europe (feudalism, the Church), with continuities from earlier periods',
        'Unit 2: the Silk Roads, the Indian Ocean network and trans-Saharan trade: technologies (compass, caravanserai, credit), the Mongol Empire\'s effects on exchange, the spread of religions, crops and disease (the Black Death), travelers as sources (Ibn Battuta, Marco Polo)',
      ],
      hard: [
        'A traveler\'s account read for its author\'s perspective (what a Muslim scholar praises or criticizes) before the question about what it shows',
        'The Mongols\' effects on trade and on the states they conquered in one item',
        'Comparing two trade networks by what moved on them and which states benefited',
      ],
      traps: ['the Mongols read only as destroyers', 'Song China\'s innovations placed in the Ming period', 'the Indian Ocean network treated as European-run before 1500'],
      exemplars: [
        `MC_QUESTION: The excerpt is best understood in the context of which of the following?
\`\`\`passage
Account by a Moroccan scholar of his travels along the East African coast, 1331

The city is one of the finest and most substantially built towns; its people are devout and honorable Muslims. The merchants of the city trade in gold and ivory brought from the interior, and the ships of India and Arabia lie in its harbor.
\`\`\`
A) The integration of the Swahili coast into Indian Ocean trade and the spread of Islam along it
B) The Portuguese establishment of fortified trading posts in East Africa
C) The Mongol conquest of the Abbasid Caliphate and its effects on Muslim scholarship
D) The trans-Saharan trade in salt and gold controlled by the Mali Empire
Correct Answer: A
Explanation: A Swahili city with Muslim merchants and ships from India and Arabia describes the Indian Ocean network of the 1300s; the Portuguese (B) arrived after 1498, and D is the wrong network.`,
      ],
    },
    {
      id: 'early-modern',
      name: 'Units 3-4: c. 1450-1750 (land-based empires and transoceanic interconnections)',
      share: 'about 24-30% of the test',
      detect: /\b(unit [34]\b|1450|1750|gunpowder empire|ottoman|safavid|mughal|ming|qing|tokugawa|russia\w*|ivan|devshirme|janissar\w*|akbar|divine right|protestant reformation|columbian exchange|maritime empire|portuguese|spanish empire|encomienda|mita|casta|atlantic slave trade|middle passage|joint[- ]stock|dutch east india|mercantilis\w+|silver trade|potosí|potosi|manila galleon|syncretic|sikhism|vodun|santería|santeria)\b/i,
      skills: [
        'Unit 3: the land-based empires (Ottoman, Safavid, Mughal, Ming/Qing, Russia): expansion with gunpowder, legitimacy (divine right, religious architecture, bureaucracies like the devshirme and the examination system), religious policy and conflict (Sunni-Shi\'a, the Reformation)',
        'Unit 4: maritime empires and the Columbian Exchange: technologies and motives for exploration, Portuguese trading posts and Spanish colonies, the global silver trade, coerced labor (encomienda, mita, chattel slavery and the Atlantic trade), joint-stock companies and mercantilism, resistance and syncretic belief, changing social hierarchies (casta)',
      ],
      hard: [
        'Comparing how two empires legitimized rule, from sources rather than names',
        'The silver trade\'s effects traced from Potosí through Manila to Ming China',
        'A labor system identified from a description and matched to its region and consequences',
        'Continuity in Afro-Eurasian trade routes alongside the new Atlantic ones',
      ],
      traps: ['the Columbian Exchange read as goods only, not disease and crops', 'the Ottomans and Safavids\' religious identities swapped', 'joint-stock companies attributed to Spain', 'encomienda and chattel slavery conflated'],
      exemplars: [
        `MC_QUESTION: Which of the following was a direct effect of the trend shown in the table?
\`\`\`graph
kind: table
title: Estimated silver exported from Spanish America, by half-century
columns: Years | Silver (metric tons)
row: 1551-1600 | 7,000
row: 1601-1650 | 12,000
row: 1651-1700 | 11,000
\`\`\`
A) The Ming and Qing governments' increasing reliance on silver for taxation and the growth of a silver-based economy in China
B) The collapse of the Ottoman Empire's trade with Europe
C) The end of the trans-Saharan gold trade
D) The decline of coerced labor in the Andean mines
Correct Answer: A
Explanation: Much of the American silver flowed to China, where the Ming required taxes in silver, through the Manila galleons and European traders; D is backwards, since the mita expanded to mine it.`,
      ],
    },
    {
      id: 'revolutions-industry',
      name: 'Units 5-6: c. 1750-1900 (revolutions and the consequences of industrialization)',
      share: 'about 24-30% of the test',
      detect: /\b(unit [56]\b|1750|1900|enlightenment|american revolution|french revolution|haitian revolution|latin american (?:revolution|independence)|bolívar|bolivar|nationalis\w+|industrial revolution|factory|steam|railroad|capitalis\w+|adam smith|marx\w*|socialis\w+|labor union|meiji|self[- ]strengthening|tanzimat|ottoman reform|imperialis\w+|scramble for africa|berlin conference|opium war|sepoy|indian rebellion|raj|social darwinism|indentured|migration|abolition of slavery)\b/i,
      skills: [
        'Unit 5: the Enlightenment and the Atlantic revolutions (American, French, Haitian, Latin American), nationalism, the Industrial Revolution\'s causes and spread, factories and new classes, economic ideologies (capitalism, socialism), reform and state-led industrialization (Meiji Japan, Ottoman Tanzimat, Chinese self-strengthening)',
        'Unit 6: the new imperialism (motives, the Scramble for Africa, the British Raj, spheres of influence in China), resistance and rebellions (Sepoy, Boxer, Zulu), export economies and economic imperialism (the Opium Wars), migrations (indentured labor, Irish and Italian emigration) and their effects',
      ],
      hard: [
        'A revolutionary document read for which Enlightenment idea it uses and for whom it did not apply (Haiti vs France on slavery)',
        'Comparing Japan\'s and the Ottoman Empire\'s responses to Western pressure by outcome',
        'Economic imperialism distinguished from colonial rule in a source about China',
        'Causes of a migration (push and pull) linked to industrialization and imperialism',
      ],
      traps: ['the Haitian Revolution read as a French colonial reform', 'Meiji and self-strengthening outcomes swapped', 'the Scramble for Africa dated before the 1880s', 'industrialization read as spreading evenly'],
      exemplars: [
        `MC_QUESTION: The sentiments expressed in the excerpt most directly reflect which of the following?
\`\`\`passage
Proclamation by the leader of an independence army in South America, 1819

We are neither Europeans nor Indians but a species midway between the legitimate owners of this country and the Spanish usurpers. Let us lay the foundations of a government that rests on the sovereignty of the people, the division of powers, and civil liberty.
\`\`\`
A) The influence of Enlightenment political ideas on creole leaders of the Latin American independence movements
B) The desire of Indigenous communities to restore pre-Columbian states
C) Spanish efforts to reform colonial administration through the Bourbon Reforms
D) The spread of Marxist ideas among Latin American workers
Correct Answer: A
Explanation: Popular sovereignty, separated powers and civil liberty are Enlightenment ideas, voiced here by a creole (American-born of European descent) leader. D is a later ideology.`,
      ],
    },
    {
      id: 'twentieth-century',
      name: 'Units 7-9: 1900-present (global conflict, the Cold War and decolonization, globalization)',
      share: 'about 24-30% of the test',
      detect: /\b(unit [789]\b|1900|world war i|world war ii|total war|russian revolution|bolshevik|lenin|stalin|five[- ]year plan|great depression|fascis\w+|nazi\w*|holocaust|genocide|armenian|rwanda|cold war|containment|decoloniz\w+|india\w* independence|partition|gandhi|nkrumah|algeria|vietnam|cuban|non[- ]aligned|apartheid|mandela|united nations|globalization|green revolution|world trade|epidemic|AIDS|covid|environmental|climate)\b/i,
      skills: [
        'Unit 7: causes and conduct of the World Wars (alliances, total war, propaganda), the Russian Revolution and Stalinism, the Great Depression and state responses, fascism, the Holocaust and other genocides, the end of empires in the interwar period (Ottoman, Qing)',
        'Unit 8: the Cold War (origins, proxy wars, the Non-Aligned Movement), decolonization (India and partition, Ghana, Algeria, Vietnam) and the new states\' challenges, resistance to Cold War order (anti-apartheid, Prague Spring), the end of the Soviet Union',
        'Unit 9: globalization (trade, technology, multinational corporations), the Green Revolution and medical advances, environmental change, human rights movements, resistance to globalization and new epidemics',
      ],
      hard: [
        'A propaganda poster or speech read for its purpose and audience before the question',
        'Decolonization compared across cases by method (negotiation vs armed struggle) and outcome',
        'Cold War events read through the perspective of a non-aligned state',
        'Causes of a genocide linked to earlier nationalism and colonial categories',
      ],
      traps: ['total war confused with trench warfare', 'the Non-Aligned Movement read as pro-Soviet', 'decolonization dated to immediately after World War I', 'the Green Revolution read as purely beneficial'],
      exemplars: [
        `MC_QUESTION: A historian could best use the excerpt as evidence for which of the following?
\`\`\`passage
Speech by the prime minister of a newly independent South Asian state at an international conference, 1955

We do not wish to be the camp followers of any great power. The countries of Asia and Africa have been the playthings of others long enough. We shall judge each issue on its merits, and we shall not be bound to either bloc.
\`\`\`
A) The emergence of the Non-Aligned Movement among decolonized states during the Cold War
B) The formation of military alliances such as SEATO under American leadership
C) The spread of communist revolutions in Asia after 1949
D) The persistence of British colonial rule in South Asia into the 1960s
Correct Answer: A
Explanation: Refusing both blocs at a 1955 Afro-Asian conference (Bandung) is the founding stance of non-alignment; B is the opposite choice, and D is wrong because the speaker leads an independent state.`,
      ],
    },
  ],
  difficulty: AP_HISTORY_DIFFICULTY,
}
