import type { Vec2 } from "@/shared/kernel/geometry";

/** 5-on-5 formations from the NFL FLAG playbook, in that playbook's order. */
export type FormationId =
  | "SINGLE_BACK"
  | "SPREAD"
  | "BUNCH"
  | "TRIPS"
  | "TWINS"
  | "I_FORMATION"
  | "DOUBLE_BACK"
  | "TRIPS_STACK"
  | "TWINS_STACK"
  | "SINGLE_SET";

/** Skill players besides the quarterback. X is the left or inside receiver, Z the outside, Y the adjuster, C the center. */
export type SkillPosition = "X" | "Y" | "Z" | "C";

export type PlayAssignment = {
  position: SkillPosition;
  /** Route call printed on the card, e.g. "Post". */
  routeName: string;
  /** Absolute field points in yards. The first point is the alignment. +y is downfield of the line of scrimmage. */
  points: Vec2[];
};

/** One 5-on-5 call: a formation, four routes, and where the quarterback stands. */
export type OffensivePlay = {
  id: string;
  name: string;
  formationId: FormationId;
  blurb: string;
  /** Timing or crossing note the coach should say before the snap. */
  tip?: string;
  quarterback: Vec2;
  assignments: PlayAssignment[];
};

export type Formation = {
  id: FormationId;
  name: string;
  blurb: string;
};

export const FORMATIONS: Formation[] = [
  {
    id: "SINGLE_BACK",
    name: "Single back",
    blurb: "A receiver on each side of the center, with one back a few yards behind the quarterback.",
  },
  {
    id: "SPREAD",
    name: "Spread",
    blurb: "Three receivers across the line, one of them a step off the ball so the release is delayed.",
  },
  {
    id: "BUNCH",
    name: "Bunch",
    blurb: "The receivers start in a cluster so the defense is packed, then they stem to different landmarks.",
  },
  {
    id: "TRIPS",
    name: "Trips",
    blurb: "All three receivers line up on one side. These are drawn to the right; mirror the call to run them left.",
  },
  {
    id: "TWINS",
    name: "Twins",
    blurb: "Two pairs: the center with X on the left, Y with Z on the right. Each pair works off the other.",
  },
  {
    id: "I_FORMATION",
    name: "I formation",
    blurb: "The three receivers stack behind the quarterback, so the defense gets no pre-snap tell.",
  },
  {
    id: "DOUBLE_BACK",
    name: "Double back",
    blurb: "Two backs sit beside the quarterback, with one receiver split wide at the line. Drawn with the split to the right.",
  },
  {
    id: "TRIPS_STACK",
    name: "Trips stack",
    blurb: "Three receivers stacked on one side of the quarterback. Drawn on the right; the stack can slide anywhere.",
  },
  {
    id: "TWINS_STACK",
    name: "Twins stack",
    blurb: "Two receivers stacked on one side, one receiver alone on the other. Drawn with the stack to the right.",
  },
  {
    id: "SINGLE_SET",
    name: "Single set",
    blurb: "Two receivers split evenly on the line, and one back a few yards behind the quarterback.",
  },
];

const point = (x: number, y: number): Vec2 => ({ x, y });

const route = (position: SkillPosition, routeName: string, points: readonly (readonly [number, number])[]): PlayAssignment => ({
  position,
  routeName,
  points: points.map(([x, y]) => point(x, y)),
});

const play = (
  id: string,
  name: string,
  formationId: FormationId,
  blurb: string,
  quarterback: readonly [number, number],
  assignments: PlayAssignment[],
  tip?: string,
): OffensivePlay => ({
  id,
  name,
  formationId,
  blurb,
  quarterback: point(quarterback[0], quarterback[1]),
  assignments,
  ...(tip ? { tip } : {}),
});

/**
 * Thirty 5-on-5 calls, three per formation, adapted from the NFL FLAG playbook.
 * Coordinates are yards on a 30-yard-wide field. +y is past the line of scrimmage.
 */
export const OFFENSIVE_PLAYS: OffensivePlay[] = [
  play(
    "SB_POSTS_CORNER",
    "Posts and corner",
    "SINGLE_BACK",
    "X and Z run posts toward the middle. Y stems up the pipe and breaks a corner. The center is the late corner if nobody is open.",
    [15, -4],
    [
      route("X", "Post", [[5, 0], [5, 10], [12, 20]]),
      route("Z", "Post", [[25, 0], [25, 10], [18, 20]]),
      route("Y", "Corner", [[15, -7], [15, 8], [23, 16]]),
      route("C", "Corner", [[15, 0], [15, 6], [8, 14]]),
    ],
    "If two paths will cross, call who releases first so they do not meet at the stem.",
  ),
  play(
    "SB_FLY_SIDELINE",
    "Fly and sideline",
    "SINGLE_BACK",
    "Z sidesteps the defender and runs a fly. Y slants, then works to the sideline behind that fly. X posts and the center corners off the other way.",
    [15, -4],
    [
      route("Z", "Fly", [[25, 0], [27, 1], [27, 24]]),
      route("Y", "Slant-out", [[15, -7], [15, 1], [20, 6], [27, 8]]),
      route("X", "Post", [[5, 0], [5, 10], [13, 18]]),
      route("C", "Corner", [[15, 0], [15, 6], [7, 14]]),
    ],
  ),
  play(
    "SB_SHORT_DRAG",
    "Short drag",
    "SINGLE_BACK",
    "A short-yardage call. Z runs 10 and squares inside, which pulls the defender and leaves the flat. Y drags into that space. X and the center cross with a short in and out.",
    [15, -4],
    [
      route("Z", "10 and in", [[25, 0], [25, 10], [16, 10]]),
      route("Y", "Drag", [[15, -7], [15, 1], [22, 3], [27, 4]]),
      route("X", "In", [[5, 0], [5, 5], [12, 6]]),
      route("C", "Out", [[15, 0], [15, 4], [6, 5]]),
    ],
    "X and the center cross shallow. Tell them who has the right of way.",
  ),
  play(
    "SP_ATTACK_RIGHT",
    "Attack right",
    "SPREAD",
    "For a defense that is soft on the right. Z jukes into a fly, Y options to the right sideline, and the center joins that side. X posts back across the middle if the defense slides.",
    [15, -5],
    [
      route("Z", "Fly", [[26, 0], [28, 1], [28, 24]]),
      route("Y", "Option", [[12, -2], [12, 5], [22, 8]]),
      route("C", "Out", [[15, 0], [15, 3], [24, 6]]),
      route("X", "Post", [[4, 0], [4, 10], [13, 20]]),
    ],
  ),
  play(
    "SP_ATTACK_LEFT",
    "Attack left",
    "SPREAD",
    "X options to the left sideline and drags the coverage with him. Y runs an in and Z a post into the space that opens. If everyone slides left, the center releases out to the right.",
    [15, -5],
    [
      route("X", "Option", [[4, 0], [4, 4], [2, 6]]),
      route("Y", "In", [[12, -2], [12, 6], [8, 12]]),
      route("Z", "Post", [[26, 0], [26, 10], [16, 20]]),
      route("C", "Out", [[15, 0], [15, 5], [26, 5]]),
    ],
  ),
  play(
    "SP_MESH",
    "Mesh",
    "SPREAD",
    "Y runs a 5-yard out and crosses Z, who hitches. On the other side X and the center run slants that cross, so the defense is picking through traffic on both halves of the field.",
    [15, -5],
    [
      route("Y", "5 and out", [[12, -2], [12, 5], [28, 5]]),
      route("Z", "Hitch", [[26, 0], [26, 6], [26, 4]]),
      route("X", "Slant", [[4, 0], [4, 3], [13, 9]]),
      route("C", "Slant", [[15, 0], [15, 3], [7, 9]]),
    ],
    "Two separate crosses. Walk through both of them before you call it in a game.",
  ),
  play(
    "BN_CORNER_BURST",
    "Corner burst",
    "BUNCH",
    "The center and Y corner in opposite directions and carry the defense deep. X and Z then pop out at staggered depths, so there is a short throw and a longer one.",
    [14, -5],
    [
      route("C", "Corner", [[14, 0], [14, 8], [7, 16]]),
      route("Y", "Corner", [[19, -1.5], [19, 8], [26, 16]]),
      route("X", "5 and out", [[17, 0], [17, 5], [8, 5]]),
      route("Z", "8 and out", [[21, 0], [21, 8], [28, 8]]),
    ],
    "Call the release order before the snap. This bunch is easy to collide in.",
  ),
  play(
    "BN_DRAW_CROSS",
    "Draw and cross",
    "BUNCH",
    "A simpler bunch. X and Z corner and pull the defense back and wide. Y and the center cross on outs at the 5-yard line, into the space those corners just cleared.",
    [14, -5],
    [
      route("X", "Corner", [[17, 0], [17, 8], [8, 16]]),
      route("Z", "Corner", [[21, 0], [21, 8], [28, 16]]),
      route("Y", "5 and out", [[19, -1.5], [19, 5], [27, 5]]),
      route("C", "5 and out", [[14, 0], [14, 5], [5, 5]]),
    ],
  ),
  play(
    "BN_LEVELS",
    "Corner levels",
    "BUNCH",
    "X and Y stem 7 yards and corner, which is the shot. Z and the center run 5-yard outs to the sidelines once the defense has turned to run with the corners.",
    [14, -5],
    [
      route("X", "7 and corner", [[17, 0], [17, 7], [10, 14]]),
      route("Y", "7 and corner", [[19, -1.5], [19, 7], [26, 14]]),
      route("Z", "5 and out", [[21, 0], [21, 5], [28, 5]]),
      route("C", "5 and out", [[14, 0], [14, 5], [5, 5]]),
    ],
  ),
  play(
    "TR_STAGGER",
    "Stagger",
    "TRIPS",
    "The trips release to three different depths: X options at 5 toward the sideline, Y angles out at 5, and Z flies. The center releases late on an angled corner, so the quarterback has a throw at every level.",
    [8, -5],
    [
      route("X", "Option", [[16, 0], [16, 5], [20, 7]]),
      route("Y", "Angled out", [[21, 0], [24, 5], [28, 6]]),
      route("Z", "Fly", [[26, 0], [26, 24]]),
      route("C", "Corner", [[8, 0], [8, 6], [3, 14]]),
    ],
  ),
  play(
    "TR_FLOOD_CROSS",
    "Flood cross",
    "TRIPS",
    "Z flies and Y corners at 7, which floods the right side. X runs an out back toward the open left, and the center runs an in. The throw is the receiver who ends up alone on the left.",
    [8, -5],
    [
      route("Z", "Fly", [[26, 0], [26, 24]]),
      route("Y", "Corner", [[21, 0], [21, 7], [28, 15]]),
      route("X", "Out", [[16, 0], [16, 6], [6, 6]]),
      route("C", "In", [[8, 0], [8, 5], [14, 8]]),
    ],
  ),
  play(
    "TR_HITCH_OPTION",
    "Hitch option",
    "TRIPS",
    "Z hitches at 9 and Y runs a long corner, a two-man shot. X stems to 5, sells a break left, then snaps back right. That chase should leave the center alone on a delayed out.",
    [8, -5],
    [
      route("Z", "Hitch", [[26, 0], [26, 9], [26, 7]]),
      route("Y", "Corner", [[21, 0], [21, 12], [28, 20]]),
      route("X", "Option", [[16, 0], [16, 5], [12, 6], [22, 9]]),
      route("C", "Out", [[8, 0], [8, 2], [8, 5], [2, 5]]),
    ],
    "The center counts two steps before releasing, so the trips can drag the defense right.",
  ),
  play(
    "TW_QUICK_POSTS",
    "Quick posts",
    "TWINS",
    "The right twins run angled posts at two depths and pull the defense inside. X and the center answer with a quick in and out. Throw it on time; this is a first-down call, not a shot.",
    [15, -5],
    [
      route("Y", "Post", [[20, 0], [17, 8], [13, 12]]),
      route("Z", "Post", [[25, 0], [21, 12], [15, 20]]),
      route("X", "In", [[4, 0], [4, 4], [11, 4]]),
      route("C", "Out", [[8, 0], [8, 4], [2, 4]]),
    ],
  ),
  play(
    "TW_MIDDLE_OPTION",
    "Middle option",
    "TWINS",
    "Z flies, Y runs a 5-yard out, and X slants into a fly. Those three clear the middle so the center's option route is the quick throw.",
    [15, -5],
    [
      route("Z", "Fly", [[25, 0], [25, 24]]),
      route("Y", "5 and out", [[20, 0], [20, 5], [28, 5]]),
      route("X", "Slant-fly", [[4, 0], [4, 3], [10, 8], [10, 22]]),
      route("C", "Option", [[8, 0], [8, 3], [14, 5]]),
    ],
  ),
  play(
    "TW_CHAIR",
    "Chair",
    "TWINS",
    "Z posts and Y runs a chair, breaking twice so the defender cannot sit on one cut. X corners on the other side, and the center checks down on a 5-yard out.",
    [15, -5],
    [
      route("Z", "Post", [[25, 0], [25, 10], [16, 18]]),
      route("Y", "Chair", [[20, 0], [20, 7], [26, 8], [18, 12]]),
      route("X", "Corner", [[4, 0], [4, 10], [2, 16]]),
      route("C", "5 and out", [[8, 0], [8, 5], [2, 5]]),
    ],
  ),
  play(
    "IF_SCATTER",
    "Scatter",
    "I_FORMATION",
    "Out of the stack, X angles out, Y angles into a fly, and Z hitches just past the line. The center corners. The middle is the soft spot once everyone has scattered.",
    [15, -4],
    [
      route("X", "Angled out", [[13.5, -7.5], [13.5, 0], [7, 8]]),
      route("Y", "Fly", [[15, -11], [15, 0], [23, 18]]),
      route("Z", "Hitch", [[16.5, -14.5], [16.5, 3], [16.5, 1]]),
      route("C", "Corner", [[15, 0], [15, 8], [6, 16]]),
    ],
  ),
  play(
    "IF_DELAYED_HITCH",
    "Delayed hitch",
    "I_FORMATION",
    "X and Y angle out to opposite sidelines and the center corners. Z waits, then hitches at 5 yards into the middle those three just emptied.",
    [15, -4],
    [
      route("X", "Angled out", [[13.5, -7.5], [13.5, 0], [6, 8]]),
      route("Y", "Angled out", [[15, -11], [15, 0], [24, 8]]),
      route("Z", "Hitch", [[16.5, -14.5], [16.5, -10], [16.5, 5], [18, 3]]),
      route("C", "Corner", [[15, 0], [15, 10], [7, 18]]),
    ],
    "Z holds for a beat after the snap so the hitch is the last player the defense sees.",
  ),
  play(
    "IF_DOUBLE_CROSS",
    "Double cross",
    "I_FORMATION",
    "X runs a shallow chair and Y crosses him on a 5-yard out. Z bends through two slants, and the center flies up the middle for the shot.",
    [15, -4],
    [
      route("X", "Chair", [[13.5, -7.5], [11, 2], [6, 4], [14, 8]]),
      route("Y", "5 and out", [[15, -11], [9, 3], [24, 6]]),
      route("Z", "Double slant", [[16.5, -14.5], [16.5, 0], [8, 7], [18, 13]]),
      route("C", "Fly", [[15, 0], [15, 24]]),
    ],
    "X and Y cross more than once. Decide who is first through each window, and rep it before you install it.",
  ),
  play(
    "DB_POCKET_HITCH",
    "Pocket hitch",
    "DOUBLE_BACK",
    "X outs at 4 yards, Z posts, and the center runs a 5-yard out. That trio leaves the pocket, where Y sits on a shallow hitch.",
    [15, -5],
    [
      route("X", "Out", [[9, -3], [9, 4], [3, 4]]),
      route("Z", "Post", [[26, 0], [26, 10], [17, 18]]),
      route("C", "5 and out", [[15, 0], [15, 5], [7, 5]]),
      route("Y", "Hitch", [[21, -3], [21, 3], [21, 1]]),
    ],
  ),
  play(
    "DB_DEEP_CHAIR",
    "Deep chair",
    "DOUBLE_BACK",
    "X posts and Y runs a deep chair, both carrying the defense back. Z angles in and the center angles out underneath them. Those two are the throws when you only need a few yards.",
    [15, -5],
    [
      route("X", "Post", [[9, -3], [9, 10], [16, 22]]),
      route("Y", "Chair", [[21, -3], [21, 10], [27, 12], [20, 18]]),
      route("Z", "In", [[26, 0], [20, 6]]),
      route("C", "Out", [[15, 0], [7, 5]]),
    ],
  ),
  play(
    "DB_FOUR_SPOTS",
    "Four spots",
    "DOUBLE_BACK",
    "Everyone settles in a different window: X on an angled corner, Z on a wide 5-yard out, Y on an angled hitch, and the center on a 5-yard out. The quarterback picks the window the defense gives up.",
    [15, -5],
    [
      route("X", "Corner", [[9, -3], [9, 8], [3, 16]]),
      route("Z", "5 and out", [[26, 0], [26, 5], [28, 5]]),
      route("Y", "Hitch", [[21, -3], [23, 6], [23, 4]]),
      route("C", "5 and out", [[15, 0], [15, 5], [5, 5]]),
    ],
  ),
  play(
    "TS_DEEP_STACK",
    "Deep stack",
    "TRIPS_STACK",
    "The stack attacks deep: X stems 8 and corners, Y angles on a post, Z angles on a fly. With the defense turned and running, the center checks to a 5-yard out.",
    [10, -5],
    [
      route("X", "8 and corner", [[22.8, 0], [22.8, 8], [28, 15]]),
      route("Y", "Post", [[24, -2.5], [24, 6], [15, 14]]),
      route("Z", "Fly", [[25.2, -5], [27, 22]]),
      route("C", "5 and out", [[10, 0], [10, 5], [3, 5]]),
    ],
  ),
  play(
    "TS_LEVELS",
    "Stack levels",
    "TRIPS_STACK",
    "Three depths out of the stack: X on a short post, Y on a shallow out to the sideline, Z hitching at 10. If none of them is open, the center releases on a fly.",
    [10, -5],
    [
      route("X", "Post", [[22.8, 0], [22.8, 5], [17, 8]]),
      route("Y", "Out", [[24, -2.5], [24, 3], [28, 4]]),
      route("Z", "Hitch", [[25.2, -5], [25.2, 10], [25.2, 8]]),
      route("C", "Fly", [[10, 0], [10, 22]]),
    ],
  ),
  play(
    "TS_RIGHT_SIDE",
    "Right side",
    "TRIPS_STACK",
    "A call into a weak right side. X runs 7 and cuts in, Y corners, and Z angles in. The center adds a deep corner so the whole concept lives on that side.",
    [10, -5],
    [
      route("X", "7 and in", [[22.8, 0], [22.8, 7], [15, 7]]),
      route("Y", "Corner", [[24, -2.5], [26, 10], [28, 16]]),
      route("Z", "In", [[25.2, -5], [17, 8]]),
      route("C", "Corner", [[10, 0], [10, 12], [3, 20]]),
    ],
  ),
  play(
    "TWS_FOUR_OPTIONS",
    "Four options",
    "TWINS_STACK",
    "A beginner call with two shorts and two shots. Y and X fly, while Z and the center run 5-yard outs. The quarterback already knows the answer for the down and distance.",
    [12, -5],
    [
      route("Y", "Fly", [[23.2, 0], [23.2, 24]]),
      route("Z", "5 and out", [[24.8, -2.5], [24.8, 5], [28, 5]]),
      route("X", "Fly", [[6, 0], [6, 24]]),
      route("C", "5 and out", [[12, 0], [12, 5], [3, 5]]),
    ],
  ),
  play(
    "TWS_CROSSING_OUT",
    "Crossing out",
    "TWINS_STACK",
    "Y corners at 7 and Z flies, the deep half of the call. X runs a shallow post that crosses the center, who is running a 7-yard out. Depths are staggered so every throw is a different length.",
    [12, -5],
    [
      route("Y", "Corner", [[23.2, 0], [23.2, 7], [28, 14]]),
      route("Z", "Fly", [[24.8, -2.5], [24.8, 22]]),
      route("X", "Post", [[6, 0], [6, 4], [15, 6]]),
      route("C", "7 and out", [[12, 0], [12, 7], [3, 7]]),
    ],
    "X crosses the center. Call who goes first.",
  ),
  play(
    "TWS_DEEP_SHALLOW",
    "Deep and shallow",
    "TWINS_STACK",
    "Y runs 8 and in, Z posts deep behind him. Underneath, X options across the center while the center releases on a 5-yard out. Deep if you need a chunk, shallow if you need the sticks.",
    [12, -5],
    [
      route("Y", "8 and in", [[23.2, 0], [23.2, 8], [15, 8]]),
      route("Z", "Post", [[24.8, -2.5], [24.8, 12], [14, 22]]),
      route("X", "Option", [[6, 0], [6, 3], [16, 4]]),
      route("C", "5 and out", [[12, 0], [12, 5], [3, 5]]),
    ],
  ),
  play(
    "SS_DEEP_STRETCH",
    "Deep stretch",
    "SINGLE_SET",
    "A shot play. Y runs a deep corner and Z jukes into an angled fly, stretching the defense right. X flies the other way. The center is the 5-yard out when the down only needs a little.",
    [15, -5],
    [
      route("Y", "Corner", [[15, -8], [15, 8], [24, 18]]),
      route("Z", "Fly", [[25, 0], [27, 1], [27, 22]]),
      route("X", "Fly", [[5, 0], [3, 20]]),
      route("C", "5 and out", [[15, 0], [15, 5], [7, 5]]),
    ],
  ),
  play(
    "SS_ALL_LENGTHS",
    "All lengths",
    "SINGLE_SET",
    "Four different depths. Z flies, Y runs a 5-yard out, X slants and then outs across the middle, and the center corners at medium depth. The quarterback throws to the distance the down asks for.",
    [15, -5],
    [
      route("Z", "Fly", [[25, 0], [25, 24]]),
      route("Y", "5 and out", [[15, -8], [15, 5], [24, 5]]),
      route("X", "Slant-out", [[5, 0], [5, 3], [12, 7], [20, 8]]),
      route("C", "Corner", [[15, 0], [15, 10], [8, 16]]),
    ],
  ),
  play(
    "SS_POST_CORNER",
    "Post and corner",
    "SINGLE_SET",
    "Z posts and Y corners, both deep, which holds the safeties. X flies at an angle and clears the shallow left, where the center runs a 5-yard out.",
    [15, -5],
    [
      route("Z", "Post", [[25, 0], [25, 10], [16, 20]]),
      route("Y", "Corner", [[15, -8], [15, 10], [24, 20]]),
      route("X", "Fly", [[5, 0], [3, 20]]),
      route("C", "5 and out", [[15, 0], [15, 5], [4, 5]]),
    ],
    "Rep any play where two runners cross before you put it in on game day.",
  ),
];

const SKILL_POSITIONS: SkillPosition[] = ["X", "Y", "Z", "C"];

export const getFormation = (id: FormationId): Formation => {
  const formation = FORMATIONS.find((candidate) => candidate.id === id);
  if (!formation) throw new Error(`Unknown formation "${id}"`);
  return formation;
};

/** Furthest point any skill player reaches past the line of scrimmage. */
export const getPlayDepthYd = (playToMeasure: OffensivePlay): number =>
  Math.max(...playToMeasure.assignments.flatMap((assignment) => assignment.points.map((spot) => spot.y)));

export const isSkillLineup = (assignments: PlayAssignment[]): boolean => {
  const positions = assignments.map((assignment) => assignment.position);
  return SKILL_POSITIONS.every((position) => positions.filter((candidate) => candidate === position).length === 1);
};
