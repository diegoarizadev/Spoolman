import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { axiosInstance } from "@refinedev/simple-rest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, Form, Input, InputNumber, Modal, Space, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { CalibrationImageStrip, CalibrationImagesField, saveCalibrationImages } from "../../components/calibrationImages";
import { Stat } from "../../components/stat";
import { getAPIURL } from "../../utils/url";

interface IPrinterVfa {
  id: number;
  registered: string;
  vfa_speed_min?: number;
  vfa_speed_max?: number;
  images?: { id: number }[];
  notes?: string;
}

const VFA_DESCRIPTION =
  "Identifica el rango de velocidad que genera artefactos de resonancia (ondulaciones visibles) en paredes verticales. Depende de la máquina, por eso se registra por impresora.";
const VFA_URL = "https://www.orcaslicer.com/wiki/calibration/vfa_calib.html";

async function fetchVfa(printerId: number): Promise<IPrinterVfa[]> {
  const response = await fetch(`${getAPIURL()}/printer-calibration?printer_id=${printerId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch VFA tests: ${response.status}`);
  }
  return response.json();
}

type ModalState = { mode: "create" } | { mode: "edit"; record: IPrinterVfa } | null;

function VfaFormModal({ printerId, state, onClose }: { printerId: number; state: ModalState; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = state?.mode === "edit";
  const [pending, setPending] = useState<File[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (state.mode === "edit") {
      form.setFieldsValue(state.record);
    } else {
      form.resetFields();
    }
    setPending([]);
    setRemovedIds([]);
  }, [state, form]);

  const resetAndClose = () => {
    form.resetFields();
    setPending([]);
    setRemovedIds([]);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (values: Record<string, number | string | undefined>) => {
      let id: number;
      if (state?.mode === "edit") {
        id = state.record.id;
        await axiosInstance.patch(`${getAPIURL()}/printer-calibration/${id}`, values);
      } else {
        const res = await axiosInstance.post(`${getAPIURL()}/printer-calibration`, { printer_id: printerId, ...values });
        id = res.data?.id;
      }
      if (id) {
        await saveCalibrationImages("printer-calibration", id, removedIds, pending);
      }
    },
    onSuccess: () => {
      message.success(isEdit ? "Prueba VFA actualizada." : "Prueba VFA guardada.");
      queryClient.invalidateQueries({ queryKey: ["printer-vfa", printerId] });
      resetAndClose();
    },
    onError: (error: { response?: { data?: { detail?: string } }; message?: string }) => {
      const detail = error?.response?.data?.detail ?? error?.message ?? "Error desconocido";
      message.error(`No se pudo guardar la prueba VFA: ${detail}`);
    },
  });

  return (
    <Modal
      title={isEdit ? "Editar prueba VFA" : "Registrar prueba VFA"}
      open={Boolean(state)}
      onCancel={resetAndClose}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
        <Form.Item label="Vel. mínima (mm/s)" name="vfa_speed_min" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Vel. máxima (mm/s)" name="vfa_speed_max" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Imágenes de evidencia">
          <CalibrationImagesField
            resource="printer-calibration"
            calibrationId={state?.mode === "edit" ? state.record.id : undefined}
            existing={state?.mode === "edit" ? (state.record.images ?? []) : []}
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

export function PrinterVfaSection({ printerId }: { printerId?: number }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);

  const { data: records } = useQuery({
    queryKey: ["printer-vfa", printerId],
    queryFn: () => fetchVfa(printerId as number),
    enabled: Boolean(printerId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`${getAPIURL()}/printer-calibration/${id}`);
    },
    onSuccess: () => {
      message.success("Prueba VFA eliminada.");
      queryClient.invalidateQueries({ queryKey: ["printer-vfa", printerId] });
    },
  });

  if (!printerId) {
    return null;
  }

  return (
    <>
      <Card
        size="small"
        title={
          <span>
            Prueba de VFA (Resonancia)
            <Tooltip
              title={
                <div>
                  <div>{VFA_DESCRIPTION}</div>
                  <a href={VFA_URL} target="_blank" rel="noreferrer" style={{ color: "#91caff" }}>
                    Ver guía en OrcaSlicer ↗
                  </a>
                </div>
              }
            >
              <InfoCircleOutlined style={{ marginLeft: 6, fontSize: 12, cursor: "help" }} />
            </Tooltip>
          </span>
        }
        extra={<Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setModalState({ mode: "create" })} />}
      >
        {!records || records.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin registros" style={{ margin: "8px 0" }} />
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
                <CalibrationImageStrip resource="printer-calibration" calibrationId={record.id} images={record.images} />
                <div style={{ flex: 1 }}>
                  <Stat
                    label={new Date(record.registered).toLocaleDateString()}
                    value={`Vel. mínima: ${record.vfa_speed_min ?? "-"} mm/s · Vel. máxima: ${record.vfa_speed_max ?? "-"} mm/s`}
                  />
                  {record.notes && <div style={{ fontSize: 12, opacity: 0.7 }}>{record.notes}</div>}
                </div>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setModalState({ mode: "edit", record })} />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: "¿Eliminar esta prueba VFA?",
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
      <VfaFormModal printerId={printerId} state={modalState} onClose={() => setModalState(null)} />
    </>
  );
}

export default PrinterVfaSection;
