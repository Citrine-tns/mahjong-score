import type {
  Hand,
  Tile,
} from "../types/mahjong";

import {
  getBaseTile,
} from "./tiles";

import {
  getAllTiles,
} from "./hand";

import {
  getHandDecompositions,
} from "./agari";

const waitCandidates: Tile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "0m",
  "6m",
  "7m",
  "8m",
  "9m",

  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "0p",
  "6p",
  "7p",
  "8p",
  "9p",

  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "0s",
  "6s",
  "7s",
  "8s",
  "9s",

  "1z",
  "2z",
  "3z",
  "4z",
  "5z",
  "6z",
  "7z",
];

function hasIncompleteMeld(
  hand: Hand
): boolean {
  return hand.melds.some(
    (meld) => {
      const limit =
        meld.type === "kan_open" ||
        meld.type === "kan_closed" ||
        meld.type === "kan_added"
          ? 4
          : 3;

      return (
        meld.tiles.length !== limit
      );
    }
  );
}

function getUsedBaseCount(
  hand: Hand,
  tile: Tile
): number {
  const base =
    getBaseTile(tile);

  return getAllTiles(hand).filter(
    (current) =>
      getBaseTile(current) ===
      base
  ).length;
}

export function getWaitTiles(
  hand: Hand
): Tile[] {
  const result: Tile[] = [];

  if (
    hasIncompleteMeld(hand)
  ) {
    return result;
  }

  if (
    hand.concealed.length === 0
  ) {
    return result;
  }

  for (const tile of waitCandidates) {
    const usedCount =
      getUsedBaseCount(
        hand,
        tile
      );

    if (usedCount >= 4) {
      continue;
    }

    const decompositions =
      getHandDecompositions(
        hand,
        tile
      );

    if (
      tile === "5p"
    ) {
      console.log(
        "5p待ち判定:",
        {
          usedCount,
          decompositions:
            decompositions.length,
          allTiles:
            getAllTiles(hand),
        }
      );
    }

    if (
      decompositions.length > 0
    ) {
      result.push(tile);
    }
  }

  return result;
}
