import type { Tile } from "../types/mahjong";

export const tiles: Tile[] = [
  "1m", "2m", "3m", "4m", "5m", "0m", "6m", "7m", "8m", "9m",
  "1p", "2p", "3p", "4p", "5p", "0p", "6p", "7p", "8p", "9p",
  "1s", "2s", "3s", "4s", "5s", "0s", "6s", "7s", "8s", "9s",
  "1z", "2z", "3z", "4z", "5z", "6z", "7z",
];

export const tileNames: Record<Tile, string> = {
  "1m": "一萬",
  "2m": "二萬",
  "3m": "三萬",
  "4m": "四萬",
  "5m": "五萬",
  "0m": "赤五萬",
  "6m": "六萬",
  "7m": "七萬",
  "8m": "八萬",
  "9m": "九萬",

  "1p": "一筒",
  "2p": "二筒",
  "3p": "三筒",
  "4p": "四筒",
  "5p": "五筒",
  "0p": "赤五筒",
  "6p": "六筒",
  "7p": "七筒",
  "8p": "八筒",
  "9p": "九筒",

  "1s": "一索",
  "2s": "二索",
  "3s": "三索",
  "4s": "四索",
  "5s": "五索",
  "0s": "赤五索",
  "6s": "六索",
  "7s": "七索",
  "8s": "八索",
  "9s": "九索",

  "1z": "東",
  "2z": "南",
  "3z": "西",
  "4z": "北",
  "5z": "白",
  "6z": "發",
  "7z": "中",
};

export function getBaseTile(tile: Tile): Tile {
  if (tile === "0m") return "5m";
  if (tile === "0p") return "5p";
  if (tile === "0s") return "5s";

  return tile;
}

export function isRedTile(tile: Tile): boolean {
  return (
    tile === "0m" ||
    tile === "0p" ||
    tile === "0s"
  );
}

/**
 * 牌の並び順を比較する。
 *
 * m → p → s → z
 * 同じ種類では数字順。
 * 5については通常5 → 赤5。
 */
export function compareTiles(a: Tile, b: Tile): number {
  const baseA = getBaseTile(a);
  const baseB = getBaseTile(b);

  const suitOrder: Record<string, number> = {
    m: 0,
    p: 1,
    s: 2,
    z: 3,
  };

  const suitA = baseA[1];
  const suitB = baseB[1];

  if (suitA !== suitB) {
    return (
      (suitOrder[suitA] ?? 99) -
      (suitOrder[suitB] ?? 99)
    );
  }

  const numberA = Number(baseA[0]);
  const numberB = Number(baseB[0]);

  if (numberA !== numberB) {
    return numberA - numberB;
  }

  // 同じ5なら通常牌を先、赤牌を後。
  if (isRedTile(a) !== isRedTile(b)) {
    return isRedTile(a) ? 1 : -1;
  }

  return 0;
}

/**
 * 牌配列を数字順に並べた新しい配列を返す。
 */
export function sortTiles(tileList: Tile[]): Tile[] {
  return [...tileList].sort(compareTiles);
}

export function getDoraTile(indicator: Tile): Tile {
  const baseTile = getBaseTile(indicator);
  const type = baseTile[1];
  const number = Number(baseTile[0]);

  if (type === "m" || type === "p" || type === "s") {
    const nextNumber =
      number === 9 ? 1 : number + 1;

    return `${nextNumber}${type}`;
  }

  if (type === "z") {
    if (number >= 1 && number <= 4) {
      const nextNumber =
        number === 4 ? 1 : number + 1;

      return `${nextNumber}z`;
    }

    if (number >= 5 && number <= 7) {
      const nextNumber =
        number === 7 ? 5 : number + 1;

      return `${nextNumber}z`;
    }
  }

  return baseTile;
}

export const tileImages: Record<Tile, string> = {
  "1m": "/figures/manzu/man1-66-90-l-emb.png",
  "2m": "/figures/manzu/man2-66-90-l-emb.png",
  "3m": "/figures/manzu/man3-66-90-l-emb.png",
  "4m": "/figures/manzu/man4-66-90-l-emb.png",
  "5m": "/figures/manzu/man5-66-90-l-emb.png",
  "0m": "/figures/manzu/aka3-66-90-l-emb.png",
  "6m": "/figures/manzu/man6-66-90-l-emb.png",
  "7m": "/figures/manzu/man7-66-90-l-emb.png",
  "8m": "/figures/manzu/man8-66-90-l-emb.png",
  "9m": "/figures/manzu/man9-66-90-l-emb.png",

  "1p": "/figures/pinzu/pin1-66-90-l-emb.png",
  "2p": "/figures/pinzu/pin2-66-90-l-emb.png",
  "3p": "/figures/pinzu/pin3-66-90-l-emb.png",
  "4p": "/figures/pinzu/pin4-66-90-l-emb.png",
  "5p": "/figures/pinzu/pin5-66-90-l-emb.png",
  "0p": "/figures/pinzu/aka1-66-90-l-emb.png",
  "6p": "/figures/pinzu/pin6-66-90-l-emb.png",
  "7p": "/figures/pinzu/pin7-66-90-l-emb.png",
  "8p": "/figures/pinzu/pin8-66-90-l-emb.png",
  "9p": "/figures/pinzu/pin9-66-90-l-emb.png",

  "1s": "/figures/sozu/sou1-66-90-l-emb.png",
  "2s": "/figures/sozu/sou2-66-90-l-emb.png",
  "3s": "/figures/sozu/sou3-66-90-l-emb.png",
  "4s": "/figures/sozu/sou4-66-90-l-emb.png",
  "5s": "/figures/sozu/sou5-66-90-l-emb.png",
  "0s": "/figures/sozu/aka2-66-90-l-emb.png",
  "6s": "/figures/sozu/sou6-66-90-l-emb.png",
  "7s": "/figures/sozu/sou7-66-90-l-emb.png",
  "8s": "/figures/sozu/sou8-66-90-l-emb.png",
  "9s": "/figures/sozu/sou9-66-90-l-emb.png",

  "1z": "/figures/tupai/ji1-66-90-l-emb.png",
  "2z": "/figures/tupai/ji2-66-90-l-emb.png",
  "3z": "/figures/tupai/ji3-66-90-l-emb.png",
  "4z": "/figures/tupai/ji4-66-90-l-emb.png",
  "5z": "/figures/tupai/ji5-66-90-l-emb.png",
  "6z": "/figures/tupai/ji6-66-90-l-emb.png",
  "7z": "/figures/tupai/ji7-66-90-l-emb.png",
};

export const tileBackImage =
  "/figures/mahjong_tile_back_yellow_66-90.png";
