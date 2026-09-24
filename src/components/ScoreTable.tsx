import { useState } from "react";

import type {
  GameSettings,
  Hand,
  ScoreOptions,
  Tile,
} from "../types/mahjong";

import {
  tileImages,
  tileNames,
} from "../mahjong/tiles";

import {
  getHandDecompositions,
} from "../mahjong/agari";

import {
  evaluateHand,
  getLimitName,
} from "../mahjong/score";

import {
  hasYakuman,
} from "../mahjong/yaku";

import {
  getWaitTiles,
} from "../mahjong/waits";

type Props = {
  hand: Hand;
  settings: GameSettings;
  scoreOptions: ScoreOptions;
  onScoreOptionsChange: (
    options: ScoreOptions
  ) => void;
  onRiichiChange: (
    riichi: boolean
  ) => void;
  onDoubleRiichiChange: (
    doubleRiichi: boolean
  ) => void;
  canRiichi: boolean;
};

type EvaluatedHand =
  ReturnType<
    typeof evaluateHand
  >;

type WaitRow = {
  tile: Tile;
  ron: EvaluatedHand;
  tsumo: EvaluatedHand;
  ronHasYaku: boolean;
  tsumoHasYaku: boolean;
  tsumoText: string;
};

type TableMode =
  | "score"
  | "hanFu"
  | "yaku";

const TABLE_MODE_OPTIONS: {
  value: TableMode;
  label: string;
}[] = [
  {
    value: "score",
    label: "点数",
  },
  {
    value: "hanFu",
    label: "翻符",
  },
  {
    value: "yaku",
    label: "役",
  },
];

function toYakuNameSet(
  yaku: { name: string }[]
): Set<string> {
  return new Set(
    yaku.map((y) => y.name)
  );
}

function intersectSets(
  sets: Set<string>[]
): Set<string> {
  if (sets.length === 0) {
    return new Set();
  }

  return sets.reduce(
    (acc, set) =>
      new Set(
        [...acc].filter((name) =>
          set.has(name)
        )
      )
  );
}

function DisabledCellDiagonal() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line
        x1="100"
        y1="0"
        x2="0"
        y2="100"
        stroke="#ccc"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ScoreTable({
  hand,
  settings,
  scoreOptions,
  onScoreOptionsChange,
  onRiichiChange,
  onDoubleRiichiChange,
  canRiichi,
}: Props) {
  const [tableMode, setTableMode] =
    useState<TableMode>("score");

  const waits =
    getWaitTiles(hand);

  const riichiActive =
    settings.riichi ||
    settings.doubleRiichi;

  const ronDisabled =
    scoreOptions.haitei ||
    scoreOptions.rinshan;

  const tsumoDisabled =
    scoreOptions.houtei ||
    scoreOptions.chankan;

  const rows: WaitRow[] =
    waits
      .map(
        (tile): WaitRow | null => {
          const decompositions =
            getHandDecompositions(
              hand,
              tile
            );

          const evaluations =
            decompositions.map(
              (decomposition) => ({
                ron: evaluateHand(
                  hand,
                  decomposition,
                  settings,
                  scoreOptions,
                  "ron",
                  tile
                ),
                tsumo: evaluateHand(
                  hand,
                  decomposition,
                  settings,
                  scoreOptions,
                  "tsumo",
                  tile
                ),
              })
            );

          if (
            evaluations.length ===
            0
          ) {
            return null;
          }

          const ron =
            evaluations.reduce(
              (current, next) =>
                next.ron.score
                  .ron >
                current.ron
                  .score.ron
                  ? next
                  : current
            ).ron;

          const tsumo =
            evaluations.reduce(
              (current, next) => {
                const currentScore =
                  current.tsumo
                    .score
                    .tsumoDealer ??
                  0;

                const nextScore =
                  next.tsumo
                    .score
                    .tsumoDealer ??
                  0;

                return nextScore >
                  currentScore
                  ? next
                  : current;
              }
            ).tsumo;

          const ronHasYaku =
            ron.yaku.length > 0;

          const tsumoHasYaku =
            tsumo.yaku.length >
            0;

          const tsumoDealer =
            tsumo.score
              .tsumoDealer ?? 0;

          const tsumoNonDealer =
            tsumo.score
              .tsumoNonDealer ??
            0;

          const tsumoText =
            settings.seatWind ===
            "east"
              ? `${tsumoDealer * 3}点\n（${tsumoDealer}オール）`
              : `${tsumoDealer + tsumoNonDealer * 2}点\n（${tsumoNonDealer} / ${tsumoDealer}）`;

          return {
            tile,
            ron,
            tsumo,
            ronHasYaku,
            tsumoHasYaku,
            tsumoText,
          };
        }
      )
      .filter(
        (row): row is WaitRow =>
          row !== null
      );

  const guaranteedYaku =
    intersectSets(
      rows.flatMap((row) =>
        [
          ronDisabled
            ? null
            : row.ron,
          tsumoDisabled
            ? null
            : row.tsumo,
        ]
          .filter(
            (
              evaluated
            ): evaluated is EvaluatedHand =>
              evaluated !== null
          )
          .map((evaluated) =>
            toYakuNameSet(
              evaluated.yaku
            )
          )
      )
    );

  function renderRowHanFu(
    evaluated: EvaluatedHand
  ) {
    const limitName =
      getLimitName(
        evaluated.han,
        evaluated.fu,
        settings.kiriageMangan,
        hasYakuman(
          evaluated.yaku
        )
      );

    const hanFuText = `${evaluated.han}翻${evaluated.fu}符`;

    if (!limitName) {
      return hanFuText;
    }

    return (
      <>
        <span
          style={{
            whiteSpace: "nowrap",
            fontWeight: "bold",
          }}
        >
          {limitName}
        </span>

        <br />

        <span
          style={{
            whiteSpace: "nowrap",
          }}
        >
          {hanFuText}
        </span>
      </>
    );
  }

  function getRowYakuNames(
    yaku: { name: string }[]
  ): string[] {
    return yaku
      .map((y) => y.name)
      .filter(
        (name) =>
          !guaranteedYaku.has(
            name
          )
      );
  }

  function renderYakuNames(
    names: string[]
  ) {
    /*
     * 区切りの「、」は次の役名の前ではなく
     * 前の役名の末尾に含める。
     * 「、」を次の役名の前（別ノード）に
     * 置くと、折り返しが起きた時に「、」が
     * 行頭に来てしまい（禁則処理違反で
     * 見た目が気持ち悪い）、行末に来る
     * べき句読点が浮いてしまう。
     */
    return names.map(
      (name, index) => (
        <span
          key={name}
          style={{
            whiteSpace: "nowrap",
          }}
        >
          {name}
          {index <
            names.length - 1 &&
            "、"}
        </span>
      )
    );
  }

  function formatRowDoraBreakdown(
    evaluated: EvaluatedHand
  ): string {
    if (
      hasYakuman(evaluated.yaku)
    ) {
      return "";
    }

    const parts: string[] = [];

    if (
      evaluated.normalDoraHan >
      0
    ) {
      parts.push(
        `ドラ${evaluated.normalDoraHan}`
      );
    }

    if (
      evaluated.redDoraHan > 0
    ) {
      parts.push(
        `赤${evaluated.redDoraHan}`
      );
    }

    if (
      evaluated.uraDoraHan > 0
    ) {
      parts.push(
        `裏${evaluated.uraDoraHan}`
      );
    }

    return parts.join(" ");
  }

  function renderYakuCell(
    evaluated: EvaluatedHand
  ) {
    const names =
      getRowYakuNames(
        evaluated.yaku
      );

    const doraText =
      formatRowDoraBreakdown(
        evaluated
      );

    /*
     * この分岐に来る時点で
     * evaluated.yaku.length > 0
     * （無役なら呼び出し側の「無役」表示が
     * 先に処理される）。それでいて
     * names（確定役を除いた役名）が空
     * ということは、この待ちの役は
     * 確定役だけで構成されている
     * （待ちによらず変わらない）ということ。
     * 確定役は表の外側にまとめて出して
     * いるので、ここは空欄にする。
     */
    if (
      names.length === 0 &&
      doraText === ""
    ) {
      return "";
    }

    return (
      <>
        {renderYakuNames(names)}

        {names.length > 0 &&
          doraText !== "" && (
            <br />
          )}

        {doraText !== "" && (
          <span
            style={{
              whiteSpace: "nowrap",
            }}
          >
            {doraText}
          </span>
        )}
      </>
    );
  }

  return (
    <section>
      <h2>点数</h2>

      <div className="score-riichi">
        <label
          className={
            !canRiichi
              ? "is-disabled"
              : ""
          }
        >
          <span>立直</span>

          <input
            type="checkbox"
            checked={
              settings.riichi
            }
            disabled={
              !canRiichi
            }
            onChange={(e) =>
              onRiichiChange(
                e.target.checked
              )
            }
          />
        </label>

        <label
          className={
            !canRiichi
              ? "is-disabled"
              : ""
          }
        >
          <span>
            ダブル立直
          </span>

          <input
            type="checkbox"
            checked={
              settings.doubleRiichi
            }
            disabled={
              !canRiichi
            }
            onChange={(e) =>
              onDoubleRiichiChange(
                e.target.checked
              )
            }
          />
        </label>
      </div>

      <fieldset className="score-chance-yaku">
        <legend className="score-chance-yaku-title">
          偶発役
        </legend>

        <label
          className={`score-chance-yaku-item ${
            !riichiActive
              ? "is-disabled"
              : ""
          }`}
        >
          <span>
            一発
          </span>

          <input
            type="checkbox"
            checked={
              scoreOptions.ippatsu
            }
            disabled={
              !riichiActive
            }
            onChange={(e) => {
              const checked =
                e.target.checked;

              onScoreOptionsChange({
                ...scoreOptions,
                ippatsu:
                  checked,
                rinshan:
                  checked
                    ? false
                    : scoreOptions.rinshan,
                chankan:
                  checked
                    ? false
                    : scoreOptions.chankan,
              });
            }}
          />
        </label>

        <label className="score-chance-yaku-item">
          <span>
            海底摸月
          </span>

          <input
            type="checkbox"
            checked={
              scoreOptions.haitei
            }
            onChange={(e) => {
              const checked =
                e.target.checked;

              onScoreOptionsChange({
                ...scoreOptions,
                haitei:
                  checked,
                houtei:
                  checked
                    ? false
                    : scoreOptions.houtei,
                rinshan:
                  checked
                    ? false
                    : scoreOptions.rinshan,
                chankan:
                  checked
                    ? false
                    : scoreOptions.chankan,
              });
            }}
          />
        </label>

        <label className="score-chance-yaku-item">
          <span>
            河底撈魚
          </span>

          <input
            type="checkbox"
            checked={
              scoreOptions.houtei
            }
            onChange={(e) => {
              const checked =
                e.target.checked;

              onScoreOptionsChange({
                ...scoreOptions,
                houtei:
                  checked,
                haitei:
                  checked
                    ? false
                    : scoreOptions.haitei,
                rinshan:
                  checked
                    ? false
                    : scoreOptions.rinshan,
                chankan:
                  checked
                    ? false
                    : scoreOptions.chankan,
              });
            }}
          />
        </label>

        <label className="score-chance-yaku-item">
          <span>
            嶺上開花
          </span>

          <input
            type="checkbox"
            checked={
              scoreOptions.rinshan
            }
            onChange={(e) => {
              const checked =
                e.target.checked;

              onScoreOptionsChange({
                ...scoreOptions,
                rinshan:
                  checked,
                ippatsu:
                  checked
                    ? false
                    : scoreOptions.ippatsu,
                haitei:
                  checked
                    ? false
                    : scoreOptions.haitei,
                houtei:
                  checked
                    ? false
                    : scoreOptions.houtei,
                chankan:
                  checked
                    ? false
                    : scoreOptions.chankan,
              });
            }}
          />
        </label>

        <label className="score-chance-yaku-item">
          <span>
            搶槓
          </span>

          <input
            type="checkbox"
            checked={
              scoreOptions.chankan
            }
            onChange={(e) => {
              const checked =
                e.target.checked;

              onScoreOptionsChange({
                ...scoreOptions,
                chankan:
                  checked,
                ippatsu:
                  checked
                    ? false
                    : scoreOptions.ippatsu,
                haitei:
                  checked
                    ? false
                    : scoreOptions.haitei,
                houtei:
                  checked
                    ? false
                    : scoreOptions.houtei,
                rinshan:
                  checked
                    ? false
                    : scoreOptions.rinshan,
              });
            }}
          />
        </label>
      </fieldset>

      <div className="score-table">
          <div
            className="table-mode-switch"
            role="tablist"
          >
            <div
              className="table-mode-switch-thumb"
              style={{
                transform: `translateX(${
                  TABLE_MODE_OPTIONS.findIndex(
                    (option) =>
                      option.value ===
                      tableMode
                  ) * 100
                }%)`,
              }}
            />

            {TABLE_MODE_OPTIONS.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    tableMode ===
                    option.value
                  }
                  className={
                    tableMode ===
                    option.value
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setTableMode(
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}
          </div>

          {rows.length > 0 && (
            <p
              className="score-guaranteed-yaku"
              style={{
                visibility:
                  tableMode ===
                  "yaku"
                    ? "visible"
                    : "hidden",
              }}
            >
              <span className="score-guaranteed-yaku-label">
                確定役
              </span>
              {guaranteedYaku.size >
              0
                ? renderYakuNames(
                    [
                      ...guaranteedYaku,
                    ]
                  )
                : "なし"}
            </p>
          )}

          {rows.length ===
          0 ? (
            <p>
              今の手牌から待ちがありません
            </p>
          ) : (
            <table
              style={{
                tableLayout:
                  "fixed",
                width: "100%",
              }}
            >
              <colgroup>
                <col
                  style={{
                    width: "25%",
                  }}
                />

                <col
                  style={{
                    width: "37.5%",
                  }}
                />

                <col
                  style={{
                    width: "37.5%",
                  }}
                />
              </colgroup>

              <thead>
                <tr className="score-table-row-header">
                  <th
                    style={{
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    待ち
                  </th>

                  <th
                    style={{
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    ツモ
                  </th>

                  <th
                    style={{
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    ロン
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.tile
                      }
                      className="score-table-row"
                    >
                      <td className="score-table-cell score-table-cell-wait">
                        <img
                          className="score-table-wait-img"
                          src={
                            tileImages[
                              row
                                .tile
                            ]
                          }
                          alt={
                            tileNames[
                              row
                                .tile
                            ]
                          }
                        />
                      </td>

                      <td
                        className="score-table-cell"
                        style={{
                          whiteSpace:
                            tableMode ===
                            "yaku"
                              ? "normal"
                              : "pre-line",
                          position:
                            "relative",
                        }}
                      >
                        {tsumoDisabled && (
                          <DisabledCellDiagonal />
                        )}
                        {tsumoDisabled
                          ? ""
                          : !row.tsumoHasYaku
                          ? "無役"
                          : tableMode ===
                            "score"
                          ? row.tsumoText
                          : tableMode ===
                            "hanFu"
                          ? renderRowHanFu(
                              row.tsumo
                            )
                          : renderYakuCell(
                              row.tsumo
                            )}
                      </td>

                      <td
                        className="score-table-cell"
                        style={{
                          whiteSpace:
                            tableMode ===
                            "yaku"
                              ? "normal"
                              : "nowrap",
                          position:
                            "relative",
                        }}
                      >
                        {ronDisabled && (
                          <DisabledCellDiagonal />
                        )}
                        {ronDisabled
                          ? ""
                          : !row.ronHasYaku
                          ? "無役"
                          : tableMode ===
                            "score"
                          ? `${row.ron.score.ron}点`
                          : tableMode ===
                            "hanFu"
                          ? renderRowHanFu(
                              row.ron
                            )
                          : renderYakuCell(
                              row.ron
                            )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
      </div>
    </section>
  );
}

export default ScoreTable;
