import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Form, InputNumber, Space, message } from "antd";
import { useEffect } from "react";
import { useGetSettings, useSetSetting } from "../../utils/querySettings";

export function PurgeSettings() {
    const settings = useGetSettings();
    const setNozzleSizes = useSetSetting("purge_nozzle_sizes");
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const t = useTranslate();

    // Set initial form values
    useEffect(() => {
        if (settings.data && settings.data.purge_nozzle_sizes) {
            try {
                const sizes = JSON.parse(settings.data.purge_nozzle_sizes.value);
                form.setFieldsValue({
                    nozzle_sizes: sizes,
                });
            } catch (e) {
                console.error("Failed to parse nozzle sizes", e);
            }
        }
    }, [settings.data, form]);

    // Popup message if setSetting is successful
    useEffect(() => {
        if (setNozzleSizes.isSuccess) {
            messageApi.success(t("notifications.saveSuccessful"));
        }
    }, [setNozzleSizes.isSuccess, messageApi, t]);

    // Handle form submit
    const onFinish = (values: { nozzle_sizes: number[] }) => {
        // Filter out nulls/undefined and sort
        const cleanSizes = values.nozzle_sizes
            .filter((s) => s != null)
            .sort((a, b) => b - a);

        if (settings.data?.purge_nozzle_sizes.value !== JSON.stringify(cleanSizes)) {
            setNozzleSizes.mutate(cleanSizes);
        }
    };

    return (
        <>
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                <p style={{ marginBottom: "2em" }}>
                    {t("purge.settings.nozzle_sizes.help")}
                </p>
                <Form
                    form={form}
                    onFinish={onFinish}
                    layout="vertical"
                >
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
                                                addonAfter="mm"
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
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={settings.isFetching || setNozzleSizes.isPending}
                        >
                            {t("buttons.save")}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
            {contextHolder}
        </>
    );
}
