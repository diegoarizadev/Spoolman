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
                video: { facingMode: facing },
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
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
                        minHeight: 280,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <video
                            ref={videoRef}
                            style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "cover" }}
                            playsInline
                            muted
                        />
                        {/* Framing guide overlay: always visible, vertical rectangle ~6:11 ratio */}
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
                            {/* Dark overlay with cutout effect */}
                            <div style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.45)",
                                maskImage: "radial-gradient(ellipse 38% 66% at 50% 50%, transparent 100%, black 100%)",
                                WebkitMaskImage: "radial-gradient(ellipse 38% 66% at 50% 50%, transparent 100%, black 100%)",
                            }} />
                            {/* Corner brackets SVG - same style as QR scanner */}
                            <svg
                                viewBox="0 0 120 220"
                                style={{ width: "38%", maxWidth: 140, opacity: 0.95 }}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {["top-left", "top-right", "bottom-left", "bottom-right"].map((corner) => {
                                    const isRight = corner.includes("right");
                                    const isBottom = corner.includes("bottom");
                                    const x = isRight ? 120 : 0;
                                    const y = isBottom ? 220 : 0;
                                    const sx = isRight ? -1 : 1;
                                    const sy = isBottom ? -1 : 1;
                                    return (
                                        <g key={corner} transform={`translate(${x}, ${y}) scale(${sx}, ${sy})`}>
                                            <line x1="0" y1="0" x2="28" y2="0" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" />
                                            <line x1="0" y1="0" x2="0" y2="28" stroke="#ff4d4f" strokeWidth="4" strokeLinecap="round" />
                                        </g>
                                    );
                                })}
                                {/* Dashed border */}
                                <rect
                                    x="2" y="2" width="116" height="216"
                                    fill="none"
                                    stroke="#ff4d4f"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 4"
                                    opacity="0.7"
                                />
                            </svg>
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
                    <div style={{ borderRadius: 8, overflow: "hidden" }}>
                        <img
                            src={capturedDataUrl}
                            alt="Captured"
                            style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "cover" }}
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
