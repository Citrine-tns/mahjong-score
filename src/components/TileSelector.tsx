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

  /*
   * 手牌
   */
  for (const current of hand.concealed) {
    if (
      getBaseTile(current) ===
      base
    ) {
      count++;
    }
  }

  /*
   * 副露
   *
   * 現在入力対象になっている副露は
   * いったん除外する。
   */
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

  /*
   * ドラ表示牌
   */
  for (const indicator of settings.doraIndicators) {
    if (
      indicator &&
      getBaseTile(indicator) ===
        base
    ) {
      count++;
    }
  }

  /*
   * 裏ドラ表示牌
   */
  for (const indicator of settings.uraDoraIndicators) {
    if (
      indicator &&
      getBaseTile(indicator) ===
        base
    ) {
      count++;
    }
  }

  /*
   * 現在入力対象になっている副露の牌を
   * 使用枚数に戻す。
   */
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

/*
 * 3枚の牌が順子を構成しているか判定する。
 */
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

  /*
   * 字牌は順子にならない。
   */
  if (
    getSuit(base1) === "z" ||
    getSuit(base2) === "z" ||
    getSuit(base3) === "z"
  ) {
    return false;
  }

  /*
   * 萬・筒・索が同じでなければ不可。
   */
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

  /*
   * 同じ牌が2枚あれば順子ではない。
   */
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

/*
 * 指定した牌を含む、理論上の順子候補を取得する。
 *
 * 5p:
 *   3p 4p 5p
 *   4p 5p 6p
 *   5p 6p 7p
 *
 * 1p:
 *   1p 2p 3p
 *
 * 9p:
 *   7p 8p 9p
 */
function getSequenceCandidates(
  tile: Tile
): Tile[][] {
  const base =
    getBaseTile(tile);

  const suit =
    getSuit(base);

  const number =
    getNumber(base);

  /*
   * 字牌は順子を作れない。
   */
  if (
    suit === "z"
  ) {
    return [];
  }

  const candidates: Tile[][] =
    [];

  /*
   * 指定牌を含みうる順子の開始番号。
   *
   * 5なら3,4,5
   * 1なら1のみ
   * 9なら7のみ
   */
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

/*
 * 現在の副露牌と候補牌を含めて、
 * 完成可能な順子が1つでも存在するか判定する。
 *
 * 重要:
 *
 * 「候補牌を含む順子がある」
 * だけではなく、
 *
 * 「現在すでに選択されている牌も
 * その同じ順子に含まれている」
 *
 * 必要がある。
 *
 * これによって、
 *
 * 5p + 1p
 *
 * のような無関係な牌の組み合わせを
 * 許可しない。
 */
function canCompleteSequence(
  hand: Hand,
  settings: GameSettings,
  inputTarget: InputTarget,
  currentTiles: Tile[],
  candidate: Tile
): boolean {
  const candidateBase =
    getBaseTile(candidate);

  /*
   * 現在の牌と候補牌の牌種が違えば
   * 絶対に順子を作れない。
   */
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
    /*
     * 現在選択されている牌が
     * この順子にすべて含まれているか確認。
     *
     * ここが重要。
     *
     * 例えば
     *
     * current = 5p
     * candidate = 1p
     *
     * の場合、
     *
     * 1p 2p 3p
     *
     * には5pが含まれないので
     * この候補は不成立。
     */
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

    /*
     * 候補牌自身もその順子に
     * 含まれていることを確認。
     */
    const candidateIndex =
      sequenceRemaining.findIndex(
        (sequenceTile) =>
          getBaseTile(
            sequenceTile
          ) === candidateBase
      );

    /*
     * currentTiles で既に使われた牌を
     * 引いた結果、候補牌が順子に存在しない
     * 場合は不成立。
     */
    if (
      candidateIndex === -1
    ) {
      continue;
    }

    sequenceRemaining.splice(
      candidateIndex,
      1
    );

    /*
     * 残りの牌が実際に残っているか確認。
     */
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

/**
 * 副露に入れられる牌かを判定する。
 *
 * チー:
 *   0枚:
 *     字牌不可。
 *     その牌を含む順子が
 *     実際に完成可能な牌だけ。
 *
 *   1枚:
 *     現在の牌と候補牌を含む
 *     完成可能な順子があるものだけ。
 *
 *   2枚:
 *     3枚で実際に順子になるものだけ。
 *
 * ポン:
 *   0枚:
 *     残り2枚以上ある牌だけ。
 *
 *   1枚以上:
 *     現在の牌と同じ牌だけ。
 *
 * カン:
 *   0枚:
 *     4枚すべて残っている牌だけ。
 *
 *   1枚以上:
 *     現在の牌と同じ牌だけ。
 */
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

  /*
   * =========================
   * 1枚目
   * =========================
   */
  if (
    currentTiles.length === 0
  ) {
    /*
     * チー
     */
    if (
      meld.type === "chi"
    ) {
      /*
       * 字牌は1枚目から不可。
       */
      if (
        getSuit(tile) === "z"
      ) {
        return false;
      }

      /*
       * その牌を含む順子が
       * 実際に完成可能か確認する。
       *
       * 例:
       * 1m → 2m/3m が必要
       * 5p → 3p/4p/6p/7p が必要
       * 9s → 7s/8s が必要
       */
      return canCompleteSequence(
        hand,
        settings,
        inputTarget,
        [],
        tile
      );
    }

    /*
     * ポン
     *
     * 1枚目を選ぶ時点で、
     * 残り2枚以上必要。
     */
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

    /*
     * カン
     *
     * 1枚目を選ぶ時点で
     * 4枚すべて残っている必要がある。
     */
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
    /*
     * 3枚入っていたらこれ以上不可。
     */
    if (
      currentTiles.length >=
      3
    ) {
      return false;
    }

    /*
     * 字牌は不可。
     */
    if (
      getSuit(tile) === "z"
    ) {
      return false;
    }

    /*
     * 現在の牌と候補牌の
     * 萬・筒・索が違えば不可。
     */
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

    /*
     * 2枚目:
     *
     * 現在の1枚 + 候補1枚で
     * 完成可能な順子が存在するか確認。
     */
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

    /*
     * 3枚目:
     *
     * 3枚が実際に順子ならOK。
     */
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
