import type {
  GameSettings,
} from "../types/mahjong";

import {
  tileImages,
  tileBackImage,
} from "../mahjong/tiles";

const MAX_DORA_INDICATORS = 5;

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
  settings: GameSettings;
  inputTarget: InputTarget;
  onInputTargetChange: (
    target: InputTarget
  ) => void;
  onRemoveDoraIndicator: (
    index: number
  ) => void;
  onRemoveUraDoraIndicator: (
    index: number
  ) => void;
  onClearDora: () => void;
};

function DoraIndicators({
  settings,
  inputTarget,
  onInputTargetChange,
  onRemoveDoraIndicator,
  onRemoveUraDoraIndicator,
  onClearDora,
}: Props) {
  const riichiActive =
    settings.riichi ||
    settings.doubleRiichi;

  const uraFilledCount =
    settings.uraDoraIndicators.filter(
      (tile) => tile !== null
    ).length;

  return (
    <section>
      <div className="indicator-panels">
        <div className="indicator-panel">
          <div className="indicator-panel-header">
            <h3>
              ドラ表示牌
            </h3>
          </div>

          <div
            className={`hand hand--dora ${
              inputTarget.type ===
              "dora"
                ? "is-selected"
                : ""
            }`}
            onClick={() =>
              onInputTargetChange({
                type: "dora",
              })
            }
          >
            {Array.from({
              length:
                MAX_DORA_INDICATORS,
            }).map((_, index) => {
              const tile =
                settings
                  .doraIndicators[
                  index
                ];

              if (!tile) {
                return (
                  <div
                    className="tile"
                    key={index}
                  >
                    <img
                      src={
                        tileBackImage
                      }
                      alt=""
                    />
                  </div>
                );
              }

              return (
                <button
                  className="tile"
                  key={index}
                  onClick={(
                    e
                  ) => {
                    e.stopPropagation();

                    if (
                      inputTarget.type !==
                      "dora"
                    ) {
                      onInputTargetChange(
                        {
                          type: "dora",
                        }
                      );

                      return;
                    }

                    onRemoveDoraIndicator(
                      index
                    );
                  }}
                  title="クリックして削除"
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
            })}
          </div>

          <p>
            {
              settings
                .doraIndicators
                .length
            }{" "}
            / {
              MAX_DORA_INDICATORS
            } 枚
          </p>
        </div>

        {riichiActive && (
          <div className="indicator-panel indicator-panel--ura">
            <div className="indicator-panel-header">
              <h3>
                裏ドラ表示牌
              </h3>
            </div>

            <div
              className={`hand hand--dora ${
                inputTarget.type ===
                "uraDora"
                  ? "is-selected"
                  : ""
              }`}
              onClick={() =>
                onInputTargetChange(
                  {
                    type: "uraDora",
                  }
                )
              }
            >
              {Array.from({
                length:
                  MAX_DORA_INDICATORS,
              }).map(
                (_, index) => {
                  const tile =
                    settings
                      .uraDoraIndicators[
                      index
                    ];

                  return tile ? (
                    <button
                      className="tile"
                      key={index}
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();

                        if (
                          inputTarget.type !==
                          "uraDora"
                        ) {
                          onInputTargetChange(
                            {
                              type: "uraDora",
                            }
                          );

                          return;
                        }

                        onRemoveUraDoraIndicator(
                          index
                        );
                      }}
                      title="クリックして削除"
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
                  ) : (
                    <div
                      className={`tile-placeholder ${
                        index >=
                        settings
                          .doraIndicators
                          .length
                          ? "tile-placeholder--hidden"
                          : ""
                      }`}
                      key={index}
                    />
                  );
                }
              )}
            </div>

            <p>
              {uraFilledCount}{" "}
              /{" "}
              {
                settings
                  .doraIndicators
                  .length
              }{" "}
              枚
            </p>
          </div>
        )}
      </div>

      <button
        className="hand-clear"
        onClick={onClearDora}
      >
        クリア
      </button>
    </section>
  );
}

export default DoraIndicators;
