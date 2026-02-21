import { DateField, NumberField, Show, TextField } from "@refinedev/antd";
import { useNavigation, useShow, useTranslate } from "@refinedev/core";
import { Button, Col, Modal, Row, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { PrinterOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import SpoolIcon from "../../components/spoolIcon";
import { getAPIURL } from "../../utils/url";
import { IPurgeCalibration } from "./model";

dayjs.extend(utc);

const { Title } = Typography;

export const PurgeShow = () => {
    const t = useTranslate();
    const navigate = useNavigate();
    const { edit } = useNavigation();
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const { query } = useShow<IPurgeCalibration>({
        liveMode: "auto",
    });
    const { data, isLoading } = query;
    const record = data?.data;

    const imageUrl = record?.image_path
        ? `${getAPIURL()}/purge/${record.id}/image`
        : null;

    const fromColor = record?.from_filament?.multi_color_hexes
        ? {
            colors: record.from_filament.multi_color_hexes.split(","),
            vertical: record.from_filament.multi_color_direction === "longitudinal",
        }
        : record?.from_filament?.color_hex;

    const toColor = record?.to_filament?.multi_color_hexes
        ? {
            colors: record.to_filament.multi_color_hexes.split(","),
            vertical: record.to_filament.multi_color_direction === "longitudinal",
        }
        : record?.to_filament?.color_hex;

    const fromName = record?.from_filament
        ? record.from_filament.vendor
            ? `${record.from_filament.vendor.name} - ${record.from_filament.name}`
            : record.from_filament.name
        : "";

    const toName = record?.to_filament
        ? record.to_filament.vendor
            ? `${record.to_filament.vendor.name} - ${record.to_filament.name}`
            : record.to_filament.name
        : "";

    return (
        <>
            <Show
                isLoading={isLoading}
                title={record ? `#${record.id} — ${fromName} → ${toName}` : ""}
                headerButtons={({ defaultButtons }) => (
                    <>
                        {record && (
                            <Button
                                type="primary"
                                icon={<PrinterOutlined />}
                                onClick={() => navigate(`/purge/print?purges=${record.id}&return=/purge/show/${record.id}`)}
                            >
                                {t("printing.qrcode.button")}
                            </Button>
                        )}
                        {defaultButtons}
                    </>
                )}
            >
                <Row gutter={[24, 0]}>
                    {/* Left column: fields */}
                    <Col xs={24} lg={imageUrl ? 14 : 24}>
                        {/* From filament */}
                        <Title level={5}>{t("purge.fields.from_filament")}</Title>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            {fromColor && <SpoolIcon color={fromColor} size="large" />}
                            <Button
                                type="link"
                                style={{ padding: 0, height: "auto" }}
                                onClick={() => record?.from_filament && edit("filament", record.from_filament.id)}
                            >
                                {fromName}
                            </Button>
                        </div>

                        {/* To filament */}
                        <Title level={5}>{t("purge.fields.to_filament")}</Title>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            {toColor && <SpoolIcon color={toColor} size="large" />}
                            <Button
                                type="link"
                                style={{ padding: 0, height: "auto" }}
                                onClick={() => record?.to_filament && edit("filament", record.to_filament.id)}
                            >
                                {toName}
                            </Button>
                        </div>

                        {/* Purge volume */}
                        <Title level={5}>{t("purge.fields.purge_volume")}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <NumberField
                                value={record?.purge_volume ?? ""}
                                options={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                            />
                            <span style={{ marginLeft: 4, color: "#888" }}>mm³</span>
                        </div>

                        {/* Multiplication factor */}
                        <Title level={5}>{t("purge.fields.multiplication_factor")}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <NumberField
                                value={record?.multiplication_factor ?? ""}
                                options={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                            />
                            <span style={{ marginLeft: 4, color: "#888" }}>x</span>
                        </div>

                        {/* Nozzle size */}
                        <Title level={5}>{t("purge.fields.nozzle_size")}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <NumberField
                                value={record?.nozzle_size ?? ""}
                                options={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                            />
                            <span style={{ marginLeft: 4, color: "#888" }}>mm</span>
                        </div>

                        {/* Print temperature */}
                        <Title level={5}>{t("purge.fields.print_temp")}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <NumberField
                                value={record?.print_temp ?? ""}
                                options={{ maximumFractionDigits: 0 }}
                            />
                            <span style={{ marginLeft: 4, color: "#888" }}>°C</span>
                        </div>

                        {/* Registered date */}
                        <Title level={5}>{t("purge.fields.registered")}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <DateField
                                value={dayjs.utc(record?.registered).local()}
                                format="YYYY-MM-DD HH:mm:ss"
                            />
                        </div>

                        {/* Comment */}
                        {record?.comment && (
                            <>
                                <Title level={5}>{t("purge.fields.comment")}</Title>
                                <TextField value={record.comment} />
                            </>
                        )}
                    </Col>

                    {/* Right column: image */}
                    {imageUrl && (
                        <Col xs={24} lg={10}>
                            <div style={{ position: "sticky", top: 16 }}>
                                <Title level={5}>{t("purge.fields.image")}</Title>
                                <div
                                    onClick={() => setLightboxOpen(true)}
                                    style={{
                                        cursor: "zoom-in",
                                        border: "1px solid #303030",
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        display: "inline-block",
                                        maxWidth: "100%",
                                    }}
                                >
                                    <img
                                        src={imageUrl}
                                        alt="purge evidence"
                                        style={{
                                            maxWidth: "100%",
                                            maxHeight: 400,
                                            display: "block",
                                            objectFit: "contain",
                                        }}
                                    />
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    <Tag color="blue" style={{ cursor: "pointer" }} onClick={() => setLightboxOpen(true)}>
                                        {t("purge.form.zoom_image")}
                                    </Tag>
                                </div>
                            </div>
                        </Col>
                    )}
                </Row>
            </Show>

            {/* Lightbox modal */}
            <Modal
                open={lightboxOpen}
                footer={null}
                onCancel={() => setLightboxOpen(false)}
                width="80vw"
                style={{ top: 20 }}
                centered
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt="purge evidence full"
                        style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }}
                    />
                )}
            </Modal>
        </>
    );
};

export default PurgeShow;
