import { describe, expect, it } from "vitest";
import { reviewExam, scoreExam, shuffleExam } from "../exam";
import { QUESTION_BANK } from "../questionBank";

const answerAllCorrectly = () =>
  Object.fromEntries(QUESTION_BANK.map((question) => [question.id, question.correctChoiceId]));

describe("question bank", () => {
  it("has 24 questions with unique ids and a rule citation", () => {
    expect(QUESTION_BANK).toHaveLength(24);
    expect(new Set(QUESTION_BANK.map((question) => question.id)).size).toBe(QUESTION_BANK.length);
    QUESTION_BANK.forEach((question) => expect(question.section).not.toBe(""));
  });

  it("gives every question four distinct choices and exactly one correct one", () => {
    QUESTION_BANK.forEach((question) => {
      const choiceIds = question.choices.map((choice) => choice.id);
      expect(choiceIds).toHaveLength(4);
      expect(new Set(choiceIds).size).toBe(4);
      expect(choiceIds.filter((id) => id === question.correctChoiceId)).toHaveLength(1);
    });
  });
});

describe("scoreExam", () => {
  it("scores a perfect exam", () => {
    expect(scoreExam(QUESTION_BANK, answerAllCorrectly())).toEqual({ correct: 24, total: 24, percent: 100 });
  });

  it("counts unanswered and wrong answers as misses", () => {
    const answers = answerAllCorrectly();
    const [first, second, third] = QUESTION_BANK;
    delete answers[first.id];
    answers[second.id] = second.choices.find((choice) => choice.id !== second.correctChoiceId)!.id;
    answers[third.id] = "not-a-choice";

    expect(scoreExam(QUESTION_BANK, answers)).toEqual({ correct: 21, total: 24, percent: 88 });
  });

  it("returns zero for an empty exam", () => {
    expect(scoreExam([], {})).toEqual({ correct: 0, total: 0, percent: 0 });
  });
});

describe("reviewExam", () => {
  it("pairs each question with the chosen and the correct answer, in exam order", () => {
    const [first, second, third] = QUESTION_BANK;
    const wrongChoice = second.choices.find((choice) => choice.id !== second.correctChoiceId)!;
    const review = reviewExam([first, second, third], {
      [first.id]: first.correctChoiceId,
      [second.id]: wrongChoice.id,
    });

    expect(review.map((item) => item.question.id)).toEqual([first.id, second.id, third.id]);
    expect(review[0]).toMatchObject({ isCorrect: true, selectedChoice: { id: first.correctChoiceId } });
    expect(review[1]).toMatchObject({
      isCorrect: false,
      selectedChoice: wrongChoice,
      correctChoice: { id: second.correctChoiceId },
    });
    expect(review[2]).toMatchObject({ isCorrect: false, selectedChoice: undefined });
    expect(review[2].correctChoice.id).toBe(third.correctChoiceId);
  });

  it("agrees with scoreExam", () => {
    const answers = answerAllCorrectly();
    delete answers[QUESTION_BANK[4].id];
    const review = reviewExam(QUESTION_BANK, answers);

    expect(review.filter((item) => item.isCorrect)).toHaveLength(scoreExam(QUESTION_BANK, answers).correct);
  });
});

describe("shuffleExam", () => {
  it("keeps every question, choice and answer key while reordering", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const shuffled = shuffleExam(QUESTION_BANK, random);

    expect(shuffled.map((question) => question.id).sort()).toEqual(QUESTION_BANK.map((question) => question.id).sort());
    expect(shuffled.map((question) => question.id)).not.toEqual(QUESTION_BANK.map((question) => question.id));
    shuffled.forEach((question) => {
      const original = QUESTION_BANK.find((candidate) => candidate.id === question.id)!;
      expect(question.correctChoiceId).toBe(original.correctChoiceId);
      expect([...question.choices].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        [...original.choices].sort((a, b) => a.id.localeCompare(b.id)),
      );
    });
    expect(scoreExam(shuffled, answerAllCorrectly()).percent).toBe(100);
  });

  it("does not mutate the bank", () => {
    const before = JSON.stringify(QUESTION_BANK);
    shuffleExam(QUESTION_BANK);
    expect(JSON.stringify(QUESTION_BANK)).toBe(before);
  });
});
