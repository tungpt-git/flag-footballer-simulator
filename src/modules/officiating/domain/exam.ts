export type RuleChoice = { id: string; text: string };

export type RuleQuestion = {
  id: string;
  /** Section of the official playing rules the answer comes from, e.g. "XIII.1". */
  section: string;
  prompt: string;
  choices: RuleChoice[];
  correctChoiceId: string;
};

/** Selected choice id per question id. */
export type ExamAnswers = Record<string, string>;

export type ExamScore = { correct: number; total: number; percent: number };

export type ExamReviewItem = {
  question: RuleQuestion;
  /** Undefined when the question was left unanswered. */
  selectedChoice: RuleChoice | undefined;
  correctChoice: RuleChoice;
  isCorrect: boolean;
};

const shuffle = <T>(items: readonly T[], random: () => number): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

/** Shuffles both the question order and the choices inside each question. */
export const shuffleExam = (
  questions: readonly RuleQuestion[],
  random: () => number = Math.random,
): RuleQuestion[] =>
  shuffle(questions, random).map((question) => ({
    ...question,
    choices: shuffle(question.choices, random),
  }));

export const scoreExam = (
  questions: readonly RuleQuestion[],
  answers: ExamAnswers,
): ExamScore => {
  const total = questions.length;
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctChoiceId,
  ).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, percent };
};

const findCorrectChoice = (question: RuleQuestion): RuleChoice => {
  const correctChoice = question.choices.find(
    (choice) => choice.id === question.correctChoiceId,
  );
  if (!correctChoice) {
    throw new Error(`Question "${question.id}" has no correct choice.`);
  }
  return correctChoice;
};

/** Pairs each question, in exam order, with the chosen and the correct answer. */
export const reviewExam = (
  questions: readonly RuleQuestion[],
  answers: ExamAnswers,
): ExamReviewItem[] =>
  questions.map((question) => {
    const selectedChoice = question.choices.find(
      (choice) => choice.id === answers[question.id],
    );
    return {
      question,
      selectedChoice,
      correctChoice: findCorrectChoice(question),
      isCorrect: selectedChoice?.id === question.correctChoiceId,
    };
  });
