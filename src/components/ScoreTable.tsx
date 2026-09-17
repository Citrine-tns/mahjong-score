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

/*
 * 点数・翻符数・役名の3種類の表を
 * セグメントコントロールで切り替える。
 */
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

/*
 * 無効な点数セルに入れる斜線。
 *
 * セルの角から角へ、表の罫線と
 * 同じ太さ・色の直線を引く。
 * セルの縦横比に依らず正しく角へ
 * 届くよう、viewBox を引き伸ばして
 * 描画する（vectorEffect で線幅だけ
 * 一定に保つ）。
 *
 * th（見出し）には適用せず、
 * tbody の点数セルだけに適用する。
 */
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

  /*
   * ツモ・ロンの有効/無効。
   *
   * 海底摸月：ツモのみ成立
   * 河底撈魚：ロンのみ成立
   * 嶺上開花：ツモのみ成立
   * 槍槓：ロンのみ成立
   *
   * したがって、
   * ・海底摸月 → ロン無効
   * ・河底撈魚 → ツモ無効
   * ・嶺上開花 → ロン無効
   * ・槍槓 → ツモ無効
   */
  const ronDisabled =
    scoreOptions.haitei ||
    scoreOptions.rinshan;

  const tsumoDisabled =
    scoreOptions.houtei ||
    scoreOptions.chankan;

  /*
   * 待ちごとに、ロン・ツモそれぞれで
   * 最も点数が高くなる和了形を選び、
   * 1行分のデータにまとめる。
   */
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

          /*
           * ロンとツモでは役が異なる場合があるため、
           * それぞれで最も高い和了形を選ぶ。
           */
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

          /*
           * 役が1つ以上あるか。
           *
           * ドラ・裏ドラだけでは
           * yaku.length は増えないため、
           * 無役として扱う。
           */
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

  /*
   * 確定役：どの待ち・どちらの和了方でも
   * 必ず付く役（役名表でのみ表示する）。
   *
   * 片方の和了方が海底・河底などで
   * そもそも成立しない場合は、その和了方は
   * 判定に含めない。
   */
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

  /*
   * 役名表のセルに表示する役名。
   *
   * 確定役はすでに表の外側で
   * まとめて表示しているため、
   * ここでは重複しないように除く。
   */
  /*
   * 翻符表のセルに表示する中身。
   *
   * 満貫以上になる場合は、点数区分の名称
   * （満貫・跳満・倍満・三倍満・役満・数え役満）を
   * 「◯翻◯符」とは改行して分けて表示する。
   */
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

  /*
   * 役名の一覧を表示する。
   *
   * 役名1つ1つの途中では改行させたくない
   * ため、役名単位で white-space: nowrap の
   * span に包む。役名同士の区切り（「、」）は
   * 通常のテキストのままにしておくことで、
   * 幅が足りない時はその区切りの位置で
   * 改行できるようにする。
   */
  function renderYakuNames(
    names: string[]
  ) {
    return names.map(
      (name, index) => (
        <span key={name}>
          {index > 0 && "、"}
          <span
            style={{
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
        </span>
      )
    );
  }

  /*
   * ドラ・赤ドラ・裏ドラの内訳表示。
   *
   * アガリ牌自体がドラになることがあり
   * 待ちによって枚数が変わるため、
   * evaluateHand の結果（待ちごとに
   * 計算済み）からそのまま組み立てる。
   *
   * 役満が成立している場合、ドラは点数に
   * 影響しない（score.ts 側で han 計算に
   * 含めていない）ため、表示上も数えない。
   */
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

  /*
   * 「役」表内の1セル分の中身。
   *
   * 確定役以外の役名が無くても、ドラ・赤・裏の
   * 内訳があるならそれだけ表示する
   * （「なし」とドラ内訳が両方出て紛らわしく
   * ならないようにする）。
   * 役名もドラ内訳も無い場合だけ「なし」にする。
   */
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

    if (
      names.length === 0 &&
      doraText === ""
    ) {
      return "なし";
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
                <tr
                  style={{
                    height: 60,
                  }}
                >
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
                      style={{
                        height: 72,
                      }}
                    >
                      <td
                        style={{
                          height: 72,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <img
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
                          style={{
                            width: 48,
                            height: 60,
                          }}
                        />
                      </td>

                      <td
                        style={{
                          height: 72,
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
                        style={{
                          height: 72,
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
