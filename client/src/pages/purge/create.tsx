import { Create, useForm, useSelect } from "@refinedev/antd";
import { HttpError, useTranslate } from "@refinedev/core";
import { axiosInstance } from "@refinedev/simple-rest";
import { Form, Input, InputNumber, Select, Upload, Button, Space, App } from "antd";
import { InboxOutlined, CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { IFilament } from "../filaments/model";
import { IPurgeCalibration } from "./model";
import { getAPIURL } from "../../utils/url";
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState, useMemo } from "react";
import { useGetSettings } from "../../utils/querySettings";
import CameraCaptureModal from "../../components/cameraCaptureModal";
import { FilamentSelect } from "../../components/filamentSelect";

const { Dragger } = Upload;

export const PurgeCreate = () => {
    const { message, modal } = App.useApp();
    const t = useTranslate();
    const [fileList, setFileList] = useState<any[]>([]);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
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

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const { formProps, saveButtonProps, onFinish } = useForm<IPurgeCalibration, HttpError, any>({
        resource: "purge",
    });

    useEffect(() => {
        if (fromParam || toParam) {
            formProps.form?.setFieldsValue({
                from_filament_id: fromParam ? parseInt(fromParam) : undefined,
                to_filament_id: toParam ? parseInt(toParam) : undefined,
            });
        }
    }, [fromParam, toParam, formProps.form]);

    const navigate = useNavigate();

    const handleFinish = async (values: any) => {
        try {
            // 1. Create the purge calibration record
            const result = await onFinish(values);
            const purgeId = (result as any)?.data?.id;

            if (purgeId) {
                if (fileList.length > 0) {
                    // 2. Upload the image if present
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
            }
        } catch (error: any) {
            const status = error?.response?.status ?? error?.status ?? error?.statusCode;
            const detail = error?.response?.data?.detail ?? error?.message;

            if (status === 409 && typeof detail === "string" && detail.startsWith("AlreadyExists:")) {
                const existingId = detail.split(":")[1];

                modal.confirm({
                    title: t("purge.messages.duplicateTitle"),
                    content: t("purge.messages.duplicateWarning"),
                    okText: t("purge.messages.duplicateOk"),
                    cancelText: t("purge.messages.duplicateCancel"),
                    onOk: async () => {
                        try {
                            // Perform Update instead
                            const { from_filament_id, to_filament_id, ...updateValues } = values;
                            await axiosInstance.patch(`${getAPIURL()}/purge/${existingId}`, updateValues);

                            if (fileList.length > 0) {
                                const formData = new FormData();
                                const fileObj = fileList[0].originFileObj || fileList[0];
                                formData.append("file", fileObj);
                                await axiosInstance.post(`${getAPIURL()}/purge/${existingId}/image`, formData);
                            }

                            message.success(t("notifications.saveSuccessful"));
                            navigate("/purge");
                        } catch (updateError: any) {
                            message.error(t("notifications.editError", {
                                resource: t("purge.titles.list"),
                                statusCode: updateError?.message
                            }));
                        }
                    },
                });
                return;
            }

            console.error("Submission error details:", error);
            let displayDetail = detail ?? "Error desconocido";
            if (typeof displayDetail === "object") {
                displayDetail = JSON.stringify(displayDetail);
            }

            message.error(
                t("notifications.createError", {
                    resource: t("purge.titles.list"),
                    statusCode: `${status}: ${displayDetail}`
                })
            );
        }
    };

    return (
        <Create saveButtonProps={{ ...saveButtonProps, onClick: () => formProps.form?.submit() }}>
            <Form
                {...formProps}
                layout="vertical"
                onFinish={(values) => {
                    console.log("Form values:", values);
                    handleFinish(values);
                }}
                onFinishFailed={(errorInfo) => {
                    console.error("Form validation failed:", errorInfo.errorFields);
                    message.error("Por favor, revisa los errores en el formulario.");
                }}
            >
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
                    <InputNumber precision={1} min={0} max={2000} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                    label={`${t("purge.fields.multiplication_factor")} (x)`}
                    name="multiplication_factor"
                    initialValue={1.0}
                >
                    <InputNumber precision={2} min={0} max={100} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                    label={t("purge.fields.nozzle_size")}
                    name="nozzle_size"
                    rules={[{ required: true }]}
                    initialValue={nozzleSizes[0]}
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
                    <InputNumber precision={1} min={0} max={500} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label={t("purge.fields.image")}>
                    {capturedPreview ? (
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <img
                                src={capturedPreview}
                                alt="preview"
                                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block" }}
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
                        <Dragger
                            multiple={false}
                            fileList={fileList}
                            onRemove={() => setFileList([])}
                            beforeUpload={(file) => {
                                setFileList([file]);
                                return false;
                            }}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">{t("purge.form.click_or_drag_image")}</p>
                        </Dragger>
                    )}
                    <Space style={{ marginTop: 8 }}>
                        <Button
                            icon={<CameraOutlined />}
                            onClick={() => setCameraOpen(true)}
                        >
                            {t("purge.form.take_photo")}
                        </Button>
                        {capturedPreview && (
                            <Button
                                onClick={() => { setCapturedPreview(null); setFileList([]); }}
                            >
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
                <Form.Item label={t("purge.fields.comment")} name="comment">
                    <Input.TextArea maxLength={1024} />
                </Form.Item>
            </Form>
        </Create>
    );
};

export default PurgeCreate;
