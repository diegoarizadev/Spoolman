import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { axiosInstance } from "@refinedev/simple-rest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tooltip,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { CalibrationImageStrip, CalibrationImagesField, saveCalibrationImages } from "../../components/calibrationImages";
import { Stat } from "../../components/stat";
import { getAPIURL } from "../../utils/url";
import { CALIBRATION_TYPES, CalibrationTypeConfig, IFilamentCalibration, getCalibrationTypeConfig } from "./calibrationModel";

async function fetchCalibrations(filamentId: number): Promise<IFilamentCalibration[]> {
  const response = await fetch(`${getAPIURL()}/filament-calibration?filament_id=${filamentId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch calibrations: ${response.status}`);
  }
  return response.json();
}

export function formatValue(record: IFilamentCalibration): string {
  const config = getCalibrationTypeConfig(record.calibration_type);
  if (!config) {
    return "";
  }
  return config.fields
    .map((f) => {
      const v = record[f.key];
      if (v === undefined || v === null) {
        return null;
      }
      return `${f.label}: ${v}${f.unit ? ` ${f.unit}` : ""}`;
    })
    .filter(Boolean)
    .join(" · ");
}

function CalibrationTypeTooltip({ config }: { config: CalibrationTypeConfig }) {
  return (
    <Tooltip
      title={
        <div>
          <div>{config.description}</div>
          {config.referenceUrl && (
            <a href={config.referenceUrl} target="_blank" rel="noreferrer" style={{ color: "#91caff" }}>
              Ver guía en OrcaSlicer ↗
            </a>
          )}
        </div>
      }
    >
      <InfoCircleOutlined style={{ marginLeft: 6, fontSize: 12, cursor: "help" }} />
    </Tooltip>
  );
}

type ModalState = { mode: "create"; type: string } | { mode: "edit"; record: IFilamentCalibration } | null;

function CalibrationFormModal({
  filamentId,
  state,
  onClose,
}: {
  filamentId: number;
  state: ModalState;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = state?.mode === "edit";
  const [createType, setCreateType] = useState("");
  const calibrationType = state ? (isEdit ? state.record.calibration_type : createType) : "";
  const [pending, setPending] = useState<File[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  const config = getCalibrationTypeConfig(calibrationType);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (isEdit) {
      form.setFieldsValue(state.record);
    } else {
      form.resetFields();
      setCreateType(state.type);
    }
    setPending([]);
    setRemovedIds([]);
  }, [state, isEdit, form]);

  const resetAndClose = () => {
    form.resetFields();
    setPending([]);
    setRemovedIds([]);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (values: Record<string, number | string | undefined>) => {
      let calibrationId: number;
      if (isEdit) {
        calibrationId = state.record.id;
        await axiosInstance.patch(`${getAPIURL()}/filament-calibration/${calibrationId}`, values);
      } else {
        const body = { filament_id: filamentId, calibration_type: calibrationType, ...values };
        const createResponse = await axiosInstance.post(`${getAPIURL()}/filament-calibration`, body);
        calibrationId = createResponse.data?.id;
      }

      if (calibrationId) {
        await saveCalibrationImages("filament-calibration", calibrationId, removedIds, pending);
      }
    },
    onSuccess: () => {
      message.success(isEdit ? "Calibración actualizada." : "Calibración guardada.");
      queryClient.invalidateQueries({ queryKey: ["filament-calibrations", filamentId] });
      resetAndClose();
    },
    onError: (error: { response?: { data?: { detail?: string } }; message?: string }) => {
      const detail = error?.response?.data?.detail ?? error?.message ?? "Error desconocido";
      message.error(`No se pudo guardar la calibración: ${detail}`);
    },
  });

  return (
    <Modal
      title={isEdit ? "Editar calibración" : "Registrar calibración"}
      open={Boolean(state)}
      onCancel={resetAndClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
        <Form.Item label="Tipo de calibración" required>
          <Select
            value={calibrationType}
            disabled={isEdit}
            onChange={(v) => setCreateType(v)}
            options={CALIBRATION_TYPES.map((c) => ({ label: c.label, value: c.type }))}
          />
        </Form.Item>

        {config?.fields.map((f) => (
          <Form.Item key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`} name={f.key} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} step={f.step ?? 1} />
          </Form.Item>
        ))}

        <Form.Item label="Imágenes de evidencia">
          <CalibrationImagesField
            resource="filament-calibration"
            calibrationId={isEdit ? state.record.id : undefined}
            existing={isEdit ? (state.record.images ?? []) : []}
            removedIds={removedIds}
            pending={pending}
            onRemoveExisting={(id) => setRemovedIds((prev) => [...prev, id])}
            onPendingChange={setPending}
          />
        </Form.Item>

        <Form.Item label="Notas" name="notes">
          <Input.TextArea placeholder="Opcional" maxLength={1024} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function CalibrationsSection({ filamentId }: { filamentId?: number }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);

  const { data: calibrations } = useQuery({
    queryKey: ["filament-calibrations", filamentId],
    queryFn: () => fetchCalibrations(filamentId as number),
    enabled: Boolean(filamentId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${getAPIURL()}/filament-calibration/${id}`);
    },
    onSuccess: () => {
      message.success("Calibración eliminada.");
      queryClient.invalidateQueries({ queryKey: ["filament-calibrations", filamentId] });
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, IFilamentCalibration[]>();
    for (const c of calibrations ?? []) {
      const list = map.get(c.calibration_type) ?? [];
      list.push(c);
      map.set(c.calibration_type, list);
    }
    return map;
  }, [calibrations]);

  if (!filamentId) {
    return null;
  }

  return (
    <div style={{ marginTop: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h4 style={{ margin: 0 }}>Calibraciones</h4>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {CALIBRATION_TYPES.map((config) => {
          const records = grouped.get(config.type) ?? [];
          return (
            <Col xs={24} sm={12} key={config.type}>
              <Card
                size="small"
                title={
                  <span>
                    {config.label}
                    <CalibrationTypeTooltip config={config} />
                  </span>
                }
                extra={
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setModalState({ mode: "create", type: config.type })}
                  />
                }
              >
                {records.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Sin registros"
                    style={{ margin: "8px 0" }}
                  />
                ) : (
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    {records.map((record) => (
                      <div
                        key={record.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "6px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <CalibrationImageStrip resource="filament-calibration" calibrationId={record.id} images={record.images} />
                        <div style={{ flex: 1 }}>
                          <Stat label={new Date(record.registered).toLocaleDateString()} value={formatValue(record)} />
                          {record.notes && <div style={{ fontSize: 12, opacity: 0.7 }}>{record.notes}</div>}
                        </div>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setModalState({ mode: "edit", record })}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            modal.confirm({
                              title: "¿Eliminar esta calibración?",
                              okText: "Eliminar",
                              okButtonProps: { danger: true },
                              cancelText: "Cancelar",
                              onOk: () => deleteMutation.mutate(record.id),
                            })
                          }
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      <CalibrationFormModal filamentId={filamentId} state={modalState} onClose={() => setModalState(null)} />
    </div>
  );
}

export default CalibrationsSection;
