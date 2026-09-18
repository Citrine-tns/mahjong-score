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

function getLimit(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean
): Limit {
  if (han >= 13) {
    return {
      base:
        8000 *
        Math.floor(han / 13),
      name: isYakuman
        ? "役満"
        : "数え役満",
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
  isYakuman: boolean
): number {
  return getLimit(
    han,
    fu,
    kiriageMangan,
    isYakuman
  ).base;
}

export function getLimitName(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean
): string | null {
  return getLimit(
    han,
    fu,
    kiriageMangan,
    isYakuman
  ).name;
}

export function calculateScore(
  han: number,
  fu: number,
  settings: GameSettings
): Score {
  const dealer =
    isDealer(settings);

  const base =
    getLimitBase(
      han,
      fu,
      settings.kiriageMangan,
      false
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
          settings
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
