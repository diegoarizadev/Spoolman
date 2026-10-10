import { CameraOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import { axiosInstance } from "@refinedev/simple-rest";
import { Button, Image, Space, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getAPIURL } from "../utils/url";
import CameraCaptureModal from "./cameraCaptureModal";

const { Dragger } = Upload;

export interface ICalibrationImage {
  id: number;
}

/** Applies the image changes a user made in the form: delete removed photos, upload new ones. */
export async function saveCalibrationImages(
  resource: string,
  calibrationId: number,
  removedIds: number[],
  pending: File[],
): Promise<void> {
  for (const imageId of removedIds) {
    await axiosInstance.delete(`${getAPIURL()}/${resource}/${calibrationId}/image/${imageId}`);
  }
  for (const file of pending) {
    const formData = new FormData();
    formData.append("file", file);
    await axiosInstance.post(`${getAPIURL()}/${resource}/${calibrationId}/image`, formData);
  }
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div style={{ position: "relative", width: 96, height: 96 }}>
      <Image src={src} width={96} height={96} style={{ objectFit: "cover", borderRadius: 8 }} />
      <Button
        danger
        size="small"
        icon={<DeleteOutlined />}
        style={{ position: "absolute", top: 2, right: 2 }}
        onClick={onRemove}
      />
    </div>
  );
}

/** Form field to manage any number of evidence photos of a calibration. */
export function CalibrationImagesField({
  resource,
  calibrationId,
  existing,
  removedIds,
  pending,
  onRemoveExisting,
  onPendingChange,
}: {
  resource: string;
  calibrationId?: number;
  existing: ICalibrationImage[];
  removedIds: number[];
  pending: File[];
  onRemoveExisting: (id: number) => void;
  onPendingChange: (files: File[]) => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const pendingUrls = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => () => pendingUrls.forEach((u) => URL.revokeObjectURL(u)), [pendingUrls]);

  const visibleExisting = existing.filter((img) => !removedIds.includes(img.id));

  return (
    <>
      <Image.PreviewGroup>
        <Space wrap size={8} style={{ marginBottom: 8 }}>
          {visibleExisting.map((img) => (
            <Thumb
              key={`e${img.id}`}
              src={`${getAPIURL()}/${resource}/${calibrationId}/image/${img.id}`}
              onRemove={() => onRemoveExisting(img.id)}
            />
          ))}
          {pending.map((file, index) => (
            <Thumb
              key={`p${index}-${file.name}`}
              src={pendingUrls[index]}
              onRemove={() => onPendingChange(pending.filter((_, i) => i !== index))}
            />
          ))}
        </Space>
      </Image.PreviewGroup>

      <Dragger
        multiple
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => {
          onPendingChange([...pending, file]);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Hacé clic o arrastrá una o varias imágenes a esta área</p>
      </Dragger>
      <Space style={{ marginTop: 8 }}>
        <Button icon={<CameraOutlined />} onClick={() => setCameraOpen(true)}>
          Tomar foto
        </Button>
      </Space>
      <CameraCaptureModal
        open={cameraOpen}
        onCapture={(file) => {
          onPendingChange([...pending, file]);
          setCameraOpen(false);
        }}
        onCancel={() => setCameraOpen(false)}
      />
    </>
  );
}

/** Read-only strip of a calibration's photos; clicking one opens a gallery of all of them. */
export function CalibrationImageStrip({ resource, calibrationId, images }: { resource: string; calibrationId: number; images?: ICalibrationImage[] }) {
  if (!images || images.length === 0) {
    return null;
  }
  return (
    <Image.PreviewGroup>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 160 }}>
        {images.map((img) => (
          <Image
            key={img.id}
            src={`${getAPIURL()}/${resource}/${calibrationId}/image/${img.id}`}
            width={48}
            height={48}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
