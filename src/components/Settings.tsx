import type {
  GameSettings,
  RoundWind,
} from "../types/mahjong";

type Props = {
  settings: GameSettings;
  onChange: (
    settings: GameSettings
  ) => void;
};

const windOptions: {
  value: RoundWind;
  label: string;
}[] = [
  {
    value: "east",
    label: "東",
  },
  {
    value: "south",
    label: "南",
  },
  {
    value: "west",
    label: "西",
  },
  {
    value: "north",
    label: "北",
  },
];

function Settings({
  settings,
  onChange,
}: Props) {
  return (
    <section className="settings">
      <h2>設定</h2>

      <div className="setting-line setting-line--basic">
        <label className="setting-row">
          <span>場風</span>

          <select
            value={
              settings.roundWind
            }
            onChange={(e) =>
              onChange({
                ...settings,
                roundWind:
                  e.target
                    .value as RoundWind,
              })
            }
          >
            {windOptions.map(
              (wind) => (
                <option
                  key={
                    wind.value
                  }
                  value={
                    wind.value
                  }
                >
                  {wind.label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="setting-row">
          <span>自風</span>

          <select
            value={
              settings.seatWind
            }
            onChange={(e) =>
              onChange({
                ...settings,
                seatWind:
                  e.target
                    .value as RoundWind,
              })
            }
          >
            {windOptions.map(
              (wind) => (
                <option
                  key={
                    wind.value
                  }
                  value={
                    wind.value
                  }
                >
                  {wind.label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="setting-row">
          <span>連風牌の符</span>

          <select
            value={
              settings.doubleWindFu
            }
            onChange={(e) =>
              onChange({
                ...settings,
                doubleWindFu:
                  Number(
                    e.target.value
                  ) as 2 | 4,
              })
            }
          >
            <option value="2">
              2符
            </option>
            <option value="4">
              4符
            </option>
          </select>
        </label>

        <label className="setting-row">
          <span>
            切り上げ満貫
          </span>

          <input
            type="checkbox"
            checked={
              settings.kiriageMangan
            }
            onChange={(e) =>
              onChange({
                ...settings,
                kiriageMangan:
                  e.target
                    .checked,
              })
            }
          />
        </label>
      </div>
    </section>
  );
}

export default Settings;
