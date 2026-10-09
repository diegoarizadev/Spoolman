import { CameraOutlined, CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Modal, Space, Typography } from "antd";
import { useRef, useState } from "react";
import CameraCaptureModal from "./cameraCaptureModal";

const { Text } = Typography;

const SAMPLE_RADIUS = 8;

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Two-step flow: take/choose a photo of the physical filament, then click a point on it to
 * sample the actual color at that pixel (averaged over a small radius, to be less sensitive to
 * compression noise) instead of guessing it on a color wheel.
 */
export function ColorPickerFromPhoto({
  open,
  onPick,
  onCancel,
}: {
  open: boolean;
  onPick: (hex: string) => void;
  onCancel: () => void;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pickedHex, setPickedHex] = useState<string | null>(null);
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const reset = () => {
    setImageUrl(null);
    setPickedHex(null);
    setMarkerPos(null);
  };

  const handleCapture = (file: File) => {
    setImageUrl(URL.createObjectURL(file));
    setPickedHex(null);
    setMarkerPos(null);
    setCameraOpen(false);
  };

  const handleFileChosen = (file: File) => {
    handleCapture(file);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      return;
    }

    // Draw the full-resolution image once so we can read real pixel data, not the
    // CSS-scaled display size.
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
    }

    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const left = Math.max(0, x - SAMPLE_RADIUS);
    const top = Math.max(0, y - SAMPLE_RADIUS);
    const w = Math.min(canvas.width - left, SAMPLE_RADIUS * 2);
    const h = Math.min(canvas.height - top, SAMPLE_RADIUS * 2);
    const data = ctx.getImageData(left, top, w, h).data;

    let r = 0,
      g = 0,
      b = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    setPickedHex(rgbToHex(r / count, g / count, b / count));
    setMarkerPos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  const handleConfirm = () => {
    if (pickedHex) {
      onPick(pickedHex);
      reset();
    }
  };

  return (
    <>
      <Modal title="Color desde foto" open={open} onCancel={handleClose} footer={null} width={480} destroyOnHidden>
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {!imageUrl ? (
            <>
              <Text type="secondary">
                Sacale una foto al filamento (con buena luz, sin flash directo si es posible) y después tocá el punto
                del que querés tomar el color exacto.
              </Text>
              <Space>
                <Button type="primary" icon={<CameraOutlined />} onClick={() => setCameraOpen(true)}>
                  Tomar foto
                </Button>
                <Button
                  icon={<CameraOutlined />}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) {
                        handleFileChosen(file);
                      }
                    };
                    input.click();
                  }}
                >
                  Subir imagen
                </Button>
              </Space>
            </>
          ) : (
            <>
              <Text type="secondary">Tocá el punto del filamento del que querés sacar el color.</Text>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Filamento"
                  onClick={handleImageClick}
                  style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, display: "block", cursor: "crosshair" }}
                />
                {markerPos && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${markerPos.x * 100}%`,
                      top: `${markerPos.y * 100}%`,
                      width: 18,
                      height: 18,
                      marginLeft: -9,
                      marginTop: -9,
                      borderRadius: "50%",
                      border: "2px solid white",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {pickedHex && (
                <Space align="center">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.3)",
                      background: `#${pickedHex}`,
                    }}
                  />
                  <Text strong>#{pickedHex}</Text>
                </Space>
              )}

              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  disabled={!pickedHex}
                  onClick={handleConfirm}
                >
                  Usar este color
                </Button>
                <Button icon={<ReloadOutlined />} onClick={reset}>
                  Otra foto
                </Button>
                <Button onClick={handleClose}>Cancelar</Button>
              </Space>
            </>
          )}
        </Space>
      </Modal>

      <CameraCaptureModal open={cameraOpen} onCapture={handleCapture} onCancel={() => setCameraOpen(false)} />
    </>
  );
}

export default ColorPickerFromPhoto;
