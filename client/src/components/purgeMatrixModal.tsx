import { ExperimentOutlined, WarningOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Alert, Button, Modal, Spin, Table, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { IPurgeCalibration } from "../pages/purge/model";
import { useGetSettings } from "../utils/querySettings";
import { getAPIURL } from "../utils/url";

const { Text, Title } = Typography;

interface FilamentInfo {
    id: number;
    name: string;
    color_hex?: string;
    multi_color_hexes?: string;
}

interface PurgeMatrixModalProps {
    open: boolean;
    filaments: FilamentInfo[];
    onClose: () => void;
}

interface CellData {
    calibration?: IPurgeCalibration;
    loading: boolean;
    error?: string;
}

/** Fetches purge data for a specific filament pair */
async function fetchPurgePair(fromId: number, toId: number): Promise<IPurgeCalibration | null> {
    const url = `${getAPIURL()}/purge?from_filament_id=${fromId}&to_filament_id=${toId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: IPurgeCalibration[] = await response.json();
    // Return the best match (lowest nozzle-size-aware pick, or simply first)
    return data.length > 0 ? data[0] : null;
}

/** Renders a colored swatch for a filament */
function FilamentBadge({ filament }: { filament: FilamentInfo }) {
    const color = filament.multi_color_hexes
        ? filament.multi_color_hexes.split(",")[0]
        : filament.color_hex;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {color && (
                <div
                    style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: `#${color}`,
                        border: "1px solid rgba(255,255,255,0.2)",
                        flexShrink: 0,
                    }}
                />
            )}
            <Text
                ellipsis={{ tooltip: filament.name }}
                style={{ fontSize: 12, maxWidth: 120 }}
            >
                {filament.name}
            </Text>
        </div>
    );
}

export function PurgeMatrixModal({ open, filaments, onClose }: PurgeMatrixModalProps) {
    const t = useTranslate();
    const navigate = useNavigate();
    const settings = useGetSettings();

    // Read configurable volume thresholds from settings (defaults: 50 low, 500 high)
    const volumeLow: number = settings.data?.purge_volume_low
        ? JSON.parse(settings.data.purge_volume_low.value)
        : 50;
    const volumeHigh: number = settings.data?.purge_volume_high
        ? JSON.parse(settings.data.purge_volume_high.value)
        : 500;

    // matrix[fromId][toId] = CellData
    const [matrix, setMatrix] = useState<Record<number, Record<number, CellData>>>({});
    const [loadingAll, setLoadingAll] = useState(false);

    // Load all pairs when modal opens
    useEffect(() => {
        if (!open || filaments.length < 2) return;

        setLoadingAll(true);
        const initialMatrix: Record<number, Record<number, CellData>> = {};
        for (const from of filaments) {
            initialMatrix[from.id] = {};
            for (const to of filaments) {
                if (from.id !== to.id) {
                    initialMatrix[from.id][to.id] = { loading: true };
                }
            }
        }
        setMatrix(initialMatrix);

        // Fetch all pairs concurrently
        const pairs: [number, number][] = [];
        for (const from of filaments) {
            for (const to of filaments) {
                if (from.id !== to.id) pairs.push([from.id, to.id]);
            }
        }

        Promise.all(
            pairs.map(async ([fromId, toId]) => {
                try {
                    const result = await fetchPurgePair(fromId, toId);
                    return { fromId, toId, calibration: result ?? undefined, error: undefined };
                } catch (e) {
                    return { fromId, toId, calibration: undefined, error: String(e) };
                }
            })
        ).then((results) => {
            setMatrix((prev) => {
                const next = { ...prev };
                for (const r of results) {
                    next[r.fromId] = { ...next[r.fromId], [r.toId]: { loading: false, calibration: r.calibration, error: r.error } };
                }
                return next;
            });
            setLoadingAll(false);
        });
    }, [open, filaments]);

    // Collect missing pairs
    const missingPairs: [FilamentInfo, FilamentInfo][] = [];
    for (const from of filaments) {
        for (const to of filaments) {
            if (from.id !== to.id) {
                const cell = matrix[from.id]?.[to.id];
                if (cell && !cell.loading && !cell.calibration) {
                    missingPairs.push([from, to]);
                }
            }
        }
    }

    const allLoaded = !loadingAll && filaments.every(
        (f) => filaments.filter((t) => t.id !== f.id).every(
            (t) => matrix[f.id]?.[t.id] && !matrix[f.id][t.id].loading
        )
    );

    // Build table columns: first = row header, then one per filament (as destination)
    const columns = [
        {
            title: (
                <div style={{ color: "#888", fontSize: 11, textAlign: "center" as const }}>
                    {t("purge.matrix.fromTo")}
                </div>
            ),
            dataIndex: "from",
            key: "from",
            fixed: "left" as const,
            width: 160,
            render: (f: FilamentInfo) => (
                <div style={{ padding: "4px 0" }}>
                    <FilamentBadge filament={f} />
                </div>
            ),
        },
        ...filaments.map((to) => ({
            title: (
                <div style={{ textAlign: "center" as const, padding: "2px 0" }}>
                    <FilamentBadge filament={to} />
                </div>
            ),
            key: `to_${to.id}`,
            width: 130,
            align: "center" as const,
            render: (_: unknown, row: { from: FilamentInfo }) => {
                if (row.from.id === to.id) {
                    // Diagonal = same filament
                    return (
                        <div
                            style={{
                                width: "100%",
                                height: 36,
                                background: "repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 6px, #222 6px, #222 12px)",
                                borderRadius: 4,
                            }}
                        />
                    );
                }

                const cell = matrix[row.from.id]?.[to.id];
                if (!cell || cell.loading) {
                    return <Spin size="small" />;
                }

                if (cell.calibration) {
                    const vol = cell.calibration.purge_volume;
                    // Color the cell: green below volumeLow, red above volumeHigh
                    const intensity = Math.min(Math.max((vol - volumeLow) / (volumeHigh - volumeLow), 0), 1);
                    const r = Math.round(40 + intensity * 180);
                    const g = Math.round(180 - intensity * 120);
                    const b = 40;
                    return (
                        <Tooltip
                            title={
                                <div style={{ lineHeight: 2, fontSize: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                        <span style={{ color: "#aaa" }}>{t("purge.fields.purge_volume")}:</span>
                                        <strong>{cell.calibration.purge_volume.toFixed(1)} mm³</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                        <span style={{ color: "#aaa" }}>{t("purge.fields.nozzle_size")}:</span>
                                        <span>{cell.calibration.nozzle_size.toFixed(2)} mm</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                        <span style={{ color: "#aaa" }}>{t("purge.fields.print_temp")}:</span>
                                        <span>{cell.calibration.print_temp} °C</span>
                                    </div>
                                    {cell.calibration.multiplication_factor !== 1 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                            <span style={{ color: "#aaa" }}>{t("purge.fields.multiplication_factor")}:</span>
                                            <span>{cell.calibration.multiplication_factor.toFixed(2)}×</span>
                                        </div>
                                    )}
                                </div>
                            }
                        >
                            <div
                                style={{
                                    background: `rgb(${r},${g},${b})`,
                                    borderRadius: 6,
                                    padding: "6px 4px",
                                    cursor: "pointer",
                                    textAlign: "center",
                                    fontWeight: "bold",
                                    fontSize: 13,
                                    color: "#fff",
                                    userSelect: "none",
                                }}
                                onClick={() => navigate(`/purge/show/${cell.calibration!.id}`)}
                            >
                                {cell.calibration.purge_volume.toFixed(1)} mm³
                            </div>
                        </Tooltip>
                    );
                }

                // Missing: show button to create
                return (
                    <Tooltip title={t("purge.matrix.missingTooltip")}>
                        <Button
                            type="dashed"
                            size="small"
                            icon={<ExperimentOutlined />}
                            style={{ fontSize: 11, borderColor: "#ff7a45", color: "#ff7a45" }}
                            onClick={() => {
                                navigate(`/purge/create?from=${row.from.id}&to=${to.id}`);
                                onClose();
                            }}
                        >
                            {t("purge.matrix.add")}
                        </Button>
                    </Tooltip>
                );
            },
        })),
    ];

    const dataSource = filaments.map((f) => ({ key: f.id, from: f }));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ExperimentOutlined style={{ color: "#fa8c16" }} />
                    <span>{t("purge.matrix.title")}</span>
                    {loadingAll && <Spin size="small" />}
                </div>
            }
            width="min(95vw, 900px)"
            styles={{ body: { padding: "16px 0" } }}
            centered
        >
            <div style={{ padding: "0 16px 12px" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("purge.matrix.legend")}
                </Text>
                <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 24, height: 16, background: "rgb(40,180,40)", borderRadius: 3, display: "inline-block" }} />
                        <Text style={{ fontSize: 11 }}>{t("purge.matrix.lowVolume")}</Text>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 24, height: 16, background: "rgb(220,60,40)", borderRadius: 3, display: "inline-block" }} />
                        <Text style={{ fontSize: 11 }}>{t("purge.matrix.highVolume")}</Text>
                    </span>
                </div>
            </div>

            {/* Matrix table */}
            <Table
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                bordered
                size="small"
                scroll={{ x: "max-content" }}
                style={{ padding: "0 16px" }}
            />

            {/* Missing pairs alert */}
            {allLoaded && missingPairs.length > 0 && (
                <div style={{ padding: "12px 16px 0" }}>
                    <Alert
                        type="warning"
                        icon={<WarningOutlined />}
                        showIcon
                        message={t("purge.matrix.missingAlert", { count: missingPairs.length })}
                        description={
                            <div style={{ marginTop: 6 }}>
                                {missingPairs.slice(0, 6).map(([from, to], i) => (
                                    <Tag
                                        key={i}
                                        style={{ marginBottom: 4, cursor: "pointer" }}
                                        color="orange"
                                        onClick={() => {
                                            navigate(`/purge/create?from=${from.id}&to=${to.id}`);
                                            onClose();
                                        }}
                                    >
                                        {from.name.split(" - ").pop()} → {to.name.split(" - ").pop()} ＋
                                    </Tag>
                                ))}
                                {missingPairs.length > 6 && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {t("purge.matrix.andMore", { count: missingPairs.length - 6 })}
                                    </Text>
                                )}
                            </div>
                        }
                    />
                </div>
            )}

            {/* All complete */}
            {allLoaded && missingPairs.length === 0 && (
                <div style={{ padding: "12px 16px 0" }}>
                    <Alert
                        type="success"
                        showIcon
                        message={t("purge.matrix.complete")}
                    />
                </div>
            )}
        </Modal>
    );
}

export default PurgeMatrixModal;
