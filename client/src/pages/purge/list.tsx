import { DeleteOutlined, EditOutlined, ExperimentOutlined, EyeOutlined, FilterOutlined, PrinterOutlined } from "@ant-design/icons";
import { CreateButton, List, useTable } from "@refinedev/antd";
import { HttpError, useDelete, useInvalidate, useNavigation, useTranslate } from "@refinedev/core";
import { Button, Popconfirm, Table, message } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
    Action,
    ActionsColumn,
    DateColumn,
    FilteredQueryColumn,
    ImageColumn,
    NumberColumn,
    RichColumn,
    SortedColumn,
    SpoolIconColumn,
} from "../../components/column";
import { useLiveify } from "../../components/liveify";
import { useSpoolmanFilamentFilter } from "../../components/otherModels";
import { removeUndefined } from "../../utils/filtering";
import { TableState, useInitialTableState, useStoreInitialState } from "../../utils/saveload";
import { useGetSettings } from "../../utils/querySettings";
import { getAPIURL } from "../../utils/url";
import { IPurgeCalibration } from "./model";
import { PurgeMatrixModal } from "../../components/purgeMatrixModal";

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

const namespace = "purgeList-v1";

const allColumns = [
    "id",
    "image",
    "from_filament.combined_name",
    "to_filament.combined_name",
    "purge_volume",
    "multiplication_factor",
    "nozzle_size",
    "print_temp",
    "registered",
    "comment",
];

export const PurgeList = () => {
    const t = useTranslate();
    const navigate = useNavigate();
    const { showUrl, editUrl } = useNavigation();

    const initialState = useInitialTableState(namespace);

    const { tableProps, sorters, filters, setFilters, setSorters, currentPage, pageSize, setCurrentPage } =
        useTable<IPurgeCalibration, HttpError, IPurgeCollapsed>({
            resource: "purge",
            syncWithLocation: false,
            pagination: {
                mode: "server",
                currentPage: initialState.pagination.currentPage,
                pageSize: initialState.pagination.pageSize,
            },
            sorters: {
                mode: "server",
                initial: initialState.sorters,
            },
            filters: {
                mode: "server",
                initial: initialState.filters,
            },
            queryOptions: {
                select: (data: { total: number; data: IPurgeCalibration[] }) => {
                    return {
                        total: data.total,
                        data: data.data.map(collapsePurge),
                    };
                },
            },
        });

    const [showColumns] = useState<string[]>(initialState.showColumns ?? allColumns);

    const tableState: TableState = {
        sorters,
        filters,
        pagination: { currentPage, pageSize },
        showColumns,
    };
    useStoreInitialState(namespace, tableState);

    const queryDataSource: IPurgeCollapsed[] = useMemo(
        () => (tableProps.dataSource || []).map(collapsePurge),
        [tableProps.dataSource],
    );
    const dataSource = useLiveify("purge", queryDataSource, collapsePurge);

    // Row Selection for Matrix
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRows, setSelectedRows] = useState<IPurgeCollapsed[]>([]);
    const [matrixModalOpen, setMatrixModalOpen] = useState(false);
    const [matrixFilaments, setMatrixFilaments] = useState<any[]>([]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[], rows: IPurgeCollapsed[]) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
        },
        preserveSelectedRowKeys: true,
    };

    const settings = useGetSettings();
    const maxFilaments = settings.data?.purge_matrix_max_filaments
        ? JSON.parse(settings.data.purge_matrix_max_filaments.value)
        : 6;

    const handleViewMatrix = () => {
        const filamentsMap = new Map<number, any>();

        selectedRows.forEach((row) => {
            if (row.from_filament) {
                filamentsMap.set(row.from_filament.id, row.from_filament);
            }
            if (row.to_filament) {
                filamentsMap.set(row.to_filament.id, row.to_filament);
            }
        });

        const filaments = Array.from(filamentsMap.values()).map((f) => ({
            id: f.id,
            name: f.name ? `${f.vendor?.name ? f.vendor.name + " - " : ""}${f.name}` : `ID: ${f.id}`,
            color_hex: f.color_hex,
            multi_color_hexes: f.multi_color_hexes,
        }));

        if (filaments.length < 2) {
            message.warning(t("purge.messages.selectTwoFilaments"));
            return;
        }

        if (filaments.length > maxFilaments) {
            message.error(t("purge.messages.maxFilamentsExceeded", { count: filaments.length, max: maxFilaments }));
            return;
        }

        setMatrixFilaments(filaments);
        setMatrixModalOpen(true);
    };

    const { mutate: mutateDelete } = useDelete();
    const actions = (record: IPurgeCollapsed) => [
        { name: t("printing.qrcode.button"), icon: <PrinterOutlined />, onClick: () => navigate(`print?purges=${record.id}`) },
        { name: t("buttons.show"), icon: <EyeOutlined />, link: showUrl("purge", record.id) },
        { name: t("buttons.edit"), icon: <EditOutlined />, link: editUrl("purge", record.id) },
        {
            name: t("buttons.delete"),
            icon: <DeleteOutlined />,
            onClick: () => {
                // This is handled by a Popconfirm in the column, but we can also use mutateDelete here if needed
            },
            component: (
                <Popconfirm
                    title={t("buttons.delete") + "?"}
                    onConfirm={() => {
                        mutateDelete({
                            resource: "purge",
                            id: record.id,
                        });
                    }}
                    okText={t("yes")}
                    cancelText={t("no")}
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                    />
                </Popconfirm>
            )
        },
    ];

    const commonProps = {
        t,
        navigate,
        actions,
        dataSource,
        tableState,
        sorter: true,
    };

    return (
        <List
            headerButtons={() => (
                <>
                    <Button
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={() => {
                            if (selectedRowKeys.length === 0) {
                                navigate("print");
                            } else {
                                const urlParams = new URLSearchParams();
                                selectedRowKeys.forEach((key) => urlParams.append("purges", key.toString()));
                                navigate(`print?${urlParams.toString()}`);
                            }
                        }}
                    >
                        {t("printing.qrcode.button")}
                    </Button>
                    <Button
                        type="primary"
                        icon={<ExperimentOutlined />}
                        onClick={handleViewMatrix}
                        disabled={selectedRowKeys.length < 1}
                    >
                        {t("purge.buttons.viewMatrix")}
                    </Button>
                    <Button
                        type="primary"
                        icon={<FilterOutlined />}
                        onClick={() => {
                            setFilters([], "replace");
                            setSorters([{ field: "id", order: "asc" }]);
                            setCurrentPage(1);
                        }}
                    >
                        {t("buttons.clearFilters")}
                    </Button>
                    <CreateButton />
                </>
            )}
        >
            <Table<IPurgeCollapsed>
                {...(tableProps as any)}
                rowSelection={rowSelection}
                sticky
                tableLayout="auto"
                scroll={{ x: "max-content" }}
                dataSource={dataSource}
                rowKey="id"
                columns={removeUndefined([
                    SortedColumn({
                        ...commonProps,
                        id: "id",
                        i18nkey: "purge.fields.id",
                        width: 70,
                    }),
                    ImageColumn({
                        ...commonProps,
                        id: "image",
                        i18nkey: "purge.fields.image",
                        width: 80,
                        getUrl: (record) => (record.image_path ? `${getAPIURL()}/purge/${record.id}/image` : undefined),
                    }),
                    SpoolIconColumn({
                        ...commonProps,
                        id: "from_filament.combined_name",
                        i18nkey: "purge.fields.from_filament",
                        color: (record) =>
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
                        color: (record) =>
                            record.to_filament.multi_color_hexes
                                ? {
                                    colors: record.to_filament.multi_color_hexes.split(","),
                                    vertical: record.to_filament.multi_color_direction === "longitudinal",
                                }
                                : record.to_filament.color_hex,
                        dataId: "to_filament_id",
                        filterValueQuery: useSpoolmanFilamentFilter(),
                    }),
                    NumberColumn({
                        ...commonProps,
                        id: "purge_volume",
                        i18nkey: "purge.fields.purge_volume",
                        unit: "mm³",
                        maxDecimals: 1,
                        width: 100,
                    }),
                    NumberColumn({
                        ...commonProps,
                        id: "multiplication_factor",
                        i18nkey: "purge.fields.multiplication_factor",
                        unit: "x",
                        maxDecimals: 2,
                        width: 80,
                    }),
                    NumberColumn({
                        ...commonProps,
                        id: "nozzle_size",
                        i18nkey: "purge.fields.nozzle_size",
                        unit: "mm",
                        maxDecimals: 2,
                        width: 80,
                    }),
                    NumberColumn({
                        ...commonProps,
                        id: "print_temp",
                        i18nkey: "purge.fields.print_temp",
                        unit: "°C",
                        maxDecimals: 0,
                        width: 80,
                    }),
                    DateColumn({
                        ...commonProps,
                        id: "registered",
                        i18nkey: "purge.fields.registered",
                    }),
                    RichColumn({
                        ...commonProps,
                        id: "comment",
                        i18nkey: "purge.fields.comment",
                        width: 150,
                    }),
                    ActionsColumn(t("table.actions"), (record) => [
                        { name: t("printing.qrcode.button"), icon: <PrinterOutlined />, onClick: () => navigate(`print?purges=${record.id}`) },
                        { name: t("buttons.show"), icon: <EyeOutlined />, link: showUrl("purge", record.id) },
                        { name: t("buttons.edit"), icon: <EditOutlined />, link: editUrl("purge", record.id) },
                        {
                            name: t("buttons.delete"),
                            icon: <DeleteOutlined />,
                            component: (
                                <Popconfirm
                                    title={t("buttons.delete") + "?"}
                                    onConfirm={() => {
                                        mutateDelete({
                                            resource: "purge",
                                            id: record.id,
                                        });
                                    }}
                                    okText={t("yes")}
                                    cancelText={t("no")}
                                >
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        danger
                                    />
                                </Popconfirm>
                            )
                        },
                    ]),
                ])}
            />
            <PurgeMatrixModal
                open={matrixModalOpen}
                filaments={matrixFilaments}
                onClose={() => setMatrixModalOpen(false)}
            />
        </List>
    );
};

export default PurgeList;
