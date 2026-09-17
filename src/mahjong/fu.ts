import type {
  GameSettings,
  Hand,
  HandDecomposition,
  Tile,
  WinMethod,
} from "../types/mahjong";

import {
  getBaseTile,
} from "./tiles";

import {
  getNumber,
  isHonor,
  isTerminal,
} from "./hand";

function isClosedHand(
  hand: Hand
): boolean {
  return hand.melds.every(
    (meld) =>
      meld.type ===
      "kan_closed"
  );
}

function isValueTile(
  tile: Tile,
  settings: GameSettings
): boolean {
  const base =
    getBaseTile(tile);

  if (
    ["5z", "6z", "7z"].includes(
      base
    )
  ) {
    return true;
  }

  const windMap: Record<
    string,
    string
  > = {
    east: "1z",
    south: "2z",
    west: "3z",
    north: "4z",
  };

  return (
    base ===
      windMap[
        settings.roundWind
      ] ||
    base ===
      windMap[
        settings.seatWind
      ]
  );
}

export function calculateFu(
  hand: Hand,
  decomposition: HandDecomposition,
  settings: GameSettings,
  winMethod: WinMethod,
  winningTile?: Tile
): number {
  if (
    decomposition.specialType ===
    "chiitoitsu"
  ) {
    return 25;
  }

  /*
   * 国士無双は通常の面子・雀頭による符計算が
   * 成立しないため、慣例的に30符固定とする
   * （役満のため点数計算上は符を使わない）。
   */
  if (
    decomposition.specialType ===
    "kokushi"
  ) {
    return 30;
  }

  let fu = 20;

  const closed =
    isClosedHand(hand);

  // 門前ロン
  if (
    closed &&
    winMethod === "ron"
  ) {
    fu += 10;
  }

  // 雀頭
  if (
    decomposition.pair.length > 0
  ) {
    const pair =
      decomposition.pair[0];

    if (
      isValueTile(
        pair,
        settings
      )
    ) {
      const windMap: Record<
        string,
        string
      > = {
        east: "1z",
        south: "2z",
        west: "3z",
        north: "4z",
      };

      const isRound =
        getBaseTile(pair) ===
        windMap[
          settings.roundWind
        ];

      const isSeat =
        getBaseTile(pair) ===
        windMap[
          settings.seatWind
        ];

      if (isRound && isSeat) {
        fu +=
          settings.doubleWindFu;
      } else {
        fu += 2;
      }
    }
  }

  // 面子
  for (const group of decomposition.groups) {
    /*
     * 未入力の副露など、牌が存在しないグループは
     * 符計算の対象にしない。
     *
     * 通常は waits.ts で計算自体を止めているが、
     * ここでも防御しておく。
     */
    if (
      group.tiles.length === 0
    ) {
      continue;
    }

    if (
      group.type ===
      "sequence"
    ) {
      continue;
    }

    const tile =
      getBaseTile(
        group.tiles[0]
      );

    const terminalOrHonor =
      isTerminal(tile) ||
      isHonor(tile);

    if (
      group.type ===
      "triplet"
    ) {
      if (
        group.open
      ) {
        fu += terminalOrHonor
          ? 4
          : 2;
      } else {
        fu += terminalOrHonor
          ? 8
          : 4;
      }
    }

    if (
      group.type ===
      "quad"
    ) {
      if (
        group.open
      ) {
        fu += terminalOrHonor
          ? 16
          : 8;
      } else {
        fu += terminalOrHonor
          ? 32
          : 16;
      }
    }
  }

  // 待ちの形による2符
  if (
    winningTile &&
    decomposition.pair.length > 0
  ) {
    const winningBase =
      getBaseTile(
        winningTile
      );

    // 単騎
    if (
      getBaseTile(
        decomposition.pair[0]
      ) === winningBase
    ) {
      fu += 2;
    } else {
      const winningSequence =
        decomposition.groups.find(
          (group) =>
            group.type ===
              "sequence" &&
            group.tiles.length > 0 &&
            group.tiles.some(
              (tile) =>
                getBaseTile(
                  tile
                ) === winningBase
            )
        );

      if (
        winningSequence
      ) {
        const start =
          getNumber(
            winningSequence.tiles[0]
          );

        const winNumber =
          getNumber(
            winningTile
          );

        const index =
          winNumber - start;

        // 嵌張
        if (
          index === 1
        ) {
          fu += 2;
        }

        // 辺張
        if (
          (start === 1 &&
            index === 0) ||
          (start === 7 &&
            index === 2)
        ) {
          fu += 2;
        }
      }
    }
  }

  // ツモ2符
  //
  // 平和ツモは0符だが、
  // ここでは後段で処理しやすいよう
  // 門前平和を20符として扱う。
  if (
    winMethod === "tsumo"
  ) {
    fu += 2;
  }

  // 平和は20符
  const isPinfu =
    closed &&
    decomposition.groups.length ===
      4 &&
    decomposition.groups.every(
      (group) =>
        group.tiles.length > 0 &&
        group.type ===
        "sequence"
    ) &&
    decomposition.pair.length >
      0 &&
    !isValueTile(
      decomposition.pair[0],
      settings
    );

  if (isPinfu) {
    // 平和ツモ
    if (
      winMethod === "tsumo"
    ) {
      return 20;
    }

    // 平和ロン
    return 30;
  }

  // 10符単位に切り上げ
  return Math.ceil(
    fu / 10
  ) * 10;
}
