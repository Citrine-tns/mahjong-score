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

/**
 * 待ち判定の候補牌。
 *
 * 5の待ちには、通常の5と赤5をそれぞれ
 * 別の待ち牌として両方含める。アガリ牌が
 * 赤5かどうかで赤ドラの翻数が変わるため。
 */
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

/**
 * 副露がすべて完成しているか確認する。
 *
 * 空の副露枠や未完成の副露枠がある場合は、
 * 待ち牌を計算しない。
 */
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

/**
 * 現在手牌で使用されている同一牌の枚数を取得する。
 *
 * 赤5と通常5は同じ牌として数える。
 */
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

/**
 * 待ち牌を取得する。
 */
export function getWaitTiles(
  hand: Hand
): Tile[] {
  const result: Tile[] = [];

  /*
   * 副露が未完成なら待ち判定しない。
   */
  if (
    hasIncompleteMeld(hand)
  ) {
    return result;
  }

  /*
   * 門前手牌が空なら待ち判定しない。
   */
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

    /*
     * 同じ牌がすでに4枚使われている場合、
     * その牌を待ち牌として追加できない。
     *
     * 赤5もこのアプリの牌選択では通常の5と
     * 合わせて最大4枚まで自由に使える扱いに
     * なっているため（赤5を1枚しか使えない
     * という制限は無い）、待ち判定でも同じ
     * 基準（usedCount）だけで良い。
     */
    if (usedCount >= 4) {
      continue;
    }

    const decompositions =
      getHandDecompositions(
        hand,
        tile
      );

    /*
     * デバッグ用。
     *
     * 特に5pが候補から消える場合、
     * 「4枚使用済み」なのか
     * 「和了形に分解できない」のかを区別できる。
     */
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
