import { RightOutlined } from "@ant-design/icons";
import { useTable } from "@refinedev/antd";
import { Button, Checkbox, Col, message, Row, Space, Table } from "antd";
import { t } from "i18next";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SortedColumn, SpoolIconColumn } from "../../components/column";
import { useSpoolmanFilamentFilter } from "../../components/otherModels";
import { removeUndefined } from "../../utils/filtering";
import { TableState } from "../../utils/saveload";
import { IPurgeCalibration } from "../purge/model";

interface Props {
    description?: string;
    onContinue: (selectedPurges: IPurgeCalibration[]) => void;
}

interface IPurgeCollapsed extends IPurgeCalibration {
    "from_filament.combined_name": string;
    "from_filament_id": number;
    "to_filament.combined_name": string;
    "to_filament_id": number;
}

function collapsePurge(element: IPurgeCalibration): IPurgeCollapsed {
    const from_name = element.from_filament.vendor
        ? `${element.from_filament.vendor.name} - ${element.from_filament.name}`
        : element.from_filament.name ?? element.from_filament.id.toString();
    const to_name = element.to_filament.vendor
        ? `${element.to_filament.vendor.name} - ${element.to_filament.name}`
        : element.to_filament.name ?? element.to_filament.id.toString();

    return {
        ...element,
        "from_filament.combined_name": from_name,
        "from_filament_id": element.from_filament.id,
        "to_filament.combined_name": to_name,
        "to_filament_id": element.to_filament.id,
    };
}

const PurgeSelectModal = ({ description, onContinue }: Props) => {
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [messageApi, contextHolder] = message.useMessage();
    const navigate = useNavigate();

    const { tableProps, sorters, filters, currentPage, pageSize } = useTable<IPurgeCollapsed>({
        resource: "purge",
        syncWithLocation: false,
        pagination: {
            mode: "off",
            currentPage: 1,
            pageSize: 10,
        },
        sorters: {
            mode: "server",
        },
        filters: {
            mode: "server",
        },
        queryOptions: {
            select(data) {
                return {
                    total: data.total,
                    data: data.data.map(collapsePurge),
                };
            },
        },
    });

    // Store state in local storage
    const tableState: TableState = {
        sorters,
        filters,
        pagination: { currentPage: currentPage, pageSize },
    };

    // Collapse the dataSource to a mutable list
    const dataSource: IPurgeCollapsed[] = useMemo(
        () => (tableProps.dataSource || []).map((record) => ({ ...record })),
        [tableProps.dataSource],
    );

    // Function to add/remove all filtered items from selected items
    const selectUnselectFiltered = (select: boolean) => {
        setSelectedItems((prevSelected) => {
            const filtered = dataSource.map((purge) => purge.id).filter((purge) => !prevSelected.includes(purge));
            return select ? [...prevSelected, ...filtered] : filtered;
        });
    };

    // Handler for selecting/unselecting individual items
    const handleSelectItem = (item: number) => {
        setSelectedItems((prevSelected) =>
            prevSelected.includes(item) ? prevSelected.filter((selected) => selected !== item) : [...prevSelected, item],
        );
    };

    // State for the select/unselect all checkbox
    const isAllFilteredSelected = dataSource.every((purge) => selectedItems.includes(purge.id));
    const isSomeButNotAllFilteredSelected =
        dataSource.some((purge) => selectedItems.includes(purge.id)) && !isAllFilteredSelected;

    const commonProps = {
        t,
        navigate,
        actions: () => {
            return [];
        },
        dataSource,
        tableState,
        sorter: true,
    };

    return (
        <>
            {contextHolder}
            <Space direction="vertical" style={{ width: "100%" }}>
                {description && <div>{description}</div>}
                <Table
                    {...tableProps}
                    rowKey="id"
                    tableLayout="auto"
                    dataSource={dataSource}
                    pagination={false}
                    scroll={{ y: 200 }}
                    columns={removeUndefined([
                        {
                            width: 50,
                            render: (_, item: IPurgeCalibration) => (
                                <Checkbox checked={selectedItems.includes(item.id)} onChange={() => handleSelectItem(item.id)} />
                            ),
                        },
                        SortedColumn({
                            ...commonProps,
                            id: "id",
                            i18nkey: "purge.fields.id",
                            width: 80,
                        }),
                        SpoolIconColumn({
                            ...commonProps,
                            id: "from_filament.combined_name",
                            i18nkey: "purge.fields.from_filament",
                            color: (record: IPurgeCollapsed) =>
                                record.from_filament.multi_color_hexes
                                    ? {
                                        colors: record.from_filament.multi_color_hexes.split(","),
                                        vertical: record.from_filament.multi_color_direction === "longitudinal",
                                    }
                                    : record.from_filament.color_hex,
                            dataId: "from_filament_id",
                            filterValueQuery: useSpoolmanFilamentFilter(),
                        }),
                        SpoolIconColumn({
                            ...commonProps,
                            id: "to_filament.combined_name",
                            i18nkey: "purge.fields.to_filament",
                            color: (record: IPurgeCollapsed) =>
                                record.to_filament.multi_color_hexes
                                    ? {
                                        colors: record.to_filament.multi_color_hexes.split(","),
                                        vertical: record.to_filament.multi_color_direction === "longitudinal",
                                    }
                                    : record.to_filament.color_hex,
                            dataId: "to_filament_id",
                            filterValueQuery: useSpoolmanFilamentFilter(),
                        }),
                    ])}
                />
                <Row gutter={[10, 10]}>
                    <Col span={12}>
                        <Checkbox
                            checked={isAllFilteredSelected}
                            indeterminate={isSomeButNotAllFilteredSelected}
                            onChange={(e) => {
                                selectUnselectFiltered(e.target.checked);
                            }}
                        >
                            {t("printing.spoolSelect.selectAll")}
                        </Checkbox>
                    </Col>
                    <Col span={12}>
                        <div style={{ float: "right" }}>
                            {t("printing.spoolSelect.selectedTotal", {
                                count: selectedItems.length,
                            })}
                        </div>
                    </Col>
                    <Col span={24}>
                        <Button
                            type="primary"
                            icon={<RightOutlined />}
                            iconPosition="end"
                            onClick={() => {
                                if (selectedItems.length === 0) {
                                    messageApi.open({
                                        type: "error",
                                        content: t("printing.spoolSelect.noSpoolsSelected"),
                                    });
                                    return;
                                }
                                onContinue(dataSource.filter((purge) => selectedItems.includes(purge.id)));
                            }}
                        >
                            {t("buttons.continue")}
                        </Button>
                    </Col>
                </Row>
            </Space>
        </>
    );
};

export default PurgeSelectModal;
