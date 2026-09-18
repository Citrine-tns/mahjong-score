import type {
  Hand,
  Tile,
  GameSettings,
} from "../types/mahjong";

import {
  getBaseTile,
  getDoraTile,
} from "./tiles";

import {
  getAllTiles,
} from "./hand";

function countDora(
  handTiles: Tile[],
  indicators: (
    Tile | null
  )[]
): number {
  let count = 0;

  for (const indicator of indicators) {
    if (!indicator) {
      continue;
    }

    const dora =
      getDoraTile(indicator);

    const baseDora =
      getBaseTile(dora);

    for (const tile of handTiles) {
      if (
        getBaseTile(tile) ===
        baseDora
      ) {
        count++;
      }
    }
  }

  return count;
}

function countRedDora(
  handTiles: Tile[]
): number {
  return handTiles.filter(
    (tile) =>
      tile === "0m" ||
      tile === "0p" ||
      tile === "0s"
  ).length;
}

export type DoraBreakdown = {
  normal: number;
  red: number;
  ura: number;
};

export function getDoraBreakdown(
  hand: Hand,
  settings: GameSettings,
  winningTile?: Tile
): DoraBreakdown {
  const handTiles = [
    ...getAllTiles(hand),
    ...(winningTile
      ? [winningTile]
      : []),
  ];

  const normal = countDora(
    handTiles,
    settings.doraIndicators
  );

  const red = countRedDora(
    handTiles
  );

  const ura =
    settings.riichi ||
    settings.doubleRiichi
      ? countDora(
          handTiles,
          settings.uraDoraIndicators
        )
      : 0;

  return { normal, red, ura };
}

export function countDoraHan(
  hand: Hand,
  settings: GameSettings,
  winningTile?: Tile
): number {
  const {
    normal,
    red,
  } = getDoraBreakdown(
    hand,
    settings,
    winningTile
  );

  return normal + red;
}

export function countUraDoraHan(
  hand: Hand,
  settings: GameSettings,
  winningTile?: Tile
): number {
  return getDoraBreakdown(
    hand,
    settings,
    winningTile
  ).ura;
}
