import type {
  GameSettings,
  Hand,
  HandDecomposition,
  ScoreOptions,
  Yaku,
  Tile,
  WinMethod,
} from "../types/mahjong";

import {
  getBaseTile,
  tileNames,
} from "./tiles";

import {
  getNumber,
  getSuit,
  isHonor,
  isSimple,
  isTerminal,
  isTerminalOrHonor,
} from "./hand";

function isClosedHand(
  hand: Hand
): boolean {
  return hand.melds.every(
    (meld) =>
      meld.type ===
      "kan_closed"
  );
}

function isValueTile(
  tile: Tile,
  settings: GameSettings
): boolean {
  const base =
    getBaseTile(tile);

  if (
    ["5z", "6z", "7z"].includes(
      base
    )
  ) {
    return true;
  }

  if (
    base ===
    ({
      east: "1z",
      south: "2z",
      west: "3z",
      north: "4z",
    } as Record<
      string,
      string
    >)[settings.roundWind]
  ) {
    return true;
  }

  if (
    base ===
    ({
      east: "1z",
      south: "2z",
      west: "3z",
      north: "4z",
    } as Record<
      string,
      string
    >)[settings.seatWind]
  ) {
    return true;
  }

  return false;
}

function addYaku(
  yaku: Yaku[],
  name: string,
  han: number
) {
  yaku.push({
    name,
    han,
  });
}

function checkYakuhai(
  decomposition: HandDecomposition,
  settings: GameSettings,
  yaku: Yaku[]
) {
  for (const group of decomposition.groups) {
    if (
      group.type !==
        "triplet" &&
      group.type !==
        "quad"
    ) {
      continue;
    }

    if (group.tiles.length === 0) {
      continue;
    }

    const tile =
      getBaseTile(
        group.tiles[0]
      );

    if (
      ["5z", "6z", "7z"].includes(
        tile
      )
    ) {
      addYaku(
        yaku,
        `役牌：${tileNames[tile]}`,
        1
      );
    }

    const windMap: Record<
      string,
      string
    > = {
      east: "1z",
      south: "2z",
      west: "3z",
      north: "4z",
    };

    if (
      tile ===
      windMap[
        settings.roundWind
      ]
    ) {
      addYaku(
        yaku,
        `場風牌：${tileNames[tile]}`,
        1
      );
    }

    if (
      tile ===
      windMap[
        settings.seatWind
      ]
    ) {
      addYaku(
        yaku,
        `自風牌：${tileNames[tile]}`,
        1
      );
    }
  }
}

function checkTanyao(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  if (
    all.every(isSimple)
  ) {
    addYaku(
      yaku,
      "断么九",
      1
    );
  }
}

function checkToitoi(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  if (
    decomposition.groups.length ===
    4 &&
    decomposition.groups.every(
      (group) =>
        (
          group.type ===
            "triplet" ||
          group.type ===
            "quad"
        ) &&
        group.tiles.length > 0
    )
  ) {
    addYaku(
      yaku,
      "対々和",
      2
    );
  }
}

function checkSanankou(
  decomposition: HandDecomposition,
  winMethod: WinMethod,
  winningTile: Tile | undefined,
  yaku: Yaku[]
) {
  let count = 0;

  for (const group of decomposition.groups) {
    if (
      group.type !==
        "triplet" &&
      group.type !==
        "quad"
    ) {
      continue;
    }

    if (group.tiles.length === 0) {
      continue;
    }

    if (group.fixed) {
      if (!group.open) {
        count++;
      }

      continue;
    }

    if (
      winMethod === "ron" &&
      winningTile &&
      group.tiles.some(
        (tile) =>
          getBaseTile(tile) ===
          getBaseTile(
            winningTile
          )
      )
    ) {
      continue;
    }

    count++;
  }

  if (count >= 3) {
    addYaku(
      yaku,
      "三暗刻",
      2
    );
  }
}

function checkSanshoku(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const sequences =
    decomposition.groups.filter(
      (group) =>
        group.type ===
          "sequence" &&
        group.tiles.length > 0
    );

  for (
    let number = 1;
    number <= 7;
    number++
  ) {
    const suits =
      new Set(
        sequences
          .filter(
            (group) =>
              group.tiles.length > 0 &&
              getNumber(
                group.tiles[0]
              ) === number
          )
          .map((group) =>
            getSuit(
              group.tiles[0]
            )
          )
      );

    if (suits.size === 3) {
      addYaku(
        yaku,
        "三色同順",
        2
      );
      return;
    }
  }
}

/**
 * 三色同刻。
 *
 * 同じ数字の萬子・筒子・索子の
 * 刻子または槓子が1組ずつある場合。
 */
function checkSanshokuDoukou(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const triplets =
    decomposition.groups.filter(
      (group) =>
        (
          group.type ===
            "triplet" ||
          group.type ===
            "quad"
        ) &&
        group.tiles.length > 0
    );

  for (
    let number = 1;
    number <= 9;
    number++
  ) {
    const suits =
      new Set(
        triplets
          .filter(
            (group) =>
              getNumber(
                group.tiles[0]
              ) === number
          )
          .map((group) =>
            getSuit(
              group.tiles[0]
            )
          )
      );

    if (
      suits.has("m") &&
      suits.has("p") &&
      suits.has("s")
    ) {
      addYaku(
        yaku,
        "三色同刻",
        2
      );
      return;
    }
  }
}

function checkIttsu(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const sequences =
    decomposition.groups.filter(
      (group) =>
        group.type ===
          "sequence" &&
        group.tiles.length > 0
    );

  for (const suit of [
    "m",
    "p",
    "s",
  ]) {
    const starts = new Set(
      sequences
        .filter(
          (group) =>
            group.tiles.length > 0 &&
            getSuit(
              group.tiles[0]
            ) === suit
        )
        .map((group) =>
          getNumber(
            group.tiles[0]
          )
        )
    );

    if (
      starts.has(1) &&
      starts.has(4) &&
      starts.has(7)
    ) {
      addYaku(
        yaku,
        "一気通貫",
        decomposition.groups.some(
          (group) =>
            group.tiles.length > 0 &&
            group.open
        )
          ? 1
          : 2
      );

      return;
    }
  }
}

function checkIipeikou(
  decomposition: HandDecomposition,
  hand: Hand,
  yaku: Yaku[]
) {
  if (
    !isClosedHand(hand)
  ) {
    return;
  }

  const sequenceKeys =
    decomposition.groups
      .filter(
        (group) =>
          group.type ===
            "sequence" &&
          group.tiles.length > 0
      )
      .map(
        (group) =>
          getBaseTile(
            group.tiles[0]
          )
      );

  const counts: Record<
    string,
    number
  > = {};

  for (const key of sequenceKeys) {
    counts[key] =
      (counts[key] ?? 0) + 1;
  }

  let pairs = 0;

  for (const count of Object.values(
    counts
  )) {
    pairs += Math.floor(
      count / 2
    );
  }

  if (pairs >= 2) {
    addYaku(
      yaku,
      "二盃口",
      3
    );
  } else if (pairs >= 1) {
    addYaku(
      yaku,
      "一盃口",
      1
    );
  }
}

function checkChanta(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  let hasSequence = false;
  let valid = true;

  for (const group of decomposition.groups) {
    if (group.tiles.length === 0) {
      continue;
    }

    if (
      group.type ===
      "sequence"
    ) {
      hasSequence = true;

      const start =
        getNumber(
          group.tiles[0]
        );

      if (
        start !== 1 &&
        start !== 7
      ) {
        valid = false;
      }
    } else {
      if (
        !group.tiles.some(
          isTerminalOrHonor
        )
      ) {
        valid = false;
      }
    }
  }

  if (
    !decomposition.pair.some(
      isTerminalOrHonor
    )
  ) {
    valid = false;
  }

  if (
    !hasSequence ||
    !valid
  ) {
    return;
  }

  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  if (
    all.some(isHonor)
  ) {
    addYaku(
      yaku,
      "混全帯么九",
      decomposition.groups.some(
        (group) =>
          group.tiles.length > 0 &&
          group.open
      )
        ? 1
        : 2
    );
  } else {
    addYaku(
      yaku,
      "純全帯么九",
      decomposition.groups.some(
        (group) =>
          group.tiles.length > 0 &&
          group.open
      )
        ? 2
        : 3
    );
  }
}

/**
 * 混老頭。
 *
 * 手牌のすべてが么九牌・字牌であり、
 * かつ「端牌」と「字牌」の両方を含む場合。
 *
 * 通常形では対々和と、
 * 七対子では七対子と複合する。
 */
function checkHonroutou(
  decomposition: HandDecomposition,
  hand: Hand,
  winningTile: Tile | undefined,
  yaku: Yaku[]
) {
  let all: Tile[];

  if (
    decomposition.specialType ===
    "chiitoitsu"
  ) {
    all = [
      ...hand.concealed,
      ...(winningTile
        ? [winningTile]
        : []),
    ];
  } else {
    all = [
      ...decomposition.pair,
      ...decomposition.groups.flatMap(
        (group) =>
          group.tiles
      ),
    ];
  }

  if (
    all.length !== 14
  ) {
    return;
  }

  if (
    !all.every(
      isTerminalOrHonor
    )
  ) {
    return;
  }

  const hasTerminal =
    all.some(isTerminal);

  const hasHonor =
    all.some(isHonor);

  if (
    !hasTerminal ||
    !hasHonor
  ) {
    return;
  }

  addYaku(
    yaku,
    "混老頭",
    2
  );
}

function checkFlush(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  const suits = new Set(
    all
      .filter(
        (tile) =>
          !isHonor(tile)
      )
      .map(getSuit)
  );

  const hasHonor =
    all.some(isHonor);

  if (
    suits.size === 1 &&
    !hasHonor
  ) {
    const open =
      decomposition.groups.some(
        (group) =>
          group.tiles.length > 0 &&
          group.open
      );

    addYaku(
      yaku,
      "清一色",
      open ? 5 : 6
    );
  } else if (
    suits.size === 1 &&
    hasHonor
  ) {
    const open =
      decomposition.groups.some(
        (group) =>
          group.tiles.length > 0 &&
          group.open
      );

    addYaku(
      yaku,
      "混一色",
      open ? 2 : 3
    );
  }
}

function checkShousangen(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const dragonGroups =
    decomposition.groups.filter(
      (group) =>
        (
          group.type ===
            "triplet" ||
          group.type ===
            "quad"
        ) &&
        group.tiles.length > 0 &&
        ["5z", "6z", "7z"].includes(
          getBaseTile(
            group.tiles[0]
          )
        )
    );

  const dragonPair =
    decomposition.pair.length > 0 &&
    ["5z", "6z", "7z"].includes(
      getBaseTile(
        decomposition.pair[0]
      )
    );

  if (
    dragonGroups.length === 2 &&
    dragonPair
  ) {
    addYaku(
      yaku,
      "小三元",
      2
    );
  }
}

function checkSankantsu(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const count =
    decomposition.groups.filter(
      (group) =>
        group.type ===
          "quad" &&
        group.tiles.length > 0
    ).length;

  if (count >= 3) {
    addYaku(
      yaku,
      "三槓子",
      2
    );
  }
}

/**
 * 四槓子。
 *
 * 4組すべてが槓子の場合。
 */
function checkSuukantsu(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const count =
    decomposition.groups.filter(
      (group) =>
        group.type ===
          "quad" &&
        group.tiles.length > 0
    ).length;

  if (
    count === 4
  ) {
    addYaku(
      yaku,
      "四槓子",
      13
    );
  }
}

function checkRiichi(
  hand: Hand,
  settings: GameSettings,
  scoreOptions: ScoreOptions,
  yaku: Yaku[]
) {
  if (
    !isClosedHand(hand)
  ) {
    return;
  }

  if (
    settings.doubleRiichi
  ) {
    addYaku(
      yaku,
      "ダブル立直",
      2
    );
  } else if (
    settings.riichi
  ) {
    addYaku(
      yaku,
      "立直",
      1
    );
  }

  if (
    (settings.riichi ||
      settings.doubleRiichi) &&
    scoreOptions.ippatsu
  ) {
    addYaku(
      yaku,
      "一発",
      1
    );
  }
}

function checkSituationalYaku(
  hand: Hand,
  scoreOptions: ScoreOptions,
  winMethod: WinMethod,
  yaku: Yaku[]
) {
  if (
    winMethod === "tsumo" &&
    isClosedHand(hand)
  ) {
    addYaku(
      yaku,
      "門前清自摸和",
      1
    );
  }

  if (
    scoreOptions.rinshan &&
    winMethod === "tsumo"
  ) {
    addYaku(
      yaku,
      "嶺上開花",
      1
    );
  }

  if (
    scoreOptions.haitei &&
    winMethod === "tsumo"
  ) {
    addYaku(
      yaku,
      "海底摸月",
      1
    );
  }

  if (
    scoreOptions.houtei &&
    winMethod === "ron"
  ) {
    addYaku(
      yaku,
      "河底撈魚",
      1
    );
  }

  if (
    scoreOptions.chankan &&
    winMethod === "ron"
  ) {
    addYaku(
      yaku,
      "槍槓",
      1
    );
  }
}

function checkPinfu(
  decomposition: HandDecomposition,
  hand: Hand,
  settings: GameSettings,
  winningTile: Tile | undefined,
  yaku: Yaku[]
) {
  if (
    !isClosedHand(hand) ||
    !winningTile
  ) {
    return;
  }

  if (
    decomposition.groups.some(
      (group) =>
        group.tiles.length === 0 ||
        group.type !==
        "sequence"
    )
  ) {
    return;
  }

  if (
    decomposition.pair.length ===
      0 ||
    isValueTile(
      decomposition.pair[0],
      settings
    )
  ) {
    return;
  }

  /*
   * 和了牌と同じ数字の牌が複数の面子に
   * またがって存在する場合（例：
   * 1234566789m の 3m 待ちでは、123m
   * にも 345m にも 3m が含まれる）、
   * 同じ牌は区別がつかないため
   * どちらが和了牌かは一意に決まらない。
   *
   * その場合、どちらの解釈も面子の
   * 分割自体は変えないため物理的に
   * 矛盾なく成立する。したがって
   * 候補をすべて列挙し、いずれかが
   * 両面待ちとして成立するなら
   * （最も得な解釈を採用するという
   * 麻雀の一般的なルールに従い）
   * 平和とする。
   */
  const winningGroups =
    decomposition.groups.filter(
      (group) =>
        group.type ===
          "sequence" &&
        group.tiles.length > 0 &&
        group.tiles.some(
          (tile) =>
            getBaseTile(tile) ===
            getBaseTile(
              winningTile
            )
        )
    );

  if (
    winningGroups.length === 0
  ) {
    return;
  }

  const hasRyanmenInterpretation =
    winningGroups.some(
      (winningGroup) => {
        const start =
          getNumber(
            winningGroup
              .tiles[0]
          );

        const winNumber =
          getNumber(
            winningTile
          );

        const index =
          winNumber - start;

        /*
         * 真ん中待ち。
         */
        if (index === 1) {
          return false;
        }

        /*
         * 123 + 3
         * 789 + 7
         * は辺張待ち。
         */
        if (
          (start === 1 &&
            index === 2) ||
          (start === 7 &&
            index === 0)
        ) {
          return false;
        }

        return true;
      }
    );

  if (!hasRyanmenInterpretation) {
    return;
  }

  addYaku(
    yaku,
    "平和",
    1
  );
}

function checkDaisangen(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const count =
    decomposition.groups.filter(
      (group) =>
        (
          group.type ===
            "triplet" ||
          group.type ===
            "quad"
        ) &&
        group.tiles.length > 0 &&
        ["5z", "6z", "7z"].includes(
          getBaseTile(
            group.tiles[0]
          )
        )
    ).length;

  if (count === 3) {
    addYaku(
      yaku,
      "大三元",
      13
    );
  }
}

function checkSuuankou(
  decomposition: HandDecomposition,
  hand: Hand,
  winMethod: WinMethod,
  winningTile: Tile | undefined,
  yaku: Yaku[]
) {
  if (
    !isClosedHand(hand)
  ) {
    return;
  }

  let count = 0;

  for (const group of decomposition.groups) {
    if (
      group.type !==
        "triplet" &&
      group.type !==
        "quad"
    ) {
      continue;
    }

    if (group.tiles.length === 0) {
      continue;
    }

    if (
      winMethod === "ron" &&
      winningTile &&
      group.tiles.some(
        (tile) =>
          getBaseTile(tile) ===
          getBaseTile(
            winningTile
          )
      )
    ) {
      continue;
    }

    count++;
  }

  if (count === 4) {
    addYaku(
      yaku,
      "四暗刻",
      13
    );
  }
}

function checkTsuuiisou(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  if (
    all.every(isHonor)
  ) {
    addYaku(
      yaku,
      "字一色",
      13
    );
  }
}

function checkChinroutou(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  if (
    all.every(isTerminal)
  ) {
    addYaku(
      yaku,
      "清老頭",
      13
    );
  }
}

function checkRyuuiisou(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const allowed = new Set([
    "2s",
    "3s",
    "4s",
    "6s",
    "8s",
    "6z",
  ]);

  const all = [
    ...decomposition.pair,
    ...decomposition.groups.flatMap(
      (group) =>
        group.tiles
    ),
  ];

  if (
    all.every(
      (tile) =>
        allowed.has(
          getBaseTile(tile)
        )
    )
  ) {
    addYaku(
      yaku,
      "緑一色",
      13
    );
  }
}

function checkShousuushi(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  const windGroups =
    decomposition.groups.filter(
      (group) =>
        (
          group.type ===
            "triplet" ||
          group.type ===
            "quad"
        ) &&
        group.tiles.length > 0 &&
        ["1z", "2z", "3z", "4z"].includes(
          getBaseTile(
            group.tiles[0]
          )
        )
    );

  const windPair =
    decomposition.pair.length > 0 &&
    ["1z", "2z", "3z", "4z"].includes(
      getBaseTile(
        decomposition.pair[0]
      )
    );

  if (
    windGroups.length === 3 &&
    windPair
  ) {
    addYaku(
      yaku,
      "小四喜",
      13
    );
  }

  if (
    windGroups.length === 4
  ) {
    addYaku(
      yaku,
      "大四喜",
      13
    );
  }
}

/**
 * 九蓮宝燈。
 *
 * 門前限定。
 *
 * 同一色で
 * 1112345678999
 * を基本形とし、
 * 同じ色の任意の1枚を加えた14枚。
 */
function checkChuurenPoutou(
  hand: Hand,
  winningTile: Tile | undefined,
  yaku: Yaku[]
) {
  if (
    !isClosedHand(hand) ||
    hand.melds.length > 0
  ) {
    return;
  }

  const all = [
    ...hand.concealed,
    ...(winningTile
      ? [winningTile]
      : []),
  ];

  if (
    all.length !== 14
  ) {
    return;
  }

  const suitTiles =
    all.filter(
      (tile) =>
        !isHonor(tile)
    );

  if (
    suitTiles.length !== 14
  ) {
    return;
  }

  const suits =
    new Set(
      suitTiles.map(getSuit)
    );

  if (
    suits.size !== 1
  ) {
    return;
  }

  const suit =
    getSuit(suitTiles[0]);

  if (
    suit !== "m" &&
    suit !== "p" &&
    suit !== "s"
  ) {
    return;
  }

  const counts: Record<
    number,
    number
  > = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };

  for (const tile of suitTiles) {
    const number =
      getNumber(tile);

    if (
      number < 1 ||
      number > 9
    ) {
      return;
    }

    counts[number]++;
  }

  if (
    counts[1] < 3 ||
    counts[9] < 3
  ) {
    return;
  }

  for (
    let number = 2;
    number <= 8;
    number++
  ) {
    if (
      counts[number] < 1
    ) {
      return;
    }
  }

  addYaku(
    yaku,
    "九蓮宝燈",
    13
  );
}

function checkSpecial(
  decomposition: HandDecomposition,
  yaku: Yaku[]
) {
  if (
    decomposition.specialType ===
    "chiitoitsu"
  ) {
    addYaku(
      yaku,
      "七対子",
      2
    );
  }

  if (
    decomposition.specialType ===
    "kokushi"
  ) {
    addYaku(
      yaku,
      "国士無双",
      13
    );
  }
}

/**
 * 役満（複合役満を含む）が1つでも
 * 含まれているか。
 *
 * ScoreTable 側の集計でも、ある待ちの
 * 役が役満によって上書きされているかを
 * 判定するために使う。
 */
export function hasYakuman(
  yaku: Yaku[]
): boolean {
  return yaku.some(
    (y) => y.han >= 13
  );
}

/**
 * 役満（複合役満を含む）が1つでもあれば、
 * それ以外の役は無視する。
 *
 * 四暗刻は対々和・三暗刻を、九蓮宝燈は
 * 清一色を、大四喜は小四喜を、といった
 * ように下位互換の役を含んでしまう場合や、
 * 一気通貫のように役満の手牌でもたまたま
 * 満たしてしまう役があるため、役満成立時は
 * それらを加算しないようにする。
 *
 * 役満どうしは複合しうる（大三元＋字一色 →
 * 二倍役満、など）ため、13翻以上の役は
 * すべて残す。
 */
function applyYakumanPriority(
  yaku: Yaku[]
): Yaku[] {
  const yakumanYaku = yaku.filter(
    (y) => y.han >= 13
  );

  return hasYakuman(yaku)
    ? yakumanYaku
    : yaku;
}

export function getYaku(
  hand: Hand,
  decomposition: HandDecomposition,
  settings: GameSettings,
  scoreOptions: ScoreOptions,
  winMethod: WinMethod,
  winningTile?: Tile
): Yaku[] {
  const yaku: Yaku[] = [];

  checkSpecial(
    decomposition,
    yaku
  );

  checkRiichi(
    hand,
    settings,
    scoreOptions,
    yaku
  );

  checkSituationalYaku(
    hand,
    scoreOptions,
    winMethod,
    yaku
  );

  /*
   * 混老頭は通常形だけでなく、
   * 七対子とも複合する。
   *
   * 国士無双には付けない。
   */
  if (
    decomposition.specialType ===
    "chiitoitsu"
  ) {
    checkHonroutou(
      decomposition,
      hand,
      winningTile,
      yaku
    );
  }

  /*
   * 九蓮宝燈は手牌そのものから判定する。
   */
  if (
    !decomposition.specialType
  ) {
    checkChuurenPoutou(
      hand,
      winningTile,
      yaku
    );
  }

  if (
    decomposition.specialType
  ) {
    return applyYakumanPriority(
      yaku
    );
  }

  checkTanyao(
    decomposition,
    yaku
  );

  checkYakuhai(
    decomposition,
    settings,
    yaku
  );

  checkPinfu(
    decomposition,
    hand,
    settings,
    winningTile,
    yaku
  );

  checkIipeikou(
    decomposition,
    hand,
    yaku
  );

  checkSanshoku(
    decomposition,
    yaku
  );

  checkSanshokuDoukou(
    decomposition,
    yaku
  );

  checkIttsu(
    decomposition,
    yaku
  );

  checkToitoi(
    decomposition,
    yaku
  );

  checkSanankou(
    decomposition,
    winMethod,
    winningTile,
    yaku
  );

  checkChanta(
    decomposition,
    yaku
  );

  checkHonroutou(
    decomposition,
    hand,
    winningTile,
    yaku
  );

  checkShousangen(
    decomposition,
    yaku
  );

  checkSankantsu(
    decomposition,
    yaku
  );

  checkSuukantsu(
    decomposition,
    yaku
  );

  checkFlush(
    decomposition,
    yaku
  );

  checkDaisangen(
    decomposition,
    yaku
  );

  checkSuuankou(
    decomposition,
    hand,
    winMethod,
    winningTile,
    yaku
  );

  checkTsuuiisou(
    decomposition,
    yaku
  );

  checkChinroutou(
    decomposition,
    yaku
  );

  checkRyuuiisou(
    decomposition,
    yaku
  );

  checkShousuushi(
    decomposition,
    yaku
  );

  return applyYakumanPriority(
    yaku
  );
}
