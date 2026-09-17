export type Tile = string;

export type RoundWind =
  | "east"
  | "south"
  | "west"
  | "north";

export type WinMethod =
  | "ron"
  | "tsumo";

export type MeldType =
  | "chi"
  | "pon"
  | "kan_open"
  | "kan_closed"
  | "kan_added";

export type Meld = {
  type: MeldType;
  tiles: Tile[];
};

export type Hand = {
  // 門前部分
  concealed: Tile[];

  // チー・ポン・カンなどの確定面子
  melds: Meld[];
};

export type GameSettings = {
  // 場風
  roundWind: RoundWind;

  // 自風
  seatWind: RoundWind;

  // 連風牌の符
  doubleWindFu: 2 | 4;

  // 切り上げ満貫
  kiriageMangan: boolean;

  // リーチ
  riichi: boolean;

  // ダブルリーチ
  doubleRiichi: boolean;

  // ドラ表示牌
  doraIndicators: (Tile | null)[];

  // 裏ドラ表示牌
  uraDoraIndicators: (Tile | null)[];
};

export type Yaku = {
  name: string;
  han: number;
};

export type Score = {
  // ロンの点数
  ron: number;

  // ツモで親が支払う点数
  tsumoDealer?: number;

  // ツモで子が支払う点数
  tsumoNonDealer?: number;
};

export type ScoreOptions = {
  // 一発
  ippatsu: boolean;

  // 嶺上開花
  rinshan: boolean;

  // ハイテイ
  haitei: boolean;

  // ホウテイ
  houtei: boolean;

  // チャンカン
  chankan: boolean;
};

/**
 * 内部的に扱う面子。
 *
 * fixed = 手入力された副露
 * open = 鳴いているか
 */
export type HandGroup = {
  type:
    | "sequence"
    | "triplet"
    | "quad";

  tiles: Tile[];

  open: boolean;

  fixed: boolean;
};

/**
 * 1つの和了形。
 *
 * 通常形：
 *   pair + 4 groups
 *
 * 七対子：
 *   pair を7個として groups を空にする
 *
 * 国士：
 *   specialType = kokushi
 */
export type HandDecomposition = {
  pair: Tile[];

  groups: HandGroup[];

  specialType?:
    | "chiitoitsu"
    | "kokushi";
};

export type HandEvaluation = {
  yaku: Yaku[];

  // 合計翻数
  han: number;

  // 符
  fu: number;

  // 点数
  score: Score;
};

export type WaitResult = {
  tile: Tile;
  evaluations: HandEvaluation[];
};
