import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./App.css";

import type {
  GameSettings,
  Hand,
  MeldType,
  ScoreOptions,
  Tile,
} from "./types/mahjong";

import {
  getBaseTile,
  compareTiles,
} from "./mahjong/tiles";

import HandInput from "./components/HandInput";
import TileSelector from "./components/TileSelector";
import Settings from "./components/Settings";
import DoraIndicators from "./components/DoraIndicators";
import ScoreTable from "./components/ScoreTable";

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

const initialSettings: GameSettings = {
  roundWind: "east",
  seatWind: "east",
  doubleWindFu: 2,
  kiriageMangan: false,
  riichi: false,
  doubleRiichi: false,
  doraIndicators: [],
  uraDoraIndicators: [],
};

const initialScoreOptions: ScoreOptions =
  {
    ippatsu: false,
    rinshan: false,
    haitei: false,
    houtei: false,
    chankan: false,
  };

/*
 * PC版と全く同じ比率のまま、画面幅に
 * 合わせて全体を縮小表示するための
 * 設計幅。.app の max-width と揃える。
 */
const DESIGN_WIDTH = 860;

/*
 * この幅以下はスマホ向けの専用レイアウト
 * （手牌・ドラ表示牌を全幅表示、牌選択を
 * 画面下部に固定）に切り替える。タブレット
 * 以上（横幅の余裕がある画面）は、狭くても
 * 引き続きPC版をそのまま縮小表示する
 * （DESIGN_WIDTH のスケール方式）。
 */
const MOBILE_QUERY =
  "(max-width: 600px)";

function App() {
  const leftColumnRef =
    useRef<HTMLDivElement>(
      null
    );

  const rightColumnRef =
    useRef<HTMLDivElement>(
      null
    );

  const scaleOuterRef =
    useRef<HTMLDivElement>(
      null
    );

  const scaleInnerRef =
    useRef<HTMLDivElement>(
      null
    );

  /*
   * 左カラム（手牌・ドラ表示牌）の高さに
   * 右カラム（牌選択）の高さを合わせる。
   *
   * offsetHeight は要素自身やその祖先に
   * 掛かっている transform: scale() の
   * 影響を受けないため、下の拡大縮小の
   * 仕組みと組み合わせても正しく機能する。
   *
   * スマホ向けレイアウト（縦積み＋牌選択が
   * 画面下部固定）では高さを合わせる意味が
   * 無いため、その場合は何もしない。
   */
  useEffect(() => {
    const leftEl =
      leftColumnRef.current;

    const rightEl =
      rightColumnRef.current;

    if (
      !leftEl ||
      !rightEl
    ) {
      return;
    }

    const mediaQuery =
      window.matchMedia(
        MOBILE_QUERY
      );

    const SECTION_GAP = 30;

    const syncHeight = () => {
      if (mediaQuery.matches) {
        if (
          rightEl.style
            .height !== ""
        ) {
          rightEl.style.height =
            "";
        }

        return;
      }

      const nextHeight =
        leftEl.offsetHeight -
        SECTION_GAP;

      const currentHeight =
        parseFloat(
          rightEl.style
            .height
        ) || 0;

      if (
        Math.abs(
          nextHeight -
            currentHeight
        ) < 0.5
      ) {
        return;
      }

      rightEl.style.height = `${nextHeight}px`;
    };

    syncHeight();

    const observer =
      new ResizeObserver(
        syncHeight
      );

    observer.observe(
      leftEl
    );

    mediaQuery.addEventListener(
      "change",
      syncHeight
    );

    return () => {
      observer.disconnect();

      mediaQuery.removeEventListener(
        "change",
        syncHeight
      );
    };
  }, []);

  /*
   * タブレット以上（MOBILE_QUERY に
   * 該当しない幅）では、PC版
   * （DESIGN_WIDTH）の幅で組んだ状態の
   * まま、画面がそれより狭い時だけ
   * transform: scale() で全体を縦横
   * 同じ比率で縮小する。
   *
   * スマホ幅（MOBILE_QUERY に該当）では
   * この拡大縮小は行わず、CSS側の
   * 専用レイアウト（.scale-inner の幅を
   * 100%に戻す等）にそのまま任せる。
   */
  useEffect(() => {
    const outerEl =
      scaleOuterRef.current;

    const innerEl =
      scaleInnerRef.current;

    if (
      !outerEl ||
      !innerEl
    ) {
      return;
    }

    const mediaQuery =
      window.matchMedia(
        MOBILE_QUERY
      );

    const applyScale = () => {
      if (mediaQuery.matches) {
        if (
          innerEl.style
            .transform !== ""
        ) {
          innerEl.style.transform =
            "";
        }

        if (
          outerEl.style
            .height !== ""
        ) {
          outerEl.style.height =
            "";
        }

        return;
      }

      const scale = Math.min(
        1,
        outerEl.clientWidth /
          DESIGN_WIDTH
      );

      const nextTransform = `scale(${scale})`;

      if (
        innerEl.style
          .transform !==
        nextTransform
      ) {
        innerEl.style.transform =
          nextTransform;
      }

      const nextHeight =
        innerEl.offsetHeight *
        scale;

      const currentHeight =
        parseFloat(
          outerEl.style
            .height
        ) || 0;

      if (
        Math.abs(
          nextHeight -
            currentHeight
        ) >= 0.5
      ) {
        outerEl.style.height = `${nextHeight}px`;
      }
    };

    applyScale();

    const observer =
      new ResizeObserver(
        applyScale
      );

    observer.observe(
      outerEl
    );

    observer.observe(
      innerEl
    );

    mediaQuery.addEventListener(
      "change",
      applyScale
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        applyScale
      );

      observer.disconnect();
    };
  }, []);

  const [hand, setHand] =
    useState<Hand>({
      concealed: [],
      melds: [],
    });

  const [
    inputTarget,
    setInputTarget,
  ] =
    useState<InputTarget>({
      type: "concealed",
    });

  const [
    settings,
    setSettings,
  ] =
    useState<GameSettings>(
      initialSettings
    );

  const [
    scoreOptions,
    setScoreOptions,
  ] =
    useState<ScoreOptions>(
      initialScoreOptions
    );

  const concealedLimit =
    useMemo(
      () =>
        13 -
        hand.melds.length *
          3,
      [hand.melds.length]
    );

  const getUsedCount = (
    tile: Tile,
    excludeMeldIndex?: number
  ) => {
    const base =
      getBaseTile(tile);

    let count = 0;

    for (const current of hand.concealed) {
      if (
        getBaseTile(
          current
        ) === base
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
        i ===
        excludeMeldIndex
      ) {
        continue;
      }

      for (const current of hand
        .melds[i].tiles) {
        if (
          getBaseTile(
            current
          ) === base
        ) {
          count++;
        }
      }
    }

    for (const indicator of settings.doraIndicators) {
      if (
        indicator &&
        getBaseTile(
          indicator
        ) === base
      ) {
        count++;
      }
    }

    for (const indicator of settings.uraDoraIndicators) {
      if (
        indicator &&
        getBaseTile(
          indicator
        ) === base
      ) {
        count++;
      }
    }

    return count;
  };

  const addTile = (
    tile: Tile
  ) => {
    if (
      inputTarget.type ===
      "concealed"
    ) {
      if (
        hand.concealed
          .length >=
        concealedLimit
      ) {
        return;
      }

      if (
        getUsedCount(
          tile
        ) >= 4
      ) {
        return;
      }

      setHand(
        (current) => ({
          ...current,
          concealed:
            [
              ...current.concealed,
              tile,
            ].sort(
              compareTiles
            ),
        })
      );

      return;
    }

    if (
      inputTarget.type ===
      "dora"
    ) {
      if (
        settings
          .doraIndicators
          .length >= 5
      ) {
        return;
      }

      if (
        getUsedCount(
          tile
        ) >= 4
      ) {
        return;
      }

      setSettings(
        (current) => {
          const riichiIsActive =
            current.riichi ||
            current.doubleRiichi;

          return {
            ...current,
            doraIndicators:
              [
                ...current.doraIndicators,
                tile,
              ],
            uraDoraIndicators:
              riichiIsActive
                ? [
                    ...current.uraDoraIndicators,
                    null,
                  ]
                : current.uraDoraIndicators,
          };
        }
      );

      return;
    }

    if (
      inputTarget.type ===
      "uraDora"
    ) {
      const emptyIndex =
        settings.uraDoraIndicators.findIndex(
          (t) => t === null
        );

      if (
        emptyIndex === -1
      ) {
        return;
      }

      if (
        getUsedCount(
          tile
        ) >= 4
      ) {
        return;
      }

      setSettings(
        (current) => {
          const nextUra =
            [
              ...current.uraDoraIndicators,
            ];

          nextUra[
            emptyIndex
          ] = tile;

          return {
            ...current,
            uraDoraIndicators:
              nextUra,
          };
        }
      );

      return;
    }

    const meldIndex =
      inputTarget.index;

    const meld =
      hand.melds[
        meldIndex
      ];

    if (!meld) {
      return;
    }

    const limit =
      meld.type ===
        "kan_open" ||
      meld.type ===
        "kan_closed" ||
      meld.type ===
        "kan_added"
        ? 4
        : 3;

    if (
      meld.tiles.length >=
      limit
    ) {
      return;
    }

    if (
      getUsedCount(
        tile,
        meldIndex
      ) >= 4
    ) {
      return;
    }

    setHand(
      (current) => {
        const nextMelds =
          [
            ...current.melds,
          ];

        const currentMeld =
          nextMelds[
            meldIndex
          ];

        if (!currentMeld) {
          return current;
        }

        nextMelds[
          meldIndex
        ] = {
          ...currentMeld,
          tiles: [
            ...currentMeld.tiles,
            tile,
          ].sort(
            compareTiles
          ),
        };

        return {
          ...current,
          melds:
            nextMelds,
        };
      }
    );
  };

  const removeConcealedTile =
    (index: number) => {
      setHand(
        (current) => ({
          ...current,
          concealed:
            current.concealed.filter(
              (
                _,
                i
              ) =>
                i !== index
            ),
        })
      );

      setInputTarget({
        type: "concealed",
      });
    };

  const removeMeldTile = (
    meldIndex: number,
    tileIndex: number
  ) => {
    setHand(
      (current) => {
        const nextMelds =
          [
            ...current.melds,
          ];

        const meld =
          nextMelds[
            meldIndex
          ];

        if (!meld) {
          return current;
        }

        nextMelds[
          meldIndex
        ] = {
          ...meld,
          tiles:
            meld.tiles.filter(
              (
                _,
                i
              ) =>
                i !==
                tileIndex
            ),
        };

        return {
          ...current,
          melds:
            nextMelds,
        };
      }
    );

    setInputTarget({
      type: "meld",
      index: meldIndex,
    });
  };

  const changeMeldType =
    (
      index: number,
      type: MeldType
    ) => {
      setHand(
        (current) => {
          const nextMelds =
            [
              ...current.melds,
            ];

          const meld =
            nextMelds[
              index
            ];

          if (!meld) {
            return current;
          }

          nextMelds[
            index
          ] = {
            ...meld,
            type,
            tiles: [],
          };

          return {
            ...current,
            melds:
              nextMelds,
          };
        }
      );

      /*
       * 暗槓以外の副露になった場合、立直・ダブル立直はOFF
       * 副露タイプ変更時は牌もリセットされるので、現在の副露タイプを確認
       */
      if (
        type !== "kan_closed"
      ) {
        setSettings(
          (current) => ({
            ...current,
            riichi: false,
            doubleRiichi:
              false,
            uraDoraIndicators:
              [],
          })
        );

        setScoreOptions(
          (current) => ({
            ...current,
            ippatsu: false,
          })
        );

        if (
          inputTarget.type ===
          "uraDora"
        ) {
          setInputTarget({
            type: "concealed",
          });
        }
      }
    };

  const addMeld = () => {
    if (
      hand.melds.length >=
      4
    ) {
      return;
    }

    const nextIndex =
      hand.melds.length;

    setHand(
      (current) => {
        const nextMelds =
          [
            ...current.melds,
            {
              type: "chi" as const,
              tiles: [],
            },
          ];

        const limit =
          13 -
          nextMelds.length *
            3;

        return {
          ...current,
          concealed:
            current.concealed.slice(
              0,
              limit
            ),
          melds:
            nextMelds,
        };
      }
    );

    setSettings(
      (current) => ({
        ...current,
        riichi: false,
        doubleRiichi:
          false,
        uraDoraIndicators:
          [],
      })
    );

    setScoreOptions(
      (current) => ({
        ...current,
        ippatsu: false,
      })
    );

    setInputTarget({
      type: "meld",
      index: nextIndex,
    });
  };

  const removeMeld = (
    index: number
  ) => {
    setHand(
      (current) => ({
        ...current,
        melds:
          current.melds.filter(
            (
              _,
              i
            ) =>
              i !== index
          ),
      })
    );

    if (
      inputTarget.type ===
      "meld"
    ) {
      if (
        inputTarget.index ===
        index
      ) {
        setInputTarget({
          type: "concealed",
        });
      } else if (
        inputTarget.index >
        index
      ) {
        setInputTarget({
          type: "meld",
          index:
            inputTarget.index -
            1,
        });
      }
    }
  };

  const removeDoraIndicator =
    (index: number) => {
      setSettings(
        (current) => ({
          ...current,
          doraIndicators:
            current.doraIndicators.filter(
              (
                _,
                i
              ) =>
                i !== index
            ),
          uraDoraIndicators:
            current.uraDoraIndicators.filter(
              (
                _,
                i
              ) =>
                i !== index
            ),
        })
      );

      setInputTarget({
        type: "dora",
      });
    };

  const removeUraDoraIndicator =
    (index: number) => {
      setSettings(
        (current) => {
          const nextUra =
            [
              ...current.uraDoraIndicators,
            ];

          nextUra[index] =
            null;

          return {
            ...current,
            uraDoraIndicators:
              nextUra,
          };
        }
      );

      setInputTarget({
        type: "uraDora",
      });
    };

  const clearDoraIndicators =
    () => {
      setSettings(
        (current) => ({
          ...current,
          doraIndicators: [],
          uraDoraIndicators:
            [],
        })
      );

      setInputTarget({
        type: "dora",
      });
    };

  const clearAll = () => {
    setHand({
      concealed: [],
      melds: [],
    });

    setInputTarget({
      type: "concealed",
    });
  };

  const setRiichiState = (
    state:
      | "off"
      | "riichi"
      | "double"
  ) => {
    if (
      !hand.melds.every(
        (meld) =>
          meld.type ===
          "kan_closed"
      ) &&
      state !== "off"
    ) {
      return;
    }

    setSettings(
      (current) => {
        const next =
          {
            ...current,
            riichi:
              state ===
              "riichi",
            doubleRiichi:
              state ===
              "double",
          };

        if (
          state ===
            "riichi" ||
          state ===
            "double"
        ) {
          next.uraDoraIndicators =
            next.doraIndicators.map(
              (
                _,
                index
              ) =>
                next
                  .uraDoraIndicators[
                  index
                ] ??
                null
            );
        } else {
          next.uraDoraIndicators =
            [];
        }

        return next;
      }
    );

    if (
      state === "off"
    ) {
      setScoreOptions(
        (current) => ({
          ...current,
          ippatsu: false,
        })
      );

      if (
        inputTarget.type ===
        "uraDora"
      ) {
        setInputTarget({
          type: "concealed",
        });
      }
    }

    /*
     * ダブル立直は1巡目の打牌でしか
     * 成立せず、一発は必然的に序盤の
     * 和了になる。海底摸月・河底撈魚は
     * 牌山最後の1枚での和了＝終盤なので、
     * ダブル立直に切り替えた時点で
     * 一発と両立していたら、
     * 海底摸月・河底撈魚の方を外す。
     */
    if (
      state === "double"
    ) {
      setScoreOptions(
        (current) =>
          current.ippatsu &&
          (current.haitei ||
            current.houtei)
            ? {
                ...current,
                haitei: false,
                houtei: false,
              }
            : current
      );
    }
  };

  return (
    <div
      className="scale-outer"
      ref={scaleOuterRef}
    >
      <div
        className="scale-inner"
        ref={scaleInnerRef}
      >
        <div className="app">
          <h1>
            麻雀点数計算
          </h1>

          <Settings
            settings={
              settings
            }
            onChange={
              setSettings
            }
          />
    
          <div className="app-columns">
            <div
              className="app-column-left"
              ref={leftColumnRef}
            >
              <HandInput
                hand={hand}
                concealedLimit={
                  concealedLimit
                }
                inputTarget={
                  inputTarget
                }
                onInputTargetChange={
                  setInputTarget
                }
                onRemoveConcealedTile={
                  removeConcealedTile
                }
                onRemoveMeldTile={
                  removeMeldTile
                }
                onChangeMeldType={
                  changeMeldType
                }
                onAddMeld={
                  addMeld
                }
                onRemoveMeld={
                  removeMeld
                }
                onClear={
                  clearAll
                }
              />
    
              <DoraIndicators
                settings={
                  settings
                }
                inputTarget={
                  inputTarget
                }
                onInputTargetChange={
                  setInputTarget
                }
                onRemoveDoraIndicator={
                  removeDoraIndicator
                }
                onRemoveUraDoraIndicator={
                  removeUraDoraIndicator
                }
                onClearDora={
                  clearDoraIndicators
                }
              />
            </div>
    
            <div
              className="app-column-right"
              ref={rightColumnRef}
            >
              <TileSelector
                hand={hand}
                settings={
                  settings
                }
                inputTarget={
                  inputTarget
                }
                onSelectTile={
                  addTile
                }
              />
            </div>
          </div>
    
          <ScoreTable
            hand={hand}
            settings={
              settings
            }
            scoreOptions={
              scoreOptions
            }
            onScoreOptionsChange={
              setScoreOptions
            }
            onRiichiChange={
              (checked) =>
                setRiichiState(
                  checked
                    ? "riichi"
                    : "off"
                )
            }
            onDoubleRiichiChange={
              (checked) =>
                setRiichiState(
                  checked
                    ? "double"
                    : "off"
                )
            }
            canRiichi={
              hand.melds.every(
                (meld) =>
                  meld.type ===
                  "kan_closed"
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

export default App;
