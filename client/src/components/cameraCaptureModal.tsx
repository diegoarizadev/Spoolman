import { CameraOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Modal, Space, Typography, Alert } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

interface CameraCaptureModalProps {
    open: boolean;
    onCapture: (file: File) => void;
    onCancel: () => void;
}

type CameraState = "idle" | "streaming" | "captured" | "error";

const CameraCaptureModal = ({ open, onCapture, onCancel }: CameraCaptureModalProps) => {
    const t = useTranslate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const guideRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [state, setState] = useState<CameraState>("idle");
    const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async (facing: "environment" | "user") => {
        stopStream();
        setErrorMessage(null);
        setState("idle");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facing
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setState("streaming");
        } catch (err: any) {
            console.error("Camera error:", err);
            if (err.name === "NotAllowedError") {
                setErrorMessage(t("purge.camera.errorNotAllowed"));
            } else if (err.name === "NotFoundError") {
                setErrorMessage(t("purge.camera.errorNotFound"));
            } else if (
                err.name === "InsecureContextError" ||
                (location.protocol !== "https:" && navigator.mediaDevices === undefined)
            ) {
                setErrorMessage(t("purge.camera.errorInsecure"));
            } else {
                setErrorMessage(t("purge.camera.errorUnknown"));
            }
            setState("error");
        }
    }, [stopStream, t]);

    // Start camera when modal opens
    useEffect(() => {
        if (open) {
            setCapturedDataUrl(null);
            startCamera(facingMode);
        } else {
            stopStream();
            setState("idle");
            setCapturedDataUrl(null);
        }
        return () => {
            stopStream();
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || !guideRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const guide = guideRef.current;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cw = video.clientWidth;
        const ch = video.clientHeight;

        const scale = Math.max(cw / vw, ch / vh);

        const rw = guide.clientWidth;
        const rh = guide.clientHeight;

        const cropW = rw / scale;
        const cropH = rh / scale;
        const cropX = (vw - cropW) / 2;
        const cropY = (vh - cropH) / 2;

        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedDataUrl(dataUrl);
        setState("captured");
        stopStream();
    };

    const handleConfirm = () => {
        if (!capturedDataUrl) return;
        // Convert data URL to File
        const byteString = atob(capturedDataUrl.split(",")[1]);
        const mimeString = capturedDataUrl.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], `purge_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
    };

    const handleRetake = () => {
        setCapturedDataUrl(null);
        startCamera(facingMode);
    };

    const handleFlipCamera = () => {
        const newFacing = facingMode === "environment" ? "user" : "environment";
        setFacingMode(newFacing);
        startCamera(newFacing);
    };

    const handleCancel = () => {
        stopStream();
        setState("idle");
        setCapturedDataUrl(null);
        onCancel();
    };

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            footer={null}
            title={
                <Space>
                    <CameraOutlined />
                    {t("purge.camera.title")}
                </Space>
            }
            destroyOnHidden
            width={480}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                {errorMessage && (
                    <Alert type="error" message={errorMessage} showIcon />
                )}

                {/* Video/camera area - always shown when not captured */}
                {state !== "captured" && (
                    <div style={{
                        position: "relative",
                        background: "#1a1a1a",
                        borderRadius: 8,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        aspectRatio: "3 / 4",
                        minHeight: 400
                    }}>
                        <video
                            ref={videoRef}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            playsInline
                            muted
                        />
                        {/* Framing guide overlay: always visible */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                            }}
                        >
                            {/* Red crop box guiding overlay */}
                            <div
                                ref={guideRef}
                                style={{
                                    height: "80%",
                                    aspectRatio: "1 / 2.2",
                                    maxWidth: "90%",
                                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
                                    border: "2px dashed #ff4d4f",
                                    borderRadius: 8,
                                    position: "relative"
                                }}
                            />
                        </div>
                        {/* Flip camera button */}
                        {state === "streaming" && (
                            <div style={{ position: "absolute", bottom: 8, right: 8 }}>
                                <Button
                                    shape="circle"
                                    icon={<ReloadOutlined />}
                                    onClick={handleFlipCamera}
                                    title={t("purge.camera.flipCamera")}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Captured image preview */}
                {state === "captured" && capturedDataUrl && (
                    <div style={{ borderRadius: 8, overflow: "hidden", background: "#1a1a1a", display: "flex", justifyContent: "center", width: "100%", aspectRatio: "3 / 4", minHeight: 400 }}>
                        <img
                            src={capturedDataUrl}
                            alt="Captured"
                            style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                        />
                    </div>
                )}

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Action buttons */}
                <Space style={{ width: "100%", justifyContent: "center" }}>
                    {state === "streaming" && (
                        <Button
                            type="primary"
                            size="large"
                            icon={<CameraOutlined />}
                            onClick={handleCapture}
                        >
                            {t("purge.camera.capture")}
                        </Button>
                    )}
                    {state === "captured" && (
                        <>
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={handleConfirm}
                            >
                                {t("purge.camera.usePhoto")}
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleRetake}
                            >
                                {t("purge.camera.retake")}
                            </Button>
                        </>
                    )}
                    <Button icon={<CloseOutlined />} onClick={handleCancel}>
                        {t("buttons.cancel")}
                    </Button>
                </Space>

                {state === "streaming" && (
                    <Typography.Text type="secondary" style={{ textAlign: "center", display: "block" }}>
                        {t("purge.camera.hint")}
                    </Typography.Text>
                )}
            </Space>
        </Modal>
    );
};

export default CameraCaptureModal;
