import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Divider, Form, InputNumber, Space, message } from "antd";
import { useEffect } from "react";
import { useGetSettings, useSetSetting } from "../../utils/querySettings";

export function PurgeSettings() {
    const settings = useGetSettings();
    const setNozzleSizes = useSetSetting("purge_nozzle_sizes");
    const setVolumeLow = useSetSetting("purge_volume_low");
    const setVolumeHigh = useSetSetting("purge_volume_high");
    const setMatrixMax = useSetSetting("purge_matrix_max_filaments");

    const [nozzleForm] = Form.useForm();
    const [thresholdForm] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const t = useTranslate();

    // Set initial form values for nozzle sizes
    useEffect(() => {
        if (settings.data?.purge_nozzle_sizes) {
            try {
                const sizes = JSON.parse(settings.data.purge_nozzle_sizes.value);
                nozzleForm.setFieldsValue({ nozzle_sizes: sizes });
            } catch (e) {
                console.error("Failed to parse nozzle sizes", e);
            }
        }
    }, [settings.data, nozzleForm]);

    // Set initial form values for volume thresholds and matrix limit
    useEffect(() => {
        if (settings.data?.purge_volume_low && settings.data?.purge_volume_high) {
            const low = JSON.parse(settings.data.purge_volume_low.value);
            const high = JSON.parse(settings.data.purge_volume_high.value);
            const maxFilaments = settings.data.purge_matrix_max_filaments
                ? JSON.parse(settings.data.purge_matrix_max_filaments.value)
                : 6;

            thresholdForm.setFieldsValue({
                volume_low: low,
                volume_high: high,
                matrix_max_filaments: maxFilaments,
            });
        }
    }, [settings.data, thresholdForm]);

    // Success messages
    useEffect(() => {
        if (setNozzleSizes.isSuccess || setVolumeLow.isSuccess || setVolumeHigh.isSuccess || setMatrixMax.isSuccess) {
            messageApi.success(t("notifications.saveSuccessful"));
        }
    }, [setNozzleSizes.isSuccess, setVolumeLow.isSuccess, setVolumeHigh.isSuccess, setMatrixMax.isSuccess, messageApi, t]);

    const onNozzleFinish = (values: { nozzle_sizes: number[] }) => {
        const cleanSizes = values.nozzle_sizes
            .filter((s) => s != null)
            .sort((a, b) => b - a);
        if (settings.data?.purge_nozzle_sizes.value !== JSON.stringify(cleanSizes)) {
            setNozzleSizes.mutate(cleanSizes);
        }
    };

    const onThresholdFinish = (values: { volume_low: number; volume_high: number; matrix_max_filaments: number }) => {
        const currentLow = JSON.parse(settings.data?.purge_volume_low?.value ?? "50");
        const currentHigh = JSON.parse(settings.data?.purge_volume_high?.value ?? "500");
        const currentMax = JSON.parse(settings.data?.purge_matrix_max_filaments?.value ?? "6");

        if (values.volume_low !== currentLow) setVolumeLow.mutate(values.volume_low);
        if (values.volume_high !== currentHigh) setVolumeHigh.mutate(values.volume_high);
        if (values.matrix_max_filaments !== currentMax) setMatrixMax.mutate(values.matrix_max_filaments);
    };

    const isSaving =
        settings.isFetching ||
        setNozzleSizes.isPending ||
        setVolumeLow.isPending ||
        setVolumeHigh.isPending ||
        setMatrixMax.isPending;

    return (
        <>
            {contextHolder}
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                {/* Nozzle sizes section */}
                <p style={{ marginBottom: "2em" }}>
                    {t("purge.settings.nozzle_sizes.help")}
                </p>
                <Form form={nozzleForm} onFinish={onNozzleFinish} layout="vertical">
                    <Form.List name="nozzle_sizes">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name]}
                                            rules={[{ required: true, message: "Missing size" }]}
                                        >
                                            <InputNumber
                                                placeholder="Size (mm)"
                                                step={0.1}
                                                min={0.1}
                                                max={2.0}
                                                style={{ width: "200px" }}
                                                suffix="mm"
                                            />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        {t("buttons.create")}
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isSaving}>
                            {t("buttons.save")}
                        </Button>
                    </Form.Item>
                </Form>

                <Divider />

                {/* Volume thresholds section */}
                <p style={{ marginBottom: "1em" }}>
                    {t("purge.settings.volume_thresholds.help")}
                </p>
                <Form form={thresholdForm} onFinish={onThresholdFinish} layout="vertical">
                    <Space size="large" wrap>
                        <Form.Item
                            name="volume_low"
                            label={t("purge.settings.volume_thresholds.low_label")}
                            rules={[{ required: true }]}
                        >
                            <InputNumber
                                min={1}
                                max={9999}
                                step={10}
                                style={{ width: 160 }}
                                suffix="mm³"
                            />
                        </Form.Item>
                        <Form.Item
                            name="volume_high"
                            label={t("purge.settings.volume_thresholds.high_label")}
                            rules={[{ required: true }]}
                        >
                            <InputNumber
                                min={1}
                                max={9999}
                                step={50}
                                style={{ width: 160 }}
                                suffix="mm³"
                            />
                        </Form.Item>
                        <Form.Item
                            name="matrix_max_filaments"
                            label={t("purge.settings.matrix.max_filaments")}
                            rules={[{ required: true }]}
                        >
                            <InputNumber
                                min={2}
                                max={20}
                                step={1}
                                style={{ width: 160 }}
                            />
                        </Form.Item>
                    </Space>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={isSaving}>
                            {t("buttons.save")}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </>
    );
}
