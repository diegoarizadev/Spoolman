import { Select, Space } from "antd";
import { useTranslate, useList } from "@refinedev/core";
import { useState, useMemo, useEffect } from "react";
import { IFilament } from "../pages/filaments/model";

interface FilamentSelectProps {
    value?: number;
    placeholder?: string;
    onChange?: (value: number) => void;
}

export const FilamentSelect: React.FC<FilamentSelectProps> = ({ value, placeholder, onChange }) => {
    const t = useTranslate();
    const [selectedVendorId, setSelectedVendorId] = useState<number | "all">("all");

    // Fetch all filaments without pagination to have the complete list
    const { result: filamentResult, query: filamentQuery } = useList<IFilament>({
        resource: "filament",
        pagination: { mode: "off" },
    });

    const allFilaments: IFilament[] = useMemo(() => {
        return filamentResult?.data || [];
    }, [filamentResult?.data]);

    // Extract unique vendors from the fetched filaments
    const vendors = useMemo(() => {
        const vendorMap = new Map<number, string>();
        let hasNoVendor = false;

        allFilaments.forEach((filament: IFilament) => {
            if (filament.vendor) {
                vendorMap.set(filament.vendor.id, filament.vendor.name);
            } else {
                hasNoVendor = true;
            }
        });

        const vendorList: { label: string; value: number | "all" }[] = Array.from(vendorMap.entries()).map(([id, name]) => ({
            label: name,
            value: id,
        }));

        // Sort alphabetically
        vendorList.sort((a, b) => a.label.localeCompare(b.label));

        if (hasNoVendor) {
            const noneLabel = t("buttons.none") === "buttons.none" ? "Ninguno" : t("buttons.none");
            vendorList.unshift({ label: `${t("filament.fields.vendor")} (${noneLabel})`, value: -1 });
        }

        // Add "All" option at the beginning
        const allLabel = t("buttons.all") === "buttons.all" ? "Todos" : t("buttons.all");
        vendorList.unshift({ label: allLabel, value: "all" });

        return vendorList;
    }, [allFilaments, t]);

    // Filter filaments based on the selected vendor
    const filteredFilaments = useMemo(() => {
        if (selectedVendorId === "all") {
            return allFilaments;
        }
        if (selectedVendorId === -1) {
            return allFilaments.filter((f: IFilament) => !f.vendor);
        }
        return allFilaments.filter((f: IFilament) => f.vendor?.id === selectedVendorId);
    }, [allFilaments, selectedVendorId]);

    // Create options for the filament select
    const filamentOptions = useMemo(() => {
        return filteredFilaments.map((filament: IFilament) => ({
            label: filament.vendor ? `${filament.vendor.name} - ${filament.name}` : filament.name || filament.id.toString(),
            value: filament.id,
        })).sort((a: { label: string, value: number }, b: { label: string, value: number }) => a.label.localeCompare(b.label));
    }, [filteredFilaments]);

    // Auto-select the vendor when a value is provided (e.g., in Edit mode or URL params)
    useEffect(() => {
        if (value && allFilaments.length > 0) {
            const filament = allFilaments.find((f: IFilament) => f.id === value);
            if (filament) {
                if (filament.vendor) {
                    setSelectedVendorId(filament.vendor.id);
                } else {
                    setSelectedVendorId(-1);
                }
            }
        }
    }, [value, allFilaments]);

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Select
                value={selectedVendorId}
                onChange={(val) => {
                    setSelectedVendorId(val);
                    if (onChange) {
                        onChange(undefined as any);
                    }
                }}
                options={vendors}
                style={{ width: "100%" }}
                placeholder={t("filament.fields.vendor")}
                showSearch
                filterOption={(input, option) =>
                    (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                }
            />
            <Select
                value={value}
                onChange={onChange}
                options={filamentOptions}
                style={{ width: "100%" }}
                placeholder={placeholder || t("filament.filament")}
                showSearch
                filterOption={(input, option) =>
                    (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
                }
                loading={filamentQuery.isLoading}
                disabled={filamentQuery.isLoading}
            />
        </Space>
    );
};

