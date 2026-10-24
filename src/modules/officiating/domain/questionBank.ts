import type { RuleQuestion } from "@/modules/officiating/domain/exam";

export const RULEBOOK_TITLE =
  "NFL FLAG Official Playing Rules (2025-26, Spring 2026 season)";

/** Each `section` points at the rule in the official playing rules so the answer can be checked. */
export const QUESTION_BANK: RuleQuestion[] = [
  {
    id: "coin-toss-caller",
    section: "I.1",
    prompt:
      "Captains meet at midfield before the game. Which team calls the coin toss?",
    choices: [
      { id: "visiting", text: "The visiting team" },
      { id: "home", text: "The home team" },
      { id: "referee", text: "The referee picks a team at random" },
      { id: "higher-seed", text: "The team with the better record" },
    ],
    correctChoiceId: "visiting",
  },
  {
    id: "starting-spot",
    section: "I.3",
    prompt:
      "Where does the offense start a new possession on the standard field?",
    choices: [
      { id: "own-5", text: "Its own 5-yard line" },
      { id: "own-10", text: "Its own 10-yard line" },
      { id: "own-20", text: "Its own 20-yard line" },
      { id: "midfield", text: "Midfield" },
    ],
    correctChoiceId: "own-5",
  },
  {
    id: "downs-after-midfield",
    section: "I.3",
    prompt:
      "The offense has crossed midfield. How many downs does it have to score a touchdown?",
    choices: [
      { id: "three", text: "Three" },
      { id: "four", text: "Four" },
      { id: "two", text: "Two" },
      { id: "reset-four", text: "A new set of four, like tackle football" },
    ],
    correctChoiceId: "three",
  },
  {
    id: "failed-fourth-down",
    section: "I.3",
    prompt:
      'On 4th down the coach declares "Play" and the offense fails to cross midfield. Where does the other team start?',
    choices: [
      { id: "spot", text: "At the spot where 4th down ended" },
      { id: "own-5", text: "At its own 5-yard line" },
      { id: "midfield", text: "At midfield" },
      { id: "previous-los", text: "At the previous line of scrimmage" },
    ],
    correctChoiceId: "spot",
  },
  {
    id: "field-width",
    section: "IV",
    prompt: "How wide is a standard NFL FLAG field?",
    choices: [
      { id: "25", text: "25 yards" },
      { id: "30", text: "30 yards" },
      { id: "20", text: "20 yards" },
      { id: "40", text: "40 yards" },
    ],
    correctChoiceId: "25",
  },
  {
    id: "no-run-zones",
    section: "IV.1",
    prompt: "Where are the No Run Zones?",
    choices: [
      {
        id: "five-before",
        text: "5 yards before midfield and 5 yards before the opponent's end zone",
      },
      {
        id: "ten-before",
        text: "10 yards before midfield and 10 yards before the end zone",
      },
      { id: "end-zones", text: "Only inside both end zones" },
      { id: "own-half", text: "Everywhere in the offense's own half" },
    ],
    correctChoiceId: "five-before",
  },
  {
    id: "metal-cleats",
    section: "III.2",
    prompt:
      "During the equipment check you see a player wearing cleats with exposed metal. What is the ruling?",
    choices: [
      { id: "remove", text: "Never allowed: the cleats must be removed" },
      { id: "tape", text: "Allowed if the metal is taped over" },
      { id: "warning", text: "Allowed with a warning to the coach" },
      { id: "older", text: "Allowed in older divisions only" },
    ],
    correctChoiceId: "remove",
  },
  {
    id: "play-clock",
    section: "VI.3",
    prompt:
      "In regular season play, how long does the offense have to snap the ball once it is spotted?",
    choices: [
      { id: "40", text: "40 seconds" },
      { id: "25", text: "25 seconds" },
      { id: "30", text: "30 seconds" },
      { id: "60", text: "60 seconds" },
    ],
    correctChoiceId: "40",
  },
  {
    id: "timeouts",
    section: "VI.4",
    prompt: "How many timeouts does each team get in regular season play?",
    choices: [
      {
        id: "one-per-half",
        text: "One 60-second timeout per half, with no carryover",
      },
      { id: "three-per-game", text: "Three 30-second timeouts per game" },
      { id: "two-per-half", text: "Two 30-second timeouts per half" },
      { id: "one-carry", text: "One per half, and an unused one carries over" },
    ],
    correctChoiceId: "one-per-half",
  },
  {
    id: "overtime-timeouts",
    section: "VI.6.f",
    prompt: "What may a team use during overtime?",
    choices: [
      {
        id: "challenge",
        text: "No timeouts, and one coach's challenge on a misapplied rule",
      },
      { id: "one-timeout", text: "One timeout per overtime round" },
      { id: "carryover", text: "Any timeouts left from regulation" },
      { id: "judgement", text: "One challenge on any judgement call" },
    ],
    correctChoiceId: "challenge",
  },
  {
    id: "one-point-try",
    section: "VII.2",
    prompt:
      "A team chooses a 1-point conversion. Where is the ball spotted, and what plays are allowed?",
    choices: [
      { id: "five-pass", text: "The 5-yard line, pass only" },
      { id: "five-any", text: "The 5-yard line, run or pass" },
      { id: "ten-pass", text: "The 10-yard line, pass only" },
      { id: "three-any", text: "The 3-yard line, run or pass" },
    ],
    correctChoiceId: "five-pass",
  },
  {
    id: "conversion-interception",
    section: "VII.3",
    prompt:
      "The defense intercepts a 2-point conversion and returns it for a score. How many points is it worth?",
    choices: [
      { id: "two", text: "2 points" },
      { id: "six", text: "6 points" },
      { id: "one", text: "1 point" },
      {
        id: "zero",
        text: "0 points: interceptions on conversions are dead balls",
      },
    ],
    correctChoiceId: "two",
  },
  {
    id: "one-flag-catch",
    section: "IX.8.g",
    prompt:
      "A receiver catches a pass while wearing only one flag. What happens?",
    choices: [
      { id: "dead", text: "The play is dead at the spot of the catch" },
      {
        id: "touch",
        text: "Play continues and a one-hand touch downs the runner",
      },
      { id: "incomplete", text: "The pass is ruled incomplete" },
      { id: "penalty", text: "Flag guarding penalty on the offense" },
    ],
    correctChoiceId: "dead",
  },
  {
    id: "inadvertent-whistle",
    section: "IX.8",
    prompt:
      "An official blows an inadvertent whistle during a run. What options does the team in possession have?",
    choices: [
      {
        id: "spot-or-replay",
        text: "Take the ball where the whistle blew (the down counts) or replay the down",
      },
      { id: "replay-only", text: "The down is always replayed" },
      {
        id: "spot-only",
        text: "The ball is always placed where the whistle blew",
      },
      {
        id: "defense-chooses",
        text: "The defense chooses where the ball goes",
      },
    ],
    correctChoiceId: "spot-or-replay",
  },
  {
    id: "center-sneak",
    section: "X.3",
    prompt:
      "The quarterback hands the ball straight to the center, who runs across the line. Is this legal?",
    choices: [
      {
        id: "illegal",
        text: "No: the QB may not hand off, pitch or lateral to the center first",
      },
      { id: "legal", text: "Yes: any handoff behind the line is legal" },
      { id: "legal-outside", text: "Yes, unless the ball is in a No Run Zone" },
      {
        id: "legal-pass",
        text: "Only if the center then throws a forward pass",
      },
    ],
    correctChoiceId: "illegal",
  },
  {
    id: "pass-clock",
    section: "XI.3",
    prompt:
      "The quarterback still has the ball 7 seconds after the snap, with no handoff or pitch. What is the ruling?",
    choices: [
      {
        id: "dead",
        text: "Play is dead, the down counts, and the ball returns to the line of scrimmage",
      },
      { id: "delay", text: "Delay of game: 5 yards and replay the down" },
      { id: "sack", text: "Sack at the spot of the quarterback" },
      { id: "continue", text: "Play continues: there is no pass clock" },
    ],
    correctChoiceId: "dead",
  },
  {
    id: "intentional-grounding",
    section: "XI.1",
    prompt:
      "Under pressure, the quarterback throws the ball across the line of scrimmage to an area with no receiver. What is the call?",
    choices: [
      {
        id: "incomplete",
        text: "Incomplete pass: there is no intentional grounding",
      },
      {
        id: "grounding",
        text: "Intentional grounding: loss of down at the spot",
      },
      { id: "delay", text: "Delay of game" },
      { id: "safety", text: "A safety if the QB is in the end zone" },
    ],
    correctChoiceId: "incomplete",
  },
  {
    id: "rusher-count",
    section: "XIII.1",
    prompt:
      "How many defenders may rush the quarterback from the 7-yard rush line, and how do they identify themselves?",
    choices: [
      {
        id: "two-hand",
        text: "Up to two, each raising a hand before the snap",
      },
      { id: "one-call", text: 'One, by calling "rush" out loud' },
      { id: "any", text: "Any number, with no signal" },
      { id: "two-nothing", text: "Up to two, with no signal needed" },
    ],
    correctChoiceId: "two-hand",
  },
  {
    id: "illegal-rush",
    section: "XVII.iv",
    prompt:
      "A defender who is not at the rush line crosses the line of scrimmage before a handoff or pass. What is the penalty?",
    choices: [
      {
        id: "plus-5-first",
        text: "Illegal rush: 5 yards from the line of scrimmage and an automatic first down",
      },
      {
        id: "plus-10-first",
        text: "10 yards from the line of scrimmage and an automatic first down",
      },
      { id: "plus-5-replay", text: "5 yards and replay the down" },
      { id: "warning", text: "A warning for the first offense" },
    ],
    correctChoiceId: "plus-5-first",
  },
  {
    id: "impeding-rusher",
    section: "XIII.5",
    prompt:
      "After the snap, a moving receiver cuts into a rusher's path to the quarterback. What is the call?",
    choices: [
      {
        id: "impeding",
        text: "Impeding the rusher: minus 5 yards from the line of scrimmage and loss of down",
      },
      { id: "no-call", text: "No call: the rusher must go around" },
      {
        id: "screening",
        text: "Screening: 10 yards and an automatic first down for the defense",
      },
      { id: "roughing", text: "Roughing the passer on the defense" },
    ],
    correctChoiceId: "impeding",
  },
  {
    id: "flag-guarding",
    section: "XVII.iii",
    prompt:
      "A ball-carrier drops a hand over a flag to keep a defender from pulling it. What is the enforcement?",
    choices: [
      { id: "spot-5", text: "Spot foul: minus 5 yards and loss of down" },
      { id: "los-10", text: "Minus 10 yards from the line of scrimmage" },
      { id: "dead", text: "The play is blown dead with no yardage" },
      { id: "warning", text: "A warning for the first offense" },
    ],
    correctChoiceId: "spot-5",
  },
  {
    id: "roughing-passer",
    section: "XVII.iv",
    prompt:
      "A rusher trying to block a pass makes contact with the quarterback that is not incidental. What is the penalty?",
    choices: [
      {
        id: "plus-5-first",
        text: "Roughing the passer: 5 yards from the line of scrimmage and an automatic first down",
      },
      { id: "plus-15", text: "15 yards and an ejection" },
      { id: "plus-10-replay", text: "10 yards and replay the down" },
      { id: "no-call", text: "No call: blocking a pass is legal" },
    ],
    correctChoiceId: "plus-5-first",
  },
  {
    id: "who-may-ask",
    section: "XVII.i.4",
    prompt:
      "Who may ask the referee about a rule clarification or interpretation?",
    choices: [
      { id: "captain-coach", text: "Only the team captain or the head coach" },
      { id: "any-player", text: "Any player on the field" },
      { id: "any-coach", text: "Any coach on the sideline" },
      { id: "parents", text: "Any adult in the team area" },
    ],
    correctChoiceId: "captain-coach",
  },
  {
    id: "half-ends-defensive-foul",
    section: "XVII.i.5",
    prompt:
      "Time expires during a play on which the defense commits a foul. Can the half end?",
    choices: [
      {
        id: "unless-declined",
        text: "No, unless the offense declines the penalty",
      },
      { id: "yes", text: "Yes: the clock decides" },
      { id: "replay-always", text: "No: the down is always replayed" },
      { id: "only-dpi", text: "Only if the foul was not pass interference" },
    ],
    correctChoiceId: "unless-declined",
  },
];
