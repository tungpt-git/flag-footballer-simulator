-- CreateEnum
CREATE TYPE "Position" AS ENUM ('QB', 'WR', 'DB', 'RUSHER');

-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('SLANT', 'OUT', 'GO', 'HOOK', 'POST');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "Position" NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "fortyYardDash" DOUBLE PRECISION NOT NULL,
    "agility" INTEGER NOT NULL,
    "catchProbability" DOUBLE PRECISION NOT NULL,
    "flagPullEfficiency" DOUBLE PRECISION NOT NULL,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "flagPulls" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RouteType" NOT NULL,
    "waypoints" JSONB NOT NULL,
    "decisionPoints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_jerseyNumber_key" ON "Player"("jerseyNumber");

-- CreateIndex
CREATE INDEX "Player_position_idx" ON "Player"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Route_type_key" ON "Route"("type");
