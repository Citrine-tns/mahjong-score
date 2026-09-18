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

function getFixedGroups(
  hand: Hand
): HandGroup[] {
  return hand.melds.map(
    fixedMeldToGroup
  );
}

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

function searchGroups(
  counts: Record<string, number>,
  currentGroups: HandGroup[],
  requiredGroups: number,
  pairTile: string,
  fixedGroups: HandGroup[],
  result: HandDecomposition[]
): void {
  if (
    currentGroups.length >
    requiredGroups
  ) {
    return;
  }

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
 * 七対子判定
 */
function getChiitoitsu(
  hand: Hand,
  winningTile?: Tile
): HandDecomposition[] {
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

  if (
    tiles.length !== 14
  ) {
    return [];
  }

  const counts =
    createTileCounts(tiles);

  const countEntries =
    Object.entries(counts);

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
 * 国士無双判定
 */
function getKokushi(
  hand: Hand,
  winningTile?: Tile
): HandDecomposition[] {
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
