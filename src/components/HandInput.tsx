import type {
  Hand,
  MeldType,
} from "../types/mahjong";

import {
  tileImages,
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
  concealedLimit: number;
  inputTarget: InputTarget;
  onInputTargetChange: (
    target: InputTarget
  ) => void;
  onRemoveConcealedTile: (
    index: number
  ) => void;
  onRemoveMeldTile: (
    meldIndex: number,
    tileIndex: number
  ) => void;
  onChangeMeldType: (
    index: number,
    type: MeldType
  ) => void;
  onAddMeld: () => void;
  onRemoveMeld: (
    index: number
  ) => void;
  onClear: () => void;
};

const meldTypes: {
  value: MeldType;
  label: string;
}[] = [
  {
    value: "chi",
    label: "チー",
  },
  {
    value: "pon",
    label: "ポン",
  },
  {
    value: "kan_open",
    label: "明槓",
  },
  {
    value: "kan_closed",
    label: "暗槓",
  },
];

function getMeldTileLimit(
  type: MeldType
) {
  return type ===
    "kan_open" ||
    type === "kan_closed" ||
    type === "kan_added"
    ? 4
    : 3;
}

function HandInput({
  hand,
  concealedLimit,
  inputTarget,
  onInputTargetChange,
  onRemoveConcealedTile,
  onRemoveMeldTile,
  onChangeMeldType,
  onAddMeld,
  onRemoveMeld,
  onClear,
}: Props) {
  return (
    <section>
      <h2>手牌</h2>

      <div
        className={`hand ${
          inputTarget.type ===
          "concealed"
            ? "is-selected"
            : ""
        }`}
        onClick={() =>
          onInputTargetChange({
            type: "concealed",
          })
        }
      >
        {hand.concealed.map(
          (tile, index) => (
            <button
              className="tile"
              key={index}
              onClick={(e) => {
                e.stopPropagation();

                if (
                  inputTarget.type !==
                  "concealed"
                ) {
                  onInputTargetChange(
                    {
                      type: "concealed",
                    }
                  );

                  return;
                }

                onRemoveConcealedTile(
                  index
                );
              }}
              title="クリックして削除"
            >
              <img
                src={
                  tileImages[tile]
                }
                alt={tile}
              />
            </button>
          )
        )}
      </div>

      <p>
        {hand.concealed.length} /{" "}
        {concealedLimit} 枚
      </p>

      <div className="meld-section">
        <h2>副露</h2>

        <div className="meld-slot-controls">
          <button
            onClick={
              onAddMeld
            }
            disabled={
              hand.melds.length >=
              4
            }
          >
            副露を追加
          </button>

          <span>
            {hand.melds.length} / 4
          </span>
        </div>

        <div className="meld-list">
          {Array.from({
            length: 4,
          }).map(
            (_, meldIndex) => {
              const meld =
                hand.melds[
                  meldIndex
                ];

              if (!meld) {
                /*
                 * 実際の副露枠と全く同じ
                 * DOM構造にすることで、
                 * ブラウザ・フォントの
                 * 描画差で高さがズレない
                 * ようにする（固定pxで
                 * 高さを合わせない）。
                 */
                return (
                  <div
                    className="meld meld-placeholder"
                    key={
                      meldIndex
                    }
                  >
                    <div
                      className="meld-header"
                      style={{
                        visibility:
                          "hidden",
                      }}
                    >
                      <select
                        disabled
                      >
                        <option>
                          チー
                        </option>
                      </select>

                      <span>
                        0 / 3 枚
                      </span>

                      <button>
                        削除
                      </button>
                    </div>

                    <div
                      className="meld-tiles"
                      style={{
                        visibility:
                          "hidden",
                      }}
                    >
                      {Array.from(
                        {
                          length: 4,
                        }
                      ).map(
                        (
                          _,
                          index
                        ) => (
                          <div
                            className="meld-tile-placeholder"
                            key={
                              index
                            }
                          />
                        )
                      )}
                    </div>
                  </div>
                );
              }

              const selected =
                inputTarget.type ===
                  "meld" &&
                inputTarget.index ===
                  meldIndex;

              const limit =
                getMeldTileLimit(
                  meld.type
                );

              return (
                <div
                  className={`meld ${
                    selected
                      ? "is-selected"
                      : ""
                  }`}
                  key={meldIndex}
                  onClick={() =>
                    onInputTargetChange({
                      type: "meld",
                      index:
                        meldIndex,
                    })
                  }
                >
                  <div className="meld-header">
                    <select
                      value={
                        meld.type
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      onChange={(e) =>
                        onChangeMeldType(
                          meldIndex,
                          e.target
                            .value as MeldType
                        )
                      }
                    >
                      {meldTypes.map(
                        (
                          type
                        ) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <span>
                      {
                        meld.tiles
                          .length
                      } / {limit} 枚
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        onRemoveMeld(
                          meldIndex
                        );
                      }}
                    >
                      削除
                    </button>
                  </div>

                  <div className="meld-tiles">
                    {Array.from({
                      length:
                        limit,
                    }).map(
                      (_, index) => {
                        const tile =
                          meld.tiles[
                            index
                          ];

                        if (
                          !tile
                        ) {
                          return (
                            <div
                              className="meld-tile-placeholder"
                              key={
                                index
                              }
                            />
                          );
                        }

                        return (
                          <button
                            className="meld-tile"
                            key={
                              index
                            }
                            onClick={(
                              e
                            ) => {
                              e.stopPropagation();

                              if (
                                !selected
                              ) {
                                onInputTargetChange(
                                  {
                                    type: "meld",
                                    index:
                                      meldIndex,
                                  }
                                );

                                return;
                              }

                              onRemoveMeldTile(
                                meldIndex,
                                index
                              );
                            }}
                          >
                            <img
                              src={
                                tileImages[
                                  tile
                                ]
                              }
                              alt={
                                tile
                              }
                            />
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <button
          className="hand-clear"
          onClick={
            onClear
          }
        >
          クリア
        </button>
      </div>
    </section>
  );
}

export default HandInput;
