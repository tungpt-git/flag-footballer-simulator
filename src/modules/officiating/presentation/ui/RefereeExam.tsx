"use client";

import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/utils";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Flag, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ExamAnswers,
  ExamReviewItem,
  ExamScore,
  RuleQuestion,
} from "../../domain/exam";
import { reviewExam, scoreExam, shuffleExam } from "../../domain/exam";
import { QUESTION_BANK, RULEBOOK_TITLE } from "../../domain/questionBank";

type ExamPhase = "intro" | "question" | "score";

type IntroCardProps = { onStart: () => void };

const IntroCard = ({ onStart }: IntroCardProps) => (
  <section
    aria-labelledby="exam-intro-title"
    className="flex max-w-2xl flex-col items-start gap-4 rounded-xl border border-border bg-card p-6"
  >
    <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
      <Flag className="size-6" aria-hidden="true" />
    </span>
    <h2
      id="exam-intro-title"
      className="font-display text-title font-semibold uppercase tracking-wide text-foreground"
    >
      Referee qualification exam
    </h2>
    <p className="text-sm text-muted-foreground">
      {QUESTION_BANK.length} multiple-choice questions from the {RULEBOOK_TITLE}
      . Pick one answer per question. You can go back and change an answer
      before you see your score.
    </p>
    <Button size="lg" onClick={onStart}>
      Start exam
      <ArrowRight aria-hidden="true" />
    </Button>
  </section>
);

type QuestionCardProps = {
  question: RuleQuestion;
  questionNumber: number;
  totalQuestions: number;
  answeredCount: number;
  selectedChoiceId: string | undefined;
  onSelect: (choiceId: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const QuestionCard = ({
  question,
  questionNumber,
  totalQuestions,
  answeredCount,
  selectedChoiceId,
  onSelect,
  onBack,
  onNext,
}: QuestionCardProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstQuestion = questionNumber === 1;
  const isLastQuestion = questionNumber === totalQuestions;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  return (
    <section
      aria-labelledby="exam-question-prompt"
      className="flex max-w-2xl flex-col gap-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="caption-label">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="tabular">{answeredCount} answered</span>
        </div>
        <div
          role="progressbar"
          aria-label="Exam progress"
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-valuenow={questionNumber}
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3">
          <h2
            id="exam-question-prompt"
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold text-foreground outline-none md:text-lg"
          >
            {question.prompt}
          </h2>
        </legend>
        {question.choices.map((choice) => (
          <label
            key={choice.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm text-foreground transition-colors duration-150 hover:bg-accent",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:checked]:border-primary has-[:checked]:bg-primary/10",
            )}
          >
            <input
              type="radio"
              name={question.id}
              value={choice.id}
              checked={selectedChoiceId === choice.id}
              onChange={() => onSelect(choice.id)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>{choice.text}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={isFirstQuestion}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <Button onClick={onNext}>
          {isLastQuestion ? "See score" : "Next"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};

type ReviewRowProps = { item: ExamReviewItem; questionNumber: number };

const ReviewRow = ({ item, questionNumber }: ReviewRowProps) => {
  const { question, selectedChoice, correctChoice, isCorrect } = item;
  const ResultIcon = isCorrect ? Check : X;

  return (
    <li
      className={cn(
        "flex gap-3 rounded-lg border border-border border-l-4 bg-surface p-4",
        isCorrect && "border-l-success",
        !isCorrect && "border-l-danger",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          isCorrect && "bg-success-soft text-success",
          !isCorrect && "bg-danger-soft text-danger",
        )}
      >
        <ResultIcon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <p className="font-semibold text-foreground">
          <span className="sr-only">
            {isCorrect ? "Correct. " : "Incorrect. "}
          </span>
          {questionNumber}. {question.prompt}
        </p>
        {!isCorrect && (
          <p className="text-muted-foreground">
            Your answer:{" "}
            <span className="text-danger">
              {selectedChoice?.text ?? "Not answered"}
            </span>
          </p>
        )}
        <p className="text-muted-foreground">
          Correct answer:{" "}
          <span className="font-medium text-foreground">
            {correctChoice.text}
          </span>
        </p>
      </div>
    </li>
  );
};

type ScoreCardProps = {
  score: ExamScore;
  review: ExamReviewItem[];
  onRetake: () => void;
};

const ScoreCard = ({ score, review, onRetake }: ScoreCardProps) => {
  const [areAnswersVisible, setAreAnswersVisible] = useState(false);

  const handleToggleAnswers = (): void =>
    setAreAnswersVisible((isVisible) => !isVisible);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section
        aria-labelledby="exam-score-title"
        className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6"
      >
        <h2 id="exam-score-title" className="caption-label">
          Your score
        </h2>
        <p
          className="font-display text-5xl font-semibold text-foreground tabular"
          aria-live="polite"
        >
          {score.correct} / {score.total}
          <span className="ml-3 text-title text-muted-foreground">
            {score.percent}%
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            aria-pressed={areAnswersVisible}
            aria-controls="exam-review"
            onClick={handleToggleAnswers}
          >
            {areAnswersVisible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
            {areAnswersVisible ? "Hide answers" : "Show answers"}
          </Button>
          <Button variant="outline" onClick={onRetake}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        </div>
      </section>

      {areAnswersVisible && (
        <section
          id="exam-review"
          aria-labelledby="exam-review-title"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
        >
          <h2 id="exam-review-title" className="caption-label">
            Answers
          </h2>
          <ol className="flex flex-col gap-3">
            {review.map((item, index) => (
              <ReviewRow
                key={item.question.id}
                item={item}
                questionNumber={index + 1}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};

export const RefereeExam = () => {
  const [phase, setPhase] = useState<ExamPhase>("intro");
  const [questions, setQuestions] = useState<RuleQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswers>({});

  const handleStart = (): void => {
    setQuestions(shuffleExam(QUESTION_BANK));
    setQuestionIndex(0);
    setAnswers({});
    setPhase("question");
  };

  const currentQuestion = questions[questionIndex];

  const handleSelect = (choiceId: string): void => {
    if (!currentQuestion) return;
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: choiceId }));
  };

  const handleBack = (): void =>
    setQuestionIndex((index) => Math.max(0, index - 1));

  const handleNext = (): void => {
    if (questionIndex === questions.length - 1) {
      setPhase("score");
      return;
    }
    setQuestionIndex((index) => index + 1);
  };

  return (
    <>
      <PageHeading
        eyebrow="Officiating"
        title="Referee exam"
        description="Test your knowledge of the NFL FLAG playing rules."
      />
      <div className="px-4 pb-8 md:px-8">
        {phase === "intro" && <IntroCard onStart={handleStart} />}
        {phase === "question" && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionNumber={questionIndex + 1}
            totalQuestions={questions.length}
            answeredCount={Object.keys(answers).length}
            selectedChoiceId={answers[currentQuestion.id]}
            onSelect={handleSelect}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}
        {phase === "score" && (
          <ScoreCard
            score={scoreExam(questions, answers)}
            review={reviewExam(questions, answers)}
            onRetake={handleStart}
          />
        )}
      </div>
    </>
  );
};
