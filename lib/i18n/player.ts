// The app's own words inside a guide written in another language: the buttons
// and labels students see while answering (Check answer, Next, True / False,
// Your answer, Correct!). English guides and "English with Spanish support"
// keep English. Pure; unit-tested. Players read it through usePlayerText()
// (components/reading/reading-provider.tsx), which knows the language of the
// content on screen (a translation given to one student counts).

import type { GuideLanguage } from '@/lib/study-options'

const EN = {
  checkAnswer: 'Check answer',
  check: 'Check',
  submit: 'Submit',
  next: 'Next',
  previous: 'Previous',
  continue: 'Continue',
  seeResults: 'See results',
  submitQuiz: 'Submit quiz',
  startOver: 'Start over',
  startOverNew: 'Start over with new questions',
  retryMissed: 'Retry missed',
  true: 'True',
  false: 'False',
  yourAnswer: 'Your answer',
  correctAnswer: 'Correct answer',
  correct: 'Correct!',
  correctWithHint: 'Correct, with a hint.',
  notQuite: 'Not quite.',
  youPicked: 'You picked',
  theAnswerIs: 'The answer is',
  notQuiteReview: 'Not quite. Review the answer above.',
  notAnswered: 'Not answered',
  modelAnswer: 'Model answer',
  answerReview: 'Answer review',
  yourResult: 'Your result',
  questions: 'Questions',
  question: 'Question',
  of: 'of',
  answered: 'answered',
  firstStep: 'Show me the first step',
  explanation: 'Explanation',
  hint: 'Hint',
  why: 'Why?',
  explainMore: 'Explain more',
  typeAnswer: 'Type your answer',
  yourNumericAnswer: 'Your numeric answer',
  practice: 'Practice',
  test: 'Test',
  lockIn: 'Lock in answer',
  markForLater: 'Mark for later',
  marked: 'Marked',
  readAloud: 'Read the question aloud',
  multipleChoice: 'Multiple choice',
  trueOrFalse: 'True or false',
  shortAnswer: 'Short answer',
  comeBack: 'Come back to it',
  checkMyWork: 'Check my work',
  inYourOwnWords: 'In your own words',
  secondTry: 'Second try',
  yourMastery: 'Your mastery',
  mastered: 'Mastered',
  keepPracticing: 'Keep practicing',
  crossOut: 'Cross it out',
  bringBack: 'Bring it back',
  excellent: 'Excellent. You know this material.',
  solid: 'Solid. Review the ones you missed.',
  gettingThere: 'Getting there. Focus on the topics below.',
  keepGoing: 'Keep going. Retry the missed questions.',
}

export type PlayerText = typeof EN
export type PlayerTextKey = keyof PlayerText

const ES: PlayerText = {
  checkAnswer: 'Comprobar respuesta', check: 'Comprobar', submit: 'Enviar', next: 'Siguiente', previous: 'Anterior', continue: 'Continuar',
  seeResults: 'Ver resultados', submitQuiz: 'Entregar el cuestionario', startOver: 'Empezar de nuevo', startOverNew: 'Empezar de nuevo con preguntas nuevas', retryMissed: 'Repetir las falladas',
  true: 'Verdadero', false: 'Falso', yourAnswer: 'Tu respuesta', correctAnswer: 'Respuesta correcta', correct: '¡Correcto!', correctWithHint: 'Correcto, con una pista.',
  notQuite: 'No del todo.', youPicked: 'Elegiste', theAnswerIs: 'La respuesta es', notQuiteReview: 'No del todo. Revisa la respuesta de arriba.', notAnswered: 'Sin responder', modelAnswer: 'Respuesta modelo', answerReview: 'Repaso de respuestas',
  yourResult: 'Tu resultado', questions: 'Preguntas', question: 'Pregunta', of: 'de', answered: 'respondidas', firstStep: 'Muéstrame el primer paso', explanation: 'Explicación', hint: 'Pista', why: '¿Por qué?', explainMore: 'Explica más',
  typeAnswer: 'Escribe tu respuesta', yourNumericAnswer: 'Tu respuesta numérica', practice: 'Práctica', test: 'Examen', lockIn: 'Fijar respuesta', markForLater: 'Marcar para después', marked: 'Marcada',
  readAloud: 'Leer la pregunta en voz alta', multipleChoice: 'Opción múltiple', trueOrFalse: 'Verdadero o falso', shortAnswer: 'Respuesta corta', comeBack: 'Volver después',
  checkMyWork: 'Revisar mi trabajo', inYourOwnWords: 'Con tus propias palabras', secondTry: 'Segundo intento', yourMastery: 'Tu dominio', mastered: 'Dominado', keepPracticing: 'Sigue practicando',
  crossOut: 'Tachar', bringBack: 'Recuperar',
  excellent: 'Excelente. Dominas este material.', solid: 'Bien. Repasa las que fallaste.', gettingThere: 'Vas avanzando. Enfócate en los temas de abajo.', keepGoing: 'Sigue así. Repite las preguntas falladas.',
}

const PT: PlayerText = {
  checkAnswer: 'Verificar resposta', check: 'Verificar', submit: 'Enviar', next: 'Próxima', previous: 'Anterior', continue: 'Continuar',
  seeResults: 'Ver resultados', submitQuiz: 'Entregar o questionário', startOver: 'Recomeçar', startOverNew: 'Recomeçar com perguntas novas', retryMissed: 'Refazer as erradas',
  true: 'Verdadeiro', false: 'Falso', yourAnswer: 'Sua resposta', correctAnswer: 'Resposta correta', correct: 'Correto!', correctWithHint: 'Correto, com uma dica.',
  notQuite: 'Não foi dessa vez.', youPicked: 'Você escolheu', theAnswerIs: 'A resposta é', notQuiteReview: 'Não foi dessa vez. Revise a resposta acima.', notAnswered: 'Sem resposta', modelAnswer: 'Resposta modelo', answerReview: 'Revisão das respostas',
  yourResult: 'Seu resultado', questions: 'Perguntas', question: 'Pergunta', of: 'de', answered: 'respondidas', firstStep: 'Mostre o primeiro passo', explanation: 'Explicação', hint: 'Dica', why: 'Por quê?', explainMore: 'Explique mais',
  typeAnswer: 'Digite sua resposta', yourNumericAnswer: 'Sua resposta numérica', practice: 'Prática', test: 'Prova', lockIn: 'Confirmar resposta', markForLater: 'Marcar para depois', marked: 'Marcada',
  readAloud: 'Ler a pergunta em voz alta', multipleChoice: 'Múltipla escolha', trueOrFalse: 'Verdadeiro ou falso', shortAnswer: 'Resposta curta', comeBack: 'Voltar depois',
  checkMyWork: 'Conferir meu trabalho', inYourOwnWords: 'Com suas palavras', secondTry: 'Segunda tentativa', yourMastery: 'Seu domínio', mastered: 'Dominado', keepPracticing: 'Continue praticando',
  crossOut: 'Riscar', bringBack: 'Trazer de volta',
  excellent: 'Excelente. Você domina este conteúdo.', solid: 'Bom. Revise as que você errou.', gettingThere: 'Está chegando lá. Foque nos tópicos abaixo.', keepGoing: 'Continue. Refaça as perguntas erradas.',
}

const FR: PlayerText = {
  checkAnswer: 'Vérifier la réponse', check: 'Vérifier', submit: 'Envoyer', next: 'Suivant', previous: 'Précédent', continue: 'Continuer',
  seeResults: 'Voir les résultats', submitQuiz: 'Rendre le quiz', startOver: 'Recommencer', startOverNew: 'Recommencer avec de nouvelles questions', retryMissed: 'Refaire les erreurs',
  true: 'Vrai', false: 'Faux', yourAnswer: 'Ta réponse', correctAnswer: 'Bonne réponse', correct: 'Correct !', correctWithHint: 'Correct, avec un indice.',
  notQuite: 'Pas tout à fait.', youPicked: 'Tu as choisi', theAnswerIs: 'La réponse est', notQuiteReview: 'Pas tout à fait. Relis la réponse ci-dessus.', notAnswered: 'Sans réponse', modelAnswer: 'Réponse modèle', answerReview: 'Correction',
  yourResult: 'Ton résultat', questions: 'Questions', question: 'Question', of: 'sur', answered: 'répondues', firstStep: 'Montre-moi la première étape', explanation: 'Explication', hint: 'Indice', why: 'Pourquoi ?', explainMore: 'Explique davantage',
  typeAnswer: 'Écris ta réponse', yourNumericAnswer: 'Ta réponse numérique', practice: 'Entraînement', test: 'Contrôle', lockIn: 'Valider la réponse', markForLater: 'Marquer pour plus tard', marked: 'Marquée',
  readAloud: 'Lire la question à voix haute', multipleChoice: 'Choix multiple', trueOrFalse: 'Vrai ou faux', shortAnswer: 'Réponse courte', comeBack: 'Y revenir plus tard',
  checkMyWork: 'Vérifier mon travail', inYourOwnWords: 'Avec tes propres mots', secondTry: 'Deuxième essai', yourMastery: 'Ta maîtrise', mastered: 'Maîtrisé', keepPracticing: 'Continue à t\'entraîner',
  crossOut: 'Barrer', bringBack: 'Rétablir',
  excellent: 'Excellent. Tu maîtrises ce contenu.', solid: 'Solide. Revois celles que tu as manquées.', gettingThere: 'Ça vient. Concentre-toi sur les thèmes ci-dessous.', keepGoing: 'Continue. Refais les questions manquées.',
}

const HT: PlayerText = {
  checkAnswer: 'Verifye repons lan', check: 'Verifye', submit: 'Voye', next: 'Pwochen', previous: 'Anvan', continue: 'Kontinye',
  seeResults: 'Gade rezilta yo', submitQuiz: 'Remèt egzamen an', startOver: 'Rekòmanse', startOverNew: 'Rekòmanse ak nouvo kesyon', retryMissed: 'Refè sa ou te rate yo',
  true: 'Vre', false: 'Fo', yourAnswer: 'Repons ou', correctAnswer: 'Bon repons', correct: 'Kòrèk!', correctWithHint: 'Kòrèk, ak yon endis.',
  notQuite: 'Pa egzakteman.', youPicked: 'Ou te chwazi', theAnswerIs: 'Repons lan se', notQuiteReview: 'Pa egzakteman. Gade repons ki anwo a.', notAnswered: 'Pa reponn', modelAnswer: 'Modèl repons', answerReview: 'Revizyon repons yo',
  yourResult: 'Rezilta ou', questions: 'Kesyon', question: 'Kesyon', of: 'sou', answered: 'reponn', firstStep: 'Montre m premye etap la', explanation: 'Eksplikasyon', hint: 'Endis', why: 'Poukisa?', explainMore: 'Eksplike plis',
  typeAnswer: 'Ekri repons ou', yourNumericAnswer: 'Repons ou an chif', practice: 'Pratik', test: 'Egzamen', lockIn: 'Fikse repons lan', markForLater: 'Make pou pita', marked: 'Make',
  readAloud: 'Li kesyon an awotvwa', multipleChoice: 'Chwa miltip', trueOrFalse: 'Vre oswa fo', shortAnswer: 'Repons kout', comeBack: 'Retounen sou li pita',
  checkMyWork: 'Verifye travay mwen', inYourOwnWords: 'Nan pwòp mo ou', secondTry: 'Dezyèm esè', yourMastery: 'Metriz ou', mastered: 'Metrize', keepPracticing: 'Kontinye pratike',
  crossOut: 'Bare li', bringBack: 'Remete li',
  excellent: 'Ekselan. Ou konnen materyèl sa a.', solid: 'Byen. Revize sa ou te rate yo.', gettingThere: 'Ou ap rive. Konsantre sou sijè ki anba yo.', keepGoing: 'Kontinye. Refè kesyon ou te rate yo.',
}

const TEXT: Partial<Record<GuideLanguage, PlayerText>> = { es: ES, pt: PT, fr: FR, ht: HT }

/** The player's words for a guide language; English for 'en', 'en-es' and anything unknown. */
export function playerText(language: GuideLanguage | string | null | undefined): PlayerText {
  return TEXT[language as GuideLanguage] ?? EN
}

/** Every language has every key (so a missing translation can't leave a blank button). */
export function playerTextComplete(): boolean {
  const keys = Object.keys(EN) as PlayerTextKey[]
  return Object.values(TEXT).every((t) => keys.every((k) => typeof t[k] === 'string' && t[k].trim().length > 0))
}
