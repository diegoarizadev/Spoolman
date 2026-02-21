import React, { useState, useRef } from "react";
import { Modal, Button, Space, Typography } from "antd";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useTranslate } from "@refinedev/core";

export interface CropImageModalProps {
    open: boolean;
    imageSrc: string;
    onCancel: () => void;
    onCropComplete: (croppedFile: File, newPreviewUrl: string) => void;
}

export const CropImageModal: React.FC<CropImageModalProps> = ({
    open,
    imageSrc,
    onCancel,
    onCropComplete,
}) => {
    const t = useTranslate();
    const [crop, setCrop] = useState<Crop>({
        unit: "%",
        width: 80,
        height: 80,
        x: 10,
        y: 10,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const getCroppedImg = async (image: HTMLImageElement, pixelCrop: PixelCrop) => {
        const canvas = document.createElement("canvas");
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(
            image,
            pixelCrop.x * scaleX,
            pixelCrop.y * scaleY,
            pixelCrop.width * scaleX,
            pixelCrop.height * scaleY,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise<{ file: File; url: string }>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error("Canvas is empty");
                    reject(new Error("Canvas is empty"));
                    return;
                }
                const file = new File([blob], "cropped_image.png", { type: "image/png" });
                const url = URL.createObjectURL(blob);
                resolve({ file, url });
            }, "image/png", 1);
        });
    };

    const handleConfirm = async () => {
        if (!completedCrop || !imgRef.current) {
            onCancel();
            return;
        }

        try {
            const result = await getCroppedImg(imgRef.current, completedCrop);
            if (result) {
                onCropComplete(result.file, result.url);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Modal
            open={open}
            title={t("purge.form.crop_image", "Recortar Imagen")}
            onCancel={onCancel}
            width="auto"
            style={{ maxWidth: "90vw" }}
            footer={
                <Space>
                    <Button onClick={onCancel}>{t("buttons.cancel", "Cancelar")}</Button>
                    <Button type="primary" onClick={handleConfirm} disabled={!completedCrop || completedCrop.width === 0}>
                        {t("purge.form.crop_confirm", "Confirmar recorte")}
                    </Button>
                </Space>
            }
        >
            <div style={{ maxHeight: "70vh", overflow: "auto", textAlign: "center" }}>
                <div style={{ paddingBottom: 16 }}>
                    <Typography.Text type="secondary">
                        {t("purge.form.crop_instruction", "Haz clic y arrastra sobre la foto para ajustar el área de recorte.")}
                    </Typography.Text>
                </div>
                <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                >
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="Crop target"
                        style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}
                    />
                </ReactCrop>
            </div>
        </Modal>
    );
};

export default CropImageModal;
