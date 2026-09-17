import type {
  Hand,
  Tile,
} from "../types/mahjong";

import { getBaseTile } from "./tiles";

export type TileCountMap = Record<string, number>;

export function createTileCounts(
  tiles: Tile[]
): TileCountMap {
  const counts: TileCountMap = {};

  for (const tile of tiles) {
    const baseTile = getBaseTile(tile);

    counts[baseTile] =
      (counts[baseTile] ?? 0) + 1;
  }

  return counts;
}

export function getAllTiles(
  hand: Hand
): Tile[] {
  return [
    ...hand.concealed,
    ...hand.melds.flatMap(
      (meld) => meld.tiles
    ),
  ];
}

export function getConcealedBaseTiles(
  hand: Hand,
  winningTile?: Tile
): Tile[] {
  const tiles = [
    ...hand.concealed,
  ];

  if (winningTile) {
    tiles.push(winningTile);
  }

  return tiles.map(getBaseTile);
}

export function isHonor(
  tile: Tile
): boolean {
  return getBaseTile(tile)[1] === "z";
}

export function isTerminal(
  tile: Tile
): boolean {
  const base = getBaseTile(tile);

  if (base[1] === "z") {
    return false;
  }

  const number = Number(base[0]);

  return (
    number === 1 ||
    number === 9
  );
}

export function isTerminalOrHonor(
  tile: Tile
): boolean {
  return (
    isTerminal(tile) ||
    isHonor(tile)
  );
}

export function isSimple(
  tile: Tile
): boolean {
  return (
    !isHonor(tile) &&
    !isTerminal(tile)
  );
}

export function getNumber(
  tile: Tile
): number {
  return Number(
    getBaseTile(tile)[0]
  );
}

export function getSuit(
  tile: Tile
): string {
  return getBaseTile(tile)[1];
}

export function isSameBaseTile(
  a: Tile,
  b: Tile
): boolean {
  return (
    getBaseTile(a) ===
    getBaseTile(b)
  );
}
