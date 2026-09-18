import type {
  Hand,
  GameSettings,
  Tile,
} from "../types/mahjong";

import {
  tiles,
  tileImages,
  getBaseTile,
} from "../mahjong/tiles";

type InputTarget =
  | {
      type: "concealed";
    }
  | {
      type: "meld";
      index: number;
    }
  | {
      type: "dora";
    }
  | {
      type: "uraDora";
    };

type Props = {
  hand: Hand;
  settings: GameSettings;
  inputTarget: InputTarget;
  onSelectTile: (
    tile: Tile
  ) => void;
};

function getUsedCount(
  hand: Hand,
  settings: GameSettings,
  tile: Tile,
  inputTarget: InputTarget
): number {
  const base =
    getBaseTile(tile);

  let count = 0;

  for (const current of hand.concealed) {
    if (
      getBaseTile(current) ===
      base
    ) {
      count++;
    }
  }

  for (
    let i = 0;
    i < hand.melds.length;
    i++
  ) {
    if (
      inputTarget.type ===
        "meld" &&
      inputTarget.index === i
    ) {
      continue;
    }

    for (const current of hand.melds[
      i
    ].tiles) {
      if (
        getBaseTile(current) ===
        base
      ) {
        count++;
      }
    }
  }

  for (const indicator of settings.doraIndicators) {
    if (
      indicator &&
      getBaseTile(indicator) ===
        base
    ) {
      count++;
    }
  }

  for (const indicator of settings.uraDoraIndicators) {
    if (
      indicator &&
      getBaseTile(indicator) ===
        base
    ) {
      count++;
    }
  }

  if (
    inputTarget.type ===
    "meld"
  ) {
    for (const current of hand.melds[
      inputTarget.index
    ]?.tiles ?? []) {
      if (
        getBaseTile(current) ===
        base
      ) {
        count++;
      }
    }
  }

  return count;
}

function getMeldLimit(
  hand: Hand,
  inputTarget: InputTarget
): number {
  if (
    inputTarget.type !==
    "meld"
  ) {
    return 0;
  }

  const meld =
    hand.melds[
      inputTarget.index
    ];

  if (!meld) {
    return 0;
  }

  return (
    meld.type ===
      "kan_open" ||
    meld.type ===
      "kan_closed" ||
    meld.type ===
      "kan_added"
      ? 4
      : 3
  );
}

function getNumber(
  tile: Tile
): number {
  return Number(
    getBaseTile(tile)[0]
  );
}

function getSuit(
  tile: Tile
): string {
  return getBaseTile(tile)[1];
}

function isSequence(
  tile1: Tile,
  tile2: Tile,
  tile3: Tile
): boolean {
  const base1 =
    getBaseTile(tile1);

  const base2 =
    getBaseTile(tile2);

  const base3 =
    getBaseTile(tile3);

  if (
    getSuit(base1) === "z" ||
    getSuit(base2) === "z" ||
    getSuit(base3) === "z"
  ) {
    return false;
  }

  if (
    getSuit(base1) !==
      getSuit(base2) ||
    getSuit(base1) !==
      getSuit(base3)
  ) {
    return false;
  }

  const numbers = [
    getNumber(base1),
    getNumber(base2),
    getNumber(base3),
  ].sort(
    (a, b) => a - b
  );

  if (
    new Set(numbers).size !==
    3
  ) {
    return false;
  }

  return (
    numbers[1] ===
      numbers[0] + 1 &&
    numbers[2] ===
      numbers[1] + 1
  );
}

function getSequenceCandidates(
  tile: Tile
): Tile[][] {
  const base =
    getBaseTile(tile);

  const suit =
    getSuit(base);

  const number =
    getNumber(base);

  if (
    suit === "z"
  ) {
    return [];
  }

  const candidates: Tile[][] =
    [];

  const possibleStarts = [
    number - 2,
    number - 1,
    number,
  ];

  for (
    const start of possibleStarts
  ) {
    if (
      start < 1 ||
      start > 7
    ) {
      continue;
    }

    const sequence: Tile[] = [
      `${start}${suit}` as Tile,
      `${start + 1}${suit}` as Tile,
      `${start + 2}${suit}` as Tile,
    ];

    if (
      sequence.some(
        (sequenceTile) =>
          getBaseTile(
            sequenceTile
          ) === base
      )
    ) {
      candidates.push(
        sequence
      );
    }
  }

  return candidates;
}

function canCompleteSequence(
  hand: Hand,
  settings: GameSettings,
  inputTarget: InputTarget,
  currentTiles: Tile[],
  candidate: Tile
): boolean {
  const candidateBase =
    getBaseTile(candidate);

  for (
    const current of currentTiles
  ) {
    if (
      getSuit(current) !==
      getSuit(candidateBase)
    ) {
      return false;
    }
  }

  const sequences =
    getSequenceCandidates(
      candidateBase
    );

  for (
    const sequence of sequences
  ) {

    let containsCurrentTiles =
      true;

    const sequenceRemaining = [
      ...sequence,
    ];

    for (
      const current of currentTiles
    ) {
      const currentBase =
        getBaseTile(current);

      const index =
        sequenceRemaining.findIndex(
          (sequenceTile) =>
            getBaseTile(
              sequenceTile
            ) === currentBase
        );

      if (
        index === -1
      ) {
        containsCurrentTiles =
          false;
        break;
      }

      sequenceRemaining.splice(
        index,
        1
      );
    }

    if (
      !containsCurrentTiles
    ) {
      continue;
    }

    const candidateIndex =
      sequenceRemaining.findIndex(
        (sequenceTile) =>
          getBaseTile(
            sequenceTile
          ) === candidateBase
      );

    if (
      candidateIndex === -1
    ) {
      continue;
    }

    sequenceRemaining.splice(
      candidateIndex,
      1
    );

    let possible = true;

    for (
      const requiredTile of sequenceRemaining
    ) {
      if (
        getUsedCount(
          hand,
          settings,
          requiredTile,
          inputTarget
        ) >= 4
      ) {
        possible = false;
        break;
      }
    }

    if (
      possible
    ) {
      return true;
    }
  }

  return false;
}

function canSelectForMeld(
  hand: Hand,
  settings: GameSettings,
  inputTarget: InputTarget,
  tile: Tile
): boolean {
  if (
    inputTarget.type !==
    "meld"
  ) {
    return true;
  }

  const meld =
    hand.melds[
      inputTarget.index
    ];

  if (!meld) {
    return false;
  }

  const currentTiles =
    meld.tiles.map(
      getBaseTile
    );

  if (
    currentTiles.length === 0
  ) {

    if (
      meld.type === "chi"
    ) {

      if (
        getSuit(tile) === "z"
      ) {
        return false;
      }

      return canCompleteSequence(
        hand,
        settings,
        inputTarget,
        [],
        tile
      );
    }

    if (
      meld.type === "pon"
    ) {
      return (
        getUsedCount(
          hand,
          settings,
          tile,
          inputTarget
        ) <= 2
      );
    }

    if (
      meld.type === "kan_open" ||
      meld.type === "kan_closed" ||
      meld.type === "kan_added"
    ) {
      return (
        getUsedCount(
          hand,
          settings,
          tile,
          inputTarget
        ) === 0
      );
    }

    return false;
  }

  /*
   * =========================
   * ポン・カン
   * =========================
   */
  if (
    meld.type === "pon" ||
    meld.type === "kan_open" ||
    meld.type === "kan_closed" ||
    meld.type === "kan_added"
  ) {
    return (
      getBaseTile(tile) ===
      currentTiles[0]
    );
  }

  /*
   * =========================
   * チー
   * =========================
   */
  if (
    meld.type === "chi"
  ) {

    if (
      currentTiles.length >=
      3
    ) {
      return false;
    }

    if (
      getSuit(tile) === "z"
    ) {
      return false;
    }

    for (
      const current of currentTiles
    ) {
      if (
        getSuit(current) !==
        getSuit(tile)
      ) {
        return false;
      }
    }

    if (
      currentTiles.length === 1
    ) {
      return canCompleteSequence(
        hand,
        settings,
        inputTarget,
        currentTiles,
        tile
      );
    }

    if (
      currentTiles.length === 2
    ) {
      return isSequence(
        currentTiles[0],
        currentTiles[1],
        tile
      );
    }
  }

  return false;
}

function TileSelector({
  hand,
  settings,
  inputTarget,
  onSelectTile,
}: Props) {
  return (
    <section>
      <h2>牌選択</h2>

      <div className="tile-groups">
        {[
          {
            name: "萬子",
            tiles: tiles.filter(
              (tile) =>
                getBaseTile(tile)[1] ===
                "m"
            ),
          },
          {
            name: "筒子",
            tiles: tiles.filter(
              (tile) =>
                getBaseTile(tile)[1] ===
                "p"
            ),
          },
          {
            name: "索子",
            tiles: tiles.filter(
              (tile) =>
                getBaseTile(tile)[1] ===
                "s"
            ),
          },
          {
            name: "風牌",
            tiles: tiles.filter(
              (tile) =>
                getBaseTile(tile)[1] ===
                  "z" &&
                getNumber(tile) <=
                  4
            ),
          },
          {
            name: "三元牌",
            tiles: tiles.filter(
              (tile) =>
                getBaseTile(tile)[1] ===
                  "z" &&
                getNumber(tile) >=
                  5
            ),
          },
        ].map((group) => (
          <div
            className="tile-group"
            key={group.name}
          >
            {group.tiles.map(
              (tile) => {
                const used =
                  getUsedCount(
                    hand,
                    settings,
                    tile,
                    inputTarget
                  );

                const meldSelectable =
                  canSelectForMeld(
                    hand,
                    settings,
                    inputTarget,
                    tile
                  );

                const disabled =
                  used >= 4 ||
                  !meldSelectable ||
                  (
                    inputTarget.type ===
                      "concealed" &&
                    hand.concealed.length >=
                      13 -
                        hand.melds.length *
                          3
                  ) ||
                  (
                    inputTarget.type ===
                      "meld" &&
                    (
                      hand.melds[
                        inputTarget.index
                      ]?.tiles
                        .length ?? 0
                    ) >=
                      getMeldLimit(
                        hand,
                        inputTarget
                      )
                  ) ||
                  (
                    inputTarget.type ===
                      "dora" &&
                    settings
                      .doraIndicators
                      .length >= 5
                  ) ||
                  (
                    inputTarget.type ===
                      "uraDora" &&
                    !settings.uraDoraIndicators.includes(
                      null
                    )
                  );

                return (
                  <button
                    className="tile-button"
                    key={tile}
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      onSelectTile(
                        tile
                      )
                    }
                    title={
                      disabled
                        ? "この牌は選択できません"
                        : tile
                    }
                  >
                    <img
                      src={
                        tileImages[
                          tile
                        ]
                      }
                      alt={tile}
                    />
                  </button>
                );
              }
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default TileSelector;
