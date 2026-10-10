import { SettingOutlined } from "@ant-design/icons";
import { useInvalidate, useNavigation } from "@refinedev/core";
import { axiosInstance } from "@refinedev/simple-rest";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Card, Empty, Select, Typography } from "antd";
import { useMemo, useState } from "react";
import { getAPIURL } from "../../utils/url";
import { ISpool } from "../spools/model";
import { IPrinter } from "./model";

const { Text } = Typography;

async function fetchLocations(): Promise<string[]> {
  const response = await fetch(`${getAPIURL()}/location`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.status}`);
  }
  return response.json();
}

async function fetchSpoolsAt(location: string): Promise<ISpool[]> {
  const response = await fetch(`${getAPIURL()}/spool?location=${encodeURIComponent(location)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch spools: ${response.status}`);
  }
  const spools: ISpool[] = await response.json();
  // The API filter is a partial match; keep only the exact location.
  return spools.filter((s) => s.location === location);
}

function parseOrder(raw?: string): number[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Saved order first (dropping spools no longer there), then any new spools in the location. */
function applyOrder(spools: ISpool[], order: number[]): ISpool[] {
  const byId = new Map(spools.map((s) => [s.id, s]));
  const ordered = order.map((id) => byId.get(id)).filter((s): s is ISpool => Boolean(s));
  const seen = new Set(ordered.map((s) => s.id));
  return [...ordered, ...spools.filter((s) => !seen.has(s.id))];
}

function textColorFor(hex?: string): string {
  if (!hex || hex.length < 6) {
    return "#fff";
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#000" : "#fff";
}

export function PrinterAmsSection({ printer }: { printer?: IPrinter }) {
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const { show } = useNavigation();
  const [editing, setEditing] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);

  const location = printer?.ams_location;

  const { data: locations } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations, enabled: editing });
  const { data: spools } = useQuery({
    queryKey: ["printer-ams-spools", location],
    queryFn: () => fetchSpoolsAt(location as string),
    enabled: Boolean(location),
  });

  const slots = useMemo(
    () => applyOrder(spools ?? [], localOrder ?? parseOrder(printer?.ams_slot_order)),
    [spools, localOrder, printer?.ams_slot_order],
  );

  const save = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      await axiosInstance.patch(`${getAPIURL()}/printer/${printer?.id}`, data);
    },
    onSuccess: () => invalidate({ resource: "printer", invalidates: ["detail"], id: printer?.id }),
    onError: (error: { response?: { data?: { detail?: string } }; message?: string }) => {
      message.error(`No se pudo guardar el AMS: ${error?.response?.data?.detail ?? error?.message}`);
    },
  });

  if (!printer) {
    return null;
  }

  const drop = (to: number) => {
    if (dragFrom === null || dragFrom === to) {
      return;
    }
    const next = [...slots];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(to, 0, moved);
    const ids = next.map((s) => s.id);
    setLocalOrder(ids);
    save.mutate({ ams_slot_order: JSON.stringify(ids) });
    setDragFrom(null);
  };

  return (
    <Card
      size="small"
      title="AMS"
      extra={
        <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setEditing((v) => !v)}>
          Ubicación
        </Button>
      }
    >
      {editing && (
        <div style={{ marginBottom: 12 }}>
          <Select
            allowClear
            showSearch
            style={{ width: "100%" }}
            placeholder="Elegí la ubicación que funciona como AMS"
            value={location}
            options={(locations ?? []).map((l) => ({ label: l, value: l }))}
            onChange={(v) => {
              setLocalOrder(null);
              save.mutate({ ams_location: v ?? null, ams_slot_order: null });
            }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Reordenar slots no cambia la ubicación de las bobinas.
          </Text>
        </div>
      )}

      {!location ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin ubicación AMS asignada" style={{ margin: "8px 0" }} />
      ) : slots.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No hay bobinas en "${location}"`} style={{ margin: "8px 0" }} />
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            {location} · arrastrá una bobina sobre otra para reordenar · clic para ver el filamento
          </Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
            {slots.map((spool, index) => {
              const hex = spool.filament.color_hex;
              const fg = textColorFor(hex);
              return (
                <div key={spool.id} style={{ textAlign: "center" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    A{index + 1}
                  </Text>
                  <div
                    draggable
                    onDragStart={() => setDragFrom(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(index)}
                    onDragEnd={() => setDragFrom(null)}
                    onClick={() => show("filament", spool.filament.id)}
                    title="Ver detalle del filamento"
                    style={{
                      cursor: "grab",
                      background: hex ? `#${hex}` : "#888",
                      color: fg,
                      borderRadius: 8,
                      padding: "14px 6px",
                      border: dragFrom === index ? "2px dashed #fff" : "2px solid rgba(255,255,255,0.25)",
                      opacity: dragFrom === index ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{spool.filament.material ?? "-"}</div>
                    <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {spool.filament.name ?? `#${spool.id}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

export default PrinterAmsSection;
