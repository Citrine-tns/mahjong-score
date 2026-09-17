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
  /*
   * 満貫以上の場合の名称。
   * 満貫未満（通常の翻符計算）の場合は null。
   */
  name: string | null;
};

/**
 * 点数区分（満貫・跳満・倍満・三倍満・役満）の
 * 基本点と名称をまとめて求める。
 *
 * isYakuman は「実際に役満に該当する役があるか」
 * を表す。13翻に達していても役満の役が無く、
 * 通常役・ドラの積み上げだけで到達した場合は
 * 「数え役満」として区別する。
 */
function getLimit(
  han: number,
  fu: number,
  kiriageMangan: boolean,
  isYakuman: boolean
): Limit {
  /*
   * 役満（複合による二倍役満・三倍役満…も
   * 含む）。13翻ごとに役満1つ分（8000点）
   * として数える。
   */
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

/**
 * 満貫以上の場合の点数区分名
 * （満貫・跳満・倍満・三倍満・役満・数え役満）を
 * 返す。満貫未満なら null。
 */
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

  /*
   * ここでは点数（base）だけが必要で、
   * 「役満」か「数え役満」かの名称の
   * 違いは点数に影響しないため、
   * isYakuman はどちらでも構わない。
   */
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
  /*
   * 役だけを取得する。
   *
   * ドラ・裏ドラは役ではないため、
   * getYaku() の返す yaku 配列には入れない。
   */
  const yaku =
    getYaku(
      hand,
      decomposition,
      settings,
      scoreOptions,
      winMethod,
      winningTile
    );

  /*
   * ドラと裏ドラは役とは別に管理する。
   *
   * 通常ドラ・赤ドラ・裏ドラは、役名表示の
   * 内訳（ドラ3 赤1 裏2 のような表記）に
   * 使うため、内訳のまま持っておく。
   */
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

  /*
   * 役による翻数だけを計算する。
   *
   * ここにはドラ・裏ドラを含めない。
   */
  const yakuHan =
    yaku.reduce(
      (sum, current) =>
        sum + current.han,
      0
    );

  /*
   * 実際の総翻数は
   *
   *   役 + ドラ + 裏ドラ
   *
   * となる。
   *
   * ただし役満が成立している場合、
   * ドラ・裏ドラは点数に影響しない
   * （役満の価値はドラでは上乗せされない）
   * ため、役による翻数のみを使う。
   */
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

  /*
   * ドラだけでは和了できない。
   *
   * 役が1つもない場合は無役なので、
   * 点数計算を行わない。
   *
   * 例：
   *
   *   ロン
   *   役 0
   *   ドラ 3
   *   → 無役
   *
   * 一方、門前清自摸和などの役がある場合は
   * その役 + ドラで通常どおり点数計算する。
   */
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
