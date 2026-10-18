import type {
  Score,
  GameSettings,
  Hand,
  HandDecomposition,
  ScoreOptions,
  WinMethod,
} from "../types/mahjong";

import {
  getYaku,
  hasYakuman,
} from "./yaku";

import {
  calculateFu,
} from "./fu";

import {
  getDoraBreakdown,
} from "./dora";

function isDealer(
  settings: GameSettings
): boolean {
  return (
    settings.seatWind ===
    "east"
  );
}

function ceil100(
  value: number
): number {
  return Math.ceil(
    value / 100
  ) * 100;
}

type Limit = {
  base: number;
  name: string | null;
};

/*
 * 役満が複合して重なった場合の名称。
 * 二倍役満・三倍役満…という表記に
 * するため、倍数ごとの名称を用意する
 * （それ以上の倍数は「N倍役満」に
 * フォールバックする）。
 */
const YAKUMAN_MULTIPLIER_NAMES: Record<
  number,
  string
> = {
  1: "役満",
  2: "二倍役満",
  3: "三倍役満",
  4: "四倍役満",
  5: "五倍役満",
  6: "六倍役満",
};

function getYakumanName(
  multiplier: number
): string {
  return (
    YAKUMAN_MULTIPLIER_NAMES[
      multiplier
    ] ??
    `${multiplier}倍役満`
  );
}

function getLimit(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean,
  countedYakuman: boolean,
  compoundYakuman: boolean
): Limit {
  if (han >= 13) {
    /*
     * 数え役満（役満に該当する役は
     * 無いが、通常役・ドラの積み上げで
     * 13翻以上に達した場合）は、設定で
     * 「数え役満あり」の時だけ役満扱い
     * （翻数はそのまま増やしてよいが、
     * 点数は常に通常の役満1つ分で固定、
     * 26翻・39翻などに達しても二倍・
     * 三倍にはしない）。「数え役満なし」
     * の設定なら三倍満止まりにする。
     */
    if (!isYakuman) {
      if (!countedYakuman) {
        return {
          base: 6000,
          name: "三倍満",
        };
      }

      return {
        base: 8000,
        name: "数え役満",
      };
    }

    /*
     * 実際に役満の役がある場合、
     * 設定で「複合役満あり」の時だけ
     * 13翻ごとに点数・名称ともに
     * 倍化する。「複合役満なし」なら
     * 何翻あっても常に単一の役満。
     */
    if (!compoundYakuman) {
      return {
        base: 8000,
        name: getYakumanName(
          1
        ),
      };
    }

    const multiplier =
      Math.floor(han / 13);

    return {
      base:
        8000 * multiplier,
      name: getYakumanName(
        multiplier
      ),
    };
  }

  if (han >= 11) {
    return {
      base: 6000,
      name: "三倍満",
    };
  }

  if (han >= 8) {
    return {
      base: 4000,
      name: "倍満",
    };
  }

  if (han >= 6) {
    return {
      base: 3000,
      name: "跳満",
    };
  }

  if (han >= 5) {
    return {
      base: 2000,
      name: "満貫",
    };
  }

  if (
    kiriageMangan &&
    (
      (han === 4 &&
        fu >= 30) ||
      (han === 3 &&
        fu >= 60)
    )
  ) {
    return {
      base: 2000,
      name: "満貫",
    };
  }

  const base =
    fu *
    Math.pow(
      2,
      han + 2
    );

  if (base >= 2000) {
    return {
      base: 2000,
      name: "満貫",
    };
  }

  return { base, name: null };
}

function getLimitBase(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean,
  countedYakuman: boolean,
  compoundYakuman: boolean
): number {
  return getLimit(
    han,
    fu,
    kiriageMangan,
    isYakuman,
    countedYakuman,
    compoundYakuman
  ).base;
}

export function getLimitName(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean,
  countedYakuman: boolean,
  compoundYakuman: boolean
): string | null {
  return getLimit(
    han,
    fu,
    kiriageMangan,
    isYakuman,
    countedYakuman,
    compoundYakuman
  ).name;
}

export function calculateScore(
  han: number,
  fu: number,
  settings: GameSettings,
  isYakuman: boolean
): Score {
  const dealer =
    isDealer(settings);

  const base =
    getLimitBase(
      han,
      fu,
      settings.kiriageMangan,
      isYakuman,
      settings.countedYakuman,
      settings.compoundYakuman
    );

  const ron = ceil100(
    base *
      (dealer ? 6 : 4)
  );

  if (dealer) {
    const each =
      ceil100(base * 2);

    return {
      ron,
      tsumoDealer: each,
      tsumoNonDealer: each,
    };
  }

  return {
    ron,
    tsumoDealer: ceil100(
      base * 2
    ),
    tsumoNonDealer: ceil100(
      base
    ),
  };
}

export function evaluateHand(
  hand: Hand,
  decomposition: HandDecomposition,
  settings: GameSettings,
  scoreOptions: ScoreOptions,
  winMethod: WinMethod,
  winningTile?: string
) {
  const yaku =
    getYaku(
      hand,
      decomposition,
      settings,
      scoreOptions,
      winMethod,
      winningTile
    );

  const doraBreakdown =
    getDoraBreakdown(
      hand,
      settings,
      winningTile
    );

  const normalDoraHan =
    doraBreakdown.normal;

  const redDoraHan =
    doraBreakdown.red;

  const doraHan =
    normalDoraHan + redDoraHan;

  const uraDoraHan =
    doraBreakdown.ura;

  const yakuHan =
    yaku.reduce(
      (sum, current) =>
        sum + current.han,
      0
    );

  const han = hasYakuman(
    yaku
  )
    ? yakuHan
    : yakuHan +
      doraHan +
      uraDoraHan;

  const fu =
    calculateFu(
      hand,
      decomposition,
      settings,
      winMethod,
      winningTile
    );
  const score =
    yakuHan === 0
      ? {
          ron: 0,
          tsumoDealer: 0,
          tsumoNonDealer: 0,
        }
      : calculateScore(
          han,
          fu,
          settings,
          hasYakuman(yaku)
        );

  return {
    yaku,
    han,
    fu,
    doraHan,
    normalDoraHan,
    redDoraHan,
    uraDoraHan,
    score,
  };
}
