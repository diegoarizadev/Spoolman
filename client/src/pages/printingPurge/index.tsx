import { PageHeader } from "@refinedev/antd";
import { useTranslate } from "@refinedev/core";
import { theme } from "antd";
import { Content } from "antd/es/layout/layout";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useNavigate, useSearchParams } from "react-router";
import { IPurgeCalibration } from "../purge/model";
import PurgeQRCodePrintingDialog from "./purgeQrCodePrintingDialog";
import PurgeSelectModal from "./purgeSelectModal";

dayjs.extend(utc);

const { useToken } = theme;

export const PrintingPurge = () => {
    const { token } = useToken();
    const t = useTranslate();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const purgeIds = searchParams.getAll("purges").map(Number);
    const step = purgeIds.length > 0 ? 1 : 0;

    return (
        <>
            <PageHeader
                title={t("printing.qrcode.button")}
                onBack={() => {
                    const returnUrl = searchParams.get("return");
                    if (returnUrl) {
                        navigate(returnUrl, { relative: "path" });
                    } else {
                        navigate("/purge");
                    }
                }}
            >
                <Content
                    style={{
                        padding: 20,
                        minHeight: 280,
                        margin: "0 auto",
                        backgroundColor: token.colorBgContainer,
                        borderRadius: token.borderRadiusLG,
                        color: token.colorText,
                        fontFamily: token.fontFamily,
                        fontSize: token.fontSizeLG,
                        lineHeight: 1.5,
                    }}
                >
                    {step === 0 && (
                        <PurgeSelectModal
                            description={t("printing.spoolSelect.description")}
                            onContinue={(purges: IPurgeCalibration[]) => {
                                setSearchParams((prev) => {
                                    const newParams = new URLSearchParams(prev);
                                    newParams.delete("purges");
                                    purges.forEach((purge: IPurgeCalibration) => newParams.append("purges", purge.id.toString()));
                                    newParams.set("return", "/purge/print");
                                    return newParams;
                                });
                            }}
                        />
                    )}
                    {step === 1 && <PurgeQRCodePrintingDialog purgeIds={purgeIds} />}
                </Content>
            </PageHeader>
        </>
    );
};

export default PrintingPurge;
