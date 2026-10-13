import { ExperimentOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Typography } from "antd";
import { useMemo, useState } from "react";
import { PurgeMatrixModal } from "../../components/purgeMatrixModal";
import { applyOrder, fetchSpoolsAt, parseOrder, textColorFor } from "../printers/amsSection";
import { IPrinter } from "../printers/model";

const { Text } = Typography;

function PrinterAmsCard({ printer }: { printer: IPrinter }) {
  const [open, setOpen] = useState(false);
  const location = printer.ams_location as string;

  const { data: spools } = useQuery({
    queryKey: ["printer-ams-spools", location],
    queryFn: () => fetchSpoolsAt(location),
  });

  const slots = useMemo(() => applyOrder(spools ?? [], parseOrder(printer.ams_slot_order)), [spools, printer.ams_slot_order]);

  // The matrix is per filament: two spools of the same filament count once, in slot order.
  const filaments = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; color_hex?: string; multi_color_hexes?: string }>();
    for (const { filament: f } of slots) {
      if (!seen.has(f.id)) {
        seen.set(f.id, {
          id: f.id,
          name: f.name ? `${f.vendor?.name ? f.vendor.name + " - " : ""}${f.name}` : `ID: ${f.id}`,
          color_hex: f.color_hex,
          multi_color_hexes: f.multi_color_hexes,
        });
      }
    }
    return Array.from(seen.values());
  }, [slots]);

  return (
    <Card
      size="small"
      title={`${printer.manufacturer} ${printer.model} · AMS`}
      extra={
        <Button
          type="primary"
          size="small"
          icon={<ExperimentOutlined />}
          disabled={filaments.length < 2}
          onClick={() => setOpen(true)}
        >
          Matriz de purga
        </Button>
      }
    >
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        {location}
        {filaments.length < 2 && " · se necesitan al menos 2 filamentos distintos"}
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
        {slots.map((spool, index) => {
          const hex = spool.filament.color_hex;
          return (
            <div key={spool.id} style={{ textAlign: "center" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                A{index + 1}
              </Text>
              <div
                style={{
                  background: hex ? `#${hex}` : "#888",
                  color: textColorFor(hex),
                  borderRadius: 6,
                  padding: "8px 4px",
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 600 }}>{spool.filament.material ?? "-"}</div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {spool.filament.name ?? `#${spool.id}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PurgeMatrixModal open={open} filaments={filaments} onClose={() => setOpen(false)} />
    </Card>
  );
}

export function AmsPurgeOverview() {
  const printers = useList<IPrinter>({ resource: "printer", pagination: { pageSize: 50 } });
  const withAms = (printers.result?.data ?? []).filter((p) => p.ams_location);

  if (withAms.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 32, display: "grid", gap: 16 }}>
      {withAms.map((printer) => (
        <PrinterAmsCard key={printer.id} printer={printer} />
      ))}
    </div>
  );
}
