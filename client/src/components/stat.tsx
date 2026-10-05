import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip, Typography } from "antd";
import { ReactNode } from "react";

const { Text } = Typography;

/**
 * A single label/value pair used inside Card-based detail sections, so every card
 * across the app (filament show, material defaults, etc.) renders stats the same way.
 *
 * `tooltip` is for jargon a reader can't be expected to know on sight (Vicat, Izod, MFR,
 * Tg...) -- skip it for self-explanatory labels like "Density" or "Diameter".
 */
export function Stat({
  label,
  value,
  unit,
  tooltip,
}: {
  label: string;
  value?: ReactNode;
  unit?: string;
  tooltip?: string;
}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return (
    <div style={{ minWidth: 120 }}>
      <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
        {label}
        {tooltip ? (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 11, cursor: "help" }} />
          </Tooltip>
        ) : null}
      </Text>
      <Text strong style={{ fontSize: 16 }}>
        {value}
        {unit ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
    </div>
  );
}

export function TagList({ value }: { value?: string }) {
  if (!value) {
    return null;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => (
          <span
            key={v}
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 12,
            }}
          >
            {v}
          </span>
        ))}
    </div>
  );
}
