import { UploadOutlined, CameraOutlined, DeleteOutlined, ZoomInOutlined, ScissorOutlined } from "@ant-design/icons";
import { Edit, useForm, useSelect } from "@refinedev/antd";
import { HttpError, useTranslate } from "@refinedev/core";
import { Button, Col, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, Upload, App, Modal } from "antd";
import { useEffect, useState, useMemo } from "react";
import { useGetSettings } from "../../utils/querySettings";
import { axiosInstance } from "@refinedev/simple-rest";
import { getAPIURL } from "../../utils/url";
import { IPurgeCalibration } from "./model";
import { useParams, useNavigate } from "react-router";
import CameraCaptureModal from "../../components/cameraCaptureModal";
import CropImageModal from "../../components/cropImageModal";
import { FilamentSelect } from "../../components/filamentSelect";

export const PurgeEdit = () => {
    const navigate = useNavigate();
    const { message, modal } = App.useApp();
    const t = useTranslate();
    const { id: purgeId } = useParams();
    const [fileList, setFileList] = useState<any[]>([]);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const settings = useGetSettings();

    const nozzleSizes = useMemo(() => {
        if (settings.data?.purge_nozzle_sizes) {
            try {
                return JSON.parse(settings.data.purge_nozzle_sizes.value) as number[];
            } catch (e) {
                console.error("Failed to parse nozzle sizes", e);
            }
        }
        return [0.4, 0.2]; // Fallback
    }, [settings.data]);

    const { form, formProps, saveButtonProps, onFinish } = useForm<
        IPurgeCalibration,
        HttpError,
        any
    >({
        resource: "purge",
        action: "edit",
        id: purgeId,
        redirect: "list",
    });

    // Read existing image_path from the loaded record
    const existingImagePath: string | null = (formProps.initialValues as any)?.image_path ?? null;
    const existingImageUrl = existingImagePath
        ? `${getAPIURL()}/purge/${purgeId}/image`
        : null;

    // Flatten initial values for the form
    useEffect(() => {
        if (formProps.initialValues) {
            const initialValues = formProps.initialValues;
            form.setFieldsValue({
                ...initialValues,
                from_filament_id: initialValues.from_filament?.id,
                to_filament_id: initialValues.to_filament?.id,
            });
        }
    }, [formProps.initialValues, form]);

    const deleteImage = () => {
        modal.confirm({
            title: t("purge.form.delete_image_confirm_title"),
            content: t("purge.form.delete_image_confirm_content"),
            okText: t("buttons.delete"),
            okType: "danger",
            onOk: async () => {
                try {
                    await axiosInstance.delete(`${getAPIURL()}/purge/${purgeId}/image`);
                    message.success(t("notifications.deleteSuccess"));
                    setCapturedPreview(null);
                    setFileList([]);
                    // Optionally, refresh form data to reflect image removal
                    form.setFieldsValue({ image_path: null });
                } catch (error) {
                    console.error("Failed to delete image:", error);
                    message.error(t("notifications.deleteError"));
                }
            },
        });
    };

    const handleFinish = async (values: any) => {
        try {
            const { from_filament: _f, to_filament: _t, ...updateValues } = values;
            await onFinish(updateValues);

            if (fileList.length > 0) {
                const formData = new FormData();
                const fileObj = fileList[0].originFileObj || fileList[0];
                formData.append("file", fileObj);

                const response = await axiosInstance.post(`${getAPIURL()}/purge/${purgeId}/image`, formData);

                if (response.status !== 200 && response.status !== 201) {
                    message.warning(t("notifications.saveSuccessful") + " (pero la imagen falló)");
                } else {
                    message.success(t("notifications.saveSuccessful"));
                }
            } else {
                message.success(t("notifications.saveSuccessful"));
            }
            navigate("/purge");
        } catch (error: any) {
            console.error("Edit submission error:", error);
            const status = error?.response?.status ?? error?.status ?? error?.statusCode;
            const detail = error?.response?.data?.detail ?? error?.message;

            if (status === 409 && typeof detail === "string" && detail.startsWith("AlreadyExists:")) {
                modal.confirm({
                    title: t("purge.messages.duplicateTitle"),
                    content: t("purge.messages.duplicateWarning"),
                    okText: t("purge.messages.duplicateOk"),
                    onOk: () => {
                        // Optionally, navigate or perform other actions if user confirms
                    },
                });
            } else {
                let errorMessage = "Error desconocido";
                if (typeof detail === "object") {
                    errorMessage = JSON.stringify(detail);
                } else if (detail) {
                    errorMessage = detail;
                }
                message.error(
                    t("notifications.editError", {
                        resource: t("purge.titles.list"),
                        statusCode: `${status}: ${errorMessage}`
                    })
                );
            }
        }
    };

    // The preview to show in the right panel: new capture/upload takes priority over existing
    const previewUrl = capturedPreview ?? existingImageUrl;
    const isNewImage = !!capturedPreview || fileList.length > 0;

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Row gutter={32} align="top">
                {/* ── Left column: form fields ── */}
                <Col xs={24} lg={previewUrl ? 14 : 24}>
                    <Form {...formProps} form={form} layout="vertical" onFinish={handleFinish}>
                        <Form.Item
                            label={t("purge.fields.from_filament")}
                            name="from_filament_id"
                            rules={[{ required: true }]}
                        >
                            <FilamentSelect placeholder={t("purge.fields.from_filament")} />
                        </Form.Item>
                        <Form.Item
                            label={t("purge.fields.to_filament")}
                            name="to_filament_id"
                            rules={[{ required: true }]}
                        >
                            <FilamentSelect placeholder={t("purge.fields.to_filament")} />
                        </Form.Item>
                        <Form.Item
                            label={`${t("purge.fields.purge_volume")} (mm³)`}
                            name="purge_volume"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} precision={1} min={0} max={2000} />
                        </Form.Item>
                        <Form.Item
                            label={`${t("purge.fields.multiplication_factor")} (x)`}
                            name="multiplication_factor"
                        >
                            <InputNumber style={{ width: "100%" }} precision={2} min={0} max={100} />
                        </Form.Item>
                        <Form.Item
                            label={t("purge.fields.nozzle_size")}
                            name="nozzle_size"
                            rules={[{ required: true }]}
                        >
                            <Select>
                                {nozzleSizes.map(size => (
                                    <Select.Option key={size} value={size}>
                                        {size} mm
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={`${t("purge.fields.print_temp")} (°C)`}
                            name="print_temp"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: "100%" }} precision={1} min={0} max={500} />
                        </Form.Item>
                        <Form.Item label={t("purge.fields.comment")} name="comment">
                            <Input.TextArea maxLength={1024} />
                        </Form.Item>

                        {/* Image upload controls */}
                        <Form.Item label={t("purge.fields.image")}>
                            {capturedPreview ? (
                                <div style={{ position: "relative", display: "inline-block" }}>
                                    <img
                                        src={capturedPreview}
                                        alt="preview"
                                        style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, display: "block" }}
                                    />
                                    <Button
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        style={{ position: "absolute", top: 4, right: 4 }}
                                        onClick={() => { setCapturedPreview(null); setFileList([]); }}
                                    />
                                </div>
                            ) : (
                                <Upload
                                    beforeUpload={(file) => {
                                        setFileList([file]);
                                        setCapturedPreview(URL.createObjectURL(file));
                                        return false;
                                    }}
                                    maxCount={1}
                                    fileList={fileList}
                                    onRemove={() => { setFileList([]); setCapturedPreview(null); }}
                                >
                                    <Button icon={<UploadOutlined />}>{t("buttons.upload")}</Button>
                                </Upload>
                            )}
                            <Space style={{ marginTop: 8 }}>
                                <Button
                                    icon={<CameraOutlined />}
                                    onClick={() => setCameraOpen(true)}
                                >
                                    {t("purge.form.take_photo")}
                                </Button>
                                {capturedPreview && (
                                    <Button onClick={() => { setCapturedPreview(null); setFileList([]); }}>
                                        {t("purge.camera.retake")}
                                    </Button>
                                )}
                            </Space>
                        </Form.Item>

                        <CameraCaptureModal
                            open={cameraOpen}
                            onCapture={(file) => {
                                setFileList([file]);
                                setCapturedPreview(URL.createObjectURL(file));
                                setCameraOpen(false);
                            }}
                            onCancel={() => setCameraOpen(false)}
                        />
                    </Form>
                </Col>

                {/* ── Right column: image panel ── */}
                {previewUrl && (
                    <Col xs={24} lg={10}>
                        <div style={{
                            position: "sticky",
                            top: 80,
                            background: "var(--ant-color-bg-container)",
                            border: "1px solid var(--ant-color-border)",
                            borderRadius: 12,
                            padding: 16,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}>
                            <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                <Typography.Text strong>{t("purge.fields.image")}</Typography.Text>
                                {isNewImage && (
                                    <Tag color="blue">{t("purge.form.new_image") ?? "Nueva imagen"}</Tag>
                                )}
                            </Space>

                            {/* Image with zoom cursor */}
                            <div
                                style={{ cursor: "zoom-in", borderRadius: 8, overflow: "hidden", lineHeight: 0 }}
                                onClick={() => setLightboxOpen(true)}
                            >
                                <img
                                    src={previewUrl}
                                    alt="Evidence"
                                    style={{
                                        width: "100%",
                                        maxHeight: 380,
                                        objectFit: "contain",
                                        background: "#000",
                                        borderRadius: 8,
                                        display: "block",
                                    }}
                                />
                            </div>

                            <Button
                                icon={<ZoomInOutlined />}
                                block
                                onClick={() => setLightboxOpen(true)}
                            >
                                {t("purge.form.zoom_image") ?? "Ver imagen completa"}
                            </Button>

                            <Button
                                icon={<ScissorOutlined />}
                                block
                                onClick={() => setCropModalOpen(true)}
                            >
                                {t("purge.form.crop_image") ?? "Recortar imagen"}
                            </Button>

                            {isNewImage && (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    block
                                    onClick={() => { setCapturedPreview(null); setFileList([]); }}
                                >
                                    {t("purge.form.remove_new_image") ?? "Quitar nueva imagen"}
                                </Button>
                            )}
                        </div>

                        <Modal
                            open={lightboxOpen}
                            onCancel={() => setLightboxOpen(false)}
                            footer={null}
                            centered
                            width="auto"
                            styles={{ body: { padding: 0, lineHeight: 0 } }}
                        >
                            <img
                                src={previewUrl}
                                alt="Full size"
                                style={{ maxWidth: "90vw", maxHeight: "85vh", display: "block", borderRadius: 4 }}
                            />
                        </Modal>

                        <CropImageModal
                            open={cropModalOpen}
                            imageSrc={previewUrl}
                            onCancel={() => setCropModalOpen(false)}
                            onCropComplete={(file, newUrl) => {
                                setFileList([file]);
                                setCapturedPreview(newUrl);
                                setCropModalOpen(false);
                            }}
                        />
                    </Col>
                )}
            </Row>
        </Edit>
    );
};

export default PurgeEdit;
