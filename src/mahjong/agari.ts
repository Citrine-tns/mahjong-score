import type {
  Hand,
  HandDecomposition,
  HandGroup,
  Meld,
  Tile,
} from "../types/mahjong";

import {
  getBaseTile,
  sortTiles,
} from "./tiles";

import {
  createTileCounts,
  getNumber,
  getSuit,
} from "./hand";

/**
 * 副露を内部の面子形式へ変換する。
 */
function fixedMeldToGroup(
  meld: Meld
): HandGroup {
  const isClosed =
    meld.type === "kan_closed";

  const isKan =
    meld.type === "kan_open" ||
    meld.type === "kan_closed" ||
    meld.type === "kan_added";

  return {
    type: isKan
      ? "quad"
      : meld.type === "chi"
      ? "sequence"
      : "triplet",

    tiles: sortTiles(
      meld.tiles
    ),

    open: !isClosed,
    fixed: true,
  };
}

/**
 * 副露部分を内部形式へ変換する。
 */
function getFixedGroups(
  hand: Hand
): HandGroup[] {
  return hand.melds.map(
    fixedMeldToGroup
  );
}

/**
 * 牌を m -> p -> s -> z、
 * その中では数字順に並べる。
 */
function sortBaseTiles(
  tiles: string[]
): string[] {
  const suitOrder = [
    "m",
    "p",
    "s",
    "z",
  ];

  return [...tiles].sort(
    (a, b) => {
      const suitA = getSuit(a);
      const suitB = getSuit(b);

      const suitDiff =
        suitOrder.indexOf(suitA) -
        suitOrder.indexOf(suitB);

      if (suitDiff !== 0) {
        return suitDiff;
      }

      return (
        getNumber(a) -
        getNumber(b)
      );
    }
  );
}

/**
 * 現在残っている牌の中から、
 * 最も小さい牌を1枚取得する。
 */
function getFirstRemainingTile(
  counts: Record<string, number>
): string | null {
  const remaining =
    Object.keys(counts).filter(
      (tile) =>
        counts[tile] > 0
    );

  if (
    remaining.length === 0
  ) {
    return null;
  }

  return sortBaseTiles(
    remaining
  )[0];
}

/**
 * 通常形の和了形を全探索する。
 *
 * 雀頭 + 4面子
 *
 * 副露部分はすでに固定された面子として扱い、
 * 門前部分について残りの面子をバックトラックで探索する。
 */
function searchStandardDecompositions(
  concealedTiles: Tile[],
  fixedGroups: HandGroup[]
): HandDecomposition[] {
  const initialCounts =
    createTileCounts(
      concealedTiles
    );

  const result: HandDecomposition[] =
    [];

  const requiredGroups =
    4 - fixedGroups.length;

  /*
   * 雀頭候補をすべて試す。
   */
  const pairCandidates =
    sortBaseTiles(
      Object.keys(
        initialCounts
      )
    );

  for (
    const pairTile of pairCandidates
  ) {
    if (
      initialCounts[pairTile] <
      2
    ) {
      continue;
    }

    /*
     * 雀頭を取り除いた状態から
     * 面子を探索する。
     */
    const counts = {
      ...initialCounts,
    };

    counts[pairTile] -= 2;

    searchGroups(
      counts,
      [],
      requiredGroups,
      pairTile,
      fixedGroups,
      result
    );
  }

  return deduplicateDecompositions(
    result
  );
}

/**
 * 残り牌から面子をバックトラックで探索する。
 *
 * 各分岐では牌カウントをコピーするため、
 * ある探索結果が別の探索分岐へ影響しない。
 */
function searchGroups(
  counts: Record<string, number>,
  currentGroups: HandGroup[],
  requiredGroups: number,
  pairTile: string,
  fixedGroups: HandGroup[],
  result: HandDecomposition[]
): void {
  /*
   * 必要な面子数を超えた場合は失敗。
   */
  if (
    currentGroups.length >
    requiredGroups
  ) {
    return;
  }

  /*
   * 残り牌がない場合。
   *
   * 必要な面子数をちょうど作れていれば
   * 正しい通常形。
   */
  const first =
    getFirstRemainingTile(
      counts
    );

  if (first === null) {
    if (
      currentGroups.length ===
      requiredGroups
    ) {
      result.push({
        pair: [
          pairTile,
          pairTile,
        ],

        groups: [
          ...fixedGroups,
          ...currentGroups,
        ],
      });
    }

    return;
  }

  /*
   * まだ必要な面子があるのに
   * 面子数を使い切っていたら失敗。
   */
  if (
    currentGroups.length >=
    requiredGroups
  ) {
    return;
  }

  const count =
    counts[first];

  /*
   * ------------------------------------------------
   * 刻子
   * ------------------------------------------------
   *
   * first が3枚以上あれば、
   * first-first-first の刻子を試す。
   */
  if (count >= 3) {
    const nextCounts = {
      ...counts,
    };

    nextCounts[first] -= 3;

    searchGroups(
      nextCounts,
      [
        ...currentGroups,
        {
          type: "triplet",
          tiles: [
            first,
            first,
            first,
          ],
          open: false,
          fixed: false,
        },
      ],
      requiredGroups,
      pairTile,
      fixedGroups,
      result
    );
  }

  /*
   * ------------------------------------------------
   * 順子
   * ------------------------------------------------
   *
   * 数牌の場合、
   * first, first+1, first+2
   * が揃っていれば順子を試す。
   */
  const suit =
    getSuit(first);

  const number =
    getNumber(first);

  if (
    suit !== "z" &&
    number <= 7
  ) {
    const second =
      `${number + 1}${suit}`;

    const third =
      `${number + 2}${suit}`;

    if (
      (counts[second] ?? 0) >= 1 &&
      (counts[third] ?? 0) >= 1
    ) {
      const nextCounts = {
        ...counts,
      };

      nextCounts[first]--;
      nextCounts[second]--;
      nextCounts[third]--;

      searchGroups(
        nextCounts,
        [
          ...currentGroups,
          {
            type: "sequence",
            tiles: [
              first,
              second,
              third,
            ],
            open: false,
            fixed: false,
          },
        ],
        requiredGroups,
        pairTile,
        fixedGroups,
        result
      );
    }
  }
}

/**
 * 同じ分解が重複して入った場合に削除する。
 */
function deduplicateDecompositions(
  decompositions: HandDecomposition[]
): HandDecomposition[] {
  const seen =
    new Set<string>();

  const result: HandDecomposition[] =
    [];

  for (
    const decomposition of decompositions
  ) {
    const key =
      JSON.stringify({
        pair: sortTiles(
          decomposition.pair
        ).map(getBaseTile),

        groups:
          decomposition.groups
            .map((group) => ({
              type: group.type,

              tiles: sortTiles(
                group.tiles
              ).map(getBaseTile),

              open: group.open,
              fixed: group.fixed,
            }))
            .sort((a, b) =>
              JSON.stringify(a).localeCompare(
                JSON.stringify(b)
              )
            ),
      });

    if (!seen.has(key)) {
      seen.add(key);
      result.push(
        decomposition
      );
    }
  }

  return result;
}

/**
 * 七対子判定。
 */
function getChiitoitsu(
  hand: Hand,
  winningTile?: Tile
): HandDecomposition[] {
  /*
   * 七対子は副露できない。
   */
  if (
    hand.melds.length > 0
  ) {
    return [];
  }

  const tiles = [
    ...hand.concealed,
  ];

  if (winningTile) {
    tiles.push(
      winningTile
    );
  }

  /*
   * 七対子は14枚。
   */
  if (
    tiles.length !== 14
  ) {
    return [];
  }

  const counts =
    createTileCounts(tiles);

  const countEntries =
    Object.entries(counts);

  /*
   * 異なる牌が7種類、
   * それぞれ2枚。
   */
  if (
    countEntries.length !== 7 ||
    countEntries.some(
      ([, count]) =>
        count !== 2
    )
  ) {
    return [];
  }

  return [
    {
      pair: [],
      groups: [],
      specialType:
        "chiitoitsu",
    },
  ];
}

/**
 * 国士無双判定。
 */
function getKokushi(
  hand: Hand,
  winningTile?: Tile
): HandDecomposition[] {
  /*
   * 国士無双は副露できない。
   */
  if (
    hand.melds.length > 0
  ) {
    return [];
  }

  const tiles = [
    ...hand.concealed,
  ];

  if (winningTile) {
    tiles.push(
      winningTile
    );
  }

  /*
   * 国士無双は14枚。
   */
  if (
    tiles.length !== 14
  ) {
    return [];
  }

  const required = [
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
    "1z",
    "2z",
    "3z",
    "4z",
    "5z",
    "6z",
    "7z",
  ];

  const counts =
    createTileCounts(tiles);

  /*
   * 十三種すべてを1枚以上持っていること。
   */
  for (
    const tile of required
  ) {
    if (
      (counts[tile] ?? 0) <
      1
    ) {
      return [];
    }
  }

  /*
   * 十三種すべてが存在すること。
   */
  const uniqueCount =
    required.filter(
      (tile) =>
        (counts[tile] ?? 0) >
        0
    ).length;

  if (
    uniqueCount !== 13
  ) {
    return [];
  }

  /*
   * いずれか1種類が2枚以上あれば雀頭。
   */
  const pairExists =
    required.some(
      (tile) =>
        (counts[tile] ?? 0) >=
        2
    );

  if (!pairExists) {
    return [];
  }

  return [
    {
      pair: [],
      groups: [],
      specialType:
        "kokushi",
    },
  ];
}

/**
 * 手牌が和了形になっているか、
 * また可能な全分解を返す。
 */
export function getHandDecompositions(
  hand: Hand,
  winningTile?: Tile
): HandDecomposition[] {
  const concealedTiles =
    winningTile
      ? [
          ...hand.concealed,
          winningTile,
        ]
      : [
          ...hand.concealed,
        ];

  const fixedGroups =
    getFixedGroups(hand);

  const result: HandDecomposition[] =
    [];

  /*
   * ----------------------------------------
   * 七対子
   * ----------------------------------------
   */
  result.push(
    ...getChiitoitsu(
      hand,
      winningTile
    )
  );

  /*
   * ----------------------------------------
   * 国士無双
   * ----------------------------------------
   */
  result.push(
    ...getKokushi(
      hand,
      winningTile
    )
  );

  /*
   * ----------------------------------------
   * 通常形
   * ----------------------------------------
   *
   * 副露1つにつき、
   * 門前部分に必要な牌は3枚減る。
   *
   * 例:
   *   暗槓1つ
   *   14 - 3 = 11枚
   *
   * 暗槓そのものは4枚だが、
   * 手牌構造上は1面子として3枚分を
   * 門前部分から差し引く。
   */
  const expectedConcealed =
    14 -
    hand.melds.length * 3;

  if (
    concealedTiles.length ===
    expectedConcealed
  ) {
    result.push(
      ...searchStandardDecompositions(
        concealedTiles,
        fixedGroups
      )
    );
  }

  return result;
}

/**
 * 手牌が和了形か判定する。
 */
export function isAgari(
  hand: Hand,
  winningTile?: Tile
): boolean {
  return (
    getHandDecompositions(
      hand,
      winningTile
    ).length > 0
  );
}
