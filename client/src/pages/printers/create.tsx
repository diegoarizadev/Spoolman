import { CameraOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import { Create, useForm } from "@refinedev/antd";
import { HttpError, IResourceComponentsProps, useNavigation } from "@refinedev/core";
import { axiosInstance } from "@refinedev/simple-rest";
import { Button, Form, Space, Upload } from "antd";
import { useState } from "react";
import CameraCaptureModal from "../../components/cameraCaptureModal";
import { getAPIURL } from "../../utils/url";
import { IPrinter } from "./model";
import { PrinterFormFields } from "./printerFormFields";

const { Dragger } = Upload;

interface CreateOrCloneProps {
  mode?: "create" | "clone";
}

export const PrinterCreate = (props: IResourceComponentsProps & CreateOrCloneProps) => {
  const { list } = useNavigation();
  const [fileList, setFileList] = useState<File[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { form, formProps, formLoading, onFinish } = useForm<IPrinter, HttpError, IPrinter>();

  const handleFinish = async (values: IPrinter) => {
    const result = await onFinish(values);
    const printerId = (result as { data?: IPrinter })?.data?.id;

    if (printerId && fileList.length > 0) {
      const formData = new FormData();
      formData.append("file", fileList[0]);
      await axiosInstance.post(`${getAPIURL()}/printer/${printerId}/image`, formData);
    }
    list("printer");
  };

  return (
    <Create title={props.mode === "clone" ? "Clonar impresora" : "Crear impresora"} isLoading={formLoading} saveButtonProps={{ onClick: () => form.submit() }}>
      <Form {...formProps} layout="vertical" onFinish={(values) => handleFinish(values as IPrinter)}>
        <PrinterFormFields />

        <Form.Item label="Foto">
          {previewUrl ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, display: "block" }}
              />
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                style={{ position: "absolute", top: 4, right: 4 }}
                onClick={() => {
                  setPreviewUrl(null);
                  setFileList([]);
                }}
              />
            </div>
          ) : (
            <Dragger
              multiple={false}
              onRemove={() => setFileList([])}
              beforeUpload={(file) => {
                setFileList([file]);
                setPreviewUrl(URL.createObjectURL(file));
                return false;
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Hacé clic o arrastrá la imagen a esta área</p>
            </Dragger>
          )}
          <Space style={{ marginTop: 8 }}>
            <Button icon={<CameraOutlined />} onClick={() => setCameraOpen(true)}>
              Tomar foto
            </Button>
          </Space>
        </Form.Item>
        <CameraCaptureModal
          open={cameraOpen}
          onCapture={(file) => {
            setFileList([file]);
            setPreviewUrl(URL.createObjectURL(file));
            setCameraOpen(false);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      </Form>
    </Create>
  );
};

export default PrinterCreate;
