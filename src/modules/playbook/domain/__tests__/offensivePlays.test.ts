import { describe, expect, it } from "vitest";
import { FIELD_WIDTH_YD } from "@/shared/kernel/field";
import { FORMATIONS, OFFENSIVE_PLAYS, getFormation, getPlayDepthYd, isSkillLineup } from "../offensivePlays";

const FIELD_EDGE = 0.5;

describe("5-on-5 offensive plays", () => {
  it("covers every NFL FLAG formation with three distinct calls", () => {
    expect(FORMATIONS).toHaveLength(10);
    expect(OFFENSIVE_PLAYS).toHaveLength(30);
    expect(new Set(OFFENSIVE_PLAYS.map((play) => play.id)).size).toBe(OFFENSIVE_PLAYS.length);
    expect(new Set(OFFENSIVE_PLAYS.map((play) => play.name)).size).toBe(OFFENSIVE_PLAYS.length);

    FORMATIONS.forEach((formation) => {
      const calls = OFFENSIVE_PLAYS.filter((play) => play.formationId === formation.id);
      expect(calls).toHaveLength(3);
      expect(getFormation(formation.id).name).toBe(formation.name);
    });
  });

  it("lines up the quarterback and four skill players, and keeps every path on the field", () => {
    OFFENSIVE_PLAYS.forEach((play) => {
      expect(isSkillLineup(play.assignments)).toBe(true);
      expect(play.quarterback.y).toBeLessThanOrEqual(0);
      expect(play.quarterback.x).toBeGreaterThanOrEqual(FIELD_EDGE);
      expect(play.quarterback.x).toBeLessThanOrEqual(FIELD_WIDTH_YD - FIELD_EDGE);
      expect(play.blurb.length).toBeGreaterThan(20);

      play.assignments.forEach((assignment) => {
        expect(assignment.routeName.length).toBeGreaterThan(0);
        expect(assignment.points.length).toBeGreaterThanOrEqual(2);
        assignment.points.forEach((spot, index) => {
          expect(spot.x).toBeGreaterThanOrEqual(FIELD_EDGE);
          expect(spot.x).toBeLessThanOrEqual(FIELD_WIDTH_YD - FIELD_EDGE);
          expect(spot.y).toBeGreaterThanOrEqual(-16);
          expect(spot.y).toBeLessThanOrEqual(26);
          if (index > 0) {
            const previous = assignment.points[index - 1];
            expect(Math.hypot(spot.x - previous.x, spot.y - previous.y)).toBeGreaterThan(0.5);
          }
        });
      });

      expect(getPlayDepthYd(play)).toBeGreaterThan(0);
    });
  });
});
