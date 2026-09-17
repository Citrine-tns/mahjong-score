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

/**
 * 通常ドラ・裏ドラを数える。
 */
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

/**
 * 赤ドラを数える。
 *
 * 0m / 0p / 0s はそれぞれ赤5として扱い、
 * 1枚につき1翻。
 */
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

/**
 * 通常ドラ・赤ドラ・裏ドラを内訳で数える。
 *
 * アガリ牌自体がドラである場合も加味する
 * 必要があるため、待ち（winningTile）ごとに
 * 結果が変わりうる。
 */
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
