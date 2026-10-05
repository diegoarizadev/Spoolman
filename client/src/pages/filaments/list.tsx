import { EditOutlined, EyeOutlined, FileOutlined, FilterOutlined, PlusSquareOutlined } from "@ant-design/icons";
import { List, useTable } from "@refinedev/antd";
import { useInvalidate, useNavigation, useTranslate } from "@refinedev/core";
import { Button, Dropdown, Table } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ActionsColumn,
  CustomFieldColumn,
  DateColumn,
  FilteredQueryColumn,
  NumberColumn,
  RichColumn,
  SortedColumn,
  SpoolIconColumn,
} from "../../components/column";
import { ParsedExtras } from "../../components/extraFields";
import { useLiveify } from "../../components/liveify";
import {
  useSpoolmanArticleNumbers,
  useSpoolmanFilamentNames,
  useSpoolmanMaterials,
  useSpoolmanVendors,
} from "../../components/otherModels";
import { removeUndefined } from "../../utils/filtering";
import { EntityType, useGetFields } from "../../utils/queryFields";
import { TableState, useInitialTableState, useStoreInitialState } from "../../utils/saveload";
import { useCurrencyFormatter } from "../../utils/settings";
import {
  buildCalibrationColumns,
  buildMaterialDefaultsColumns,
  CALIBRATION_COLUMN_IDS,
  CALIBRATION_COLUMNS,
  MATERIAL_DEFAULTS_COLUMN_IDS,
  MATERIAL_DEFAULTS_FIELDS,
  useCalibrationsByFilament,
  useMaterialDefaultsByRow,
} from "./listEnrichment";
import { IFilament } from "./model";

dayjs.extend(utc);

interface IFilamentCollapsed extends Omit<IFilament, "vendor"> {
  "vendor.name": string | null;
  material_defaults?: Partial<Record<string, string>>;
  calibration?: Record<string, string>;
}

function collapseFilament(element: IFilament): IFilamentCollapsed {
  let vendor_name: string | null;
  if (element.vendor) {
    vendor_name = element.vendor.name;
  } else {
    vendor_name = null;
  }
  return { ...element, "vendor.name": vendor_name };
}

function translateColumnI18nKey(columnName: string): string {
  columnName = columnName.replace(".", "_");
  return `filament.fields.${columnName}`;
}

// v3 bump: rolls out Tipo/Material Defaults/Calibraciones as default-visible once, without
// permanently re-forcing them back on if the user later hides one -- see defaultColumns below.
const namespace = "filamentList-v3";

const allColumns: (keyof IFilamentCollapsed & string)[] = [
  "id",
  "vendor.name",
  "name",
  "material",
  "price",
  "density",
  "diameter",
  "weight",
  "spool_weight",
  "article_number",
  "settings_extruder_temp",
  "settings_bed_temp",
  "registered",
  "comment",
];
const defaultColumns: string[] = [
  ...allColumns.filter((column_id) => ["registered", "density", "diameter", "spool_weight"].indexOf(column_id) === -1),
  "extra.tipo",
  ...MATERIAL_DEFAULTS_COLUMN_IDS,
  ...CALIBRATION_COLUMN_IDS,
];

export const FilamentList = () => {
  const t = useTranslate();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const extraFields = useGetFields(EntityType.filament);
  const currencyFormatter = useCurrencyFormatter();

  const allColumnsWithExtraFields = [
    ...allColumns,
    ...(extraFields.data?.map((field) => "extra." + field.key) ?? []),
    ...MATERIAL_DEFAULTS_COLUMN_IDS,
    ...CALIBRATION_COLUMN_IDS,
  ];

  // Load initial state
  const initialState = useInitialTableState(namespace);

  // Fetch data from the API
  // To provide the live updates, we use a custom solution (useLiveify) instead of the built-in refine "liveMode" feature.
  // This is because the built-in feature does not call the liveProvider subscriber with a list of IDs, but instead
  // calls it with a list of filters, sorters, etc. This means the server-side has to support this, which is quite hard.
  const { tableProps, sorters, setSorters, filters, setFilters, currentPage, pageSize, setCurrentPage } =
    useTable<IFilamentCollapsed>({
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
      liveMode: "manual",
      onLiveEvent(event) {
        if (event.type === "created" || event.type === "deleted") {
          // updated is handled by the liveify
          invalidate({
            resource: "filament",
            invalidates: ["list"],
          });
        }
      },
      queryOptions: {
        select(data) {
          return {
            total: data.total,
            data: data.data.map(collapseFilament),
          };
        },
      },
    });

  // Create state for the columns to show
  const [showColumns, setShowColumns] = useState<string[]>(initialState.showColumns ?? defaultColumns);

  // Store state in local storage
  const tableState: TableState = {
    sorters,
    filters,
    pagination: { currentPage: currentPage, pageSize },
    showColumns,
  };
  useStoreInitialState(namespace, tableState);

  // Collapse the dataSource to a mutable list
  const queryDataSource: IFilamentCollapsed[] = useMemo(
    () => (tableProps.dataSource || []).map((record) => ({ ...record })),
    [tableProps.dataSource],
  );
  const liveDataSource = useLiveify("filament", queryDataSource, collapseFilament);

  // Look up Material Defaults (by vendor+material+tipo, deduped) and Calibraciones (one bulk
  // fetch grouped by filament) for the currently visible page, then merge them onto each row so
  // the generic column renderers can read them like any other field.
  const materialDefaultsByCombo = useMaterialDefaultsByRow(liveDataSource);
  const calibrationsByFilament = useCalibrationsByFilament();
  const dataSource: IFilamentCollapsed[] = useMemo(
    () =>
      liveDataSource.map((row) => {
        const tipo = ParsedExtras(row).extra?.tipo;
        const key = `${row["vendor.name"] ?? ""}|${row.material ?? ""}|${typeof tipo === "string" ? tipo : ""}`;
        const materialDefaults = materialDefaultsByCombo.get(key);
        return {
          ...row,
          material_defaults: (materialDefaults ?? {}) as Partial<Record<string, string>>,
          calibration: calibrationsByFilament.get(row.id) ?? {},
        };
      }),
    [liveDataSource, materialDefaultsByCombo, calibrationsByFilament],
  );

  if (tableProps.pagination) {
    tableProps.pagination.showSizeChanger = true;
  }

  const { editUrl, showUrl, cloneUrl } = useNavigation();
  const filamentAddSpoolUrl = (id: number): string => `/spool/create?filament_id=${id}`;
  const actions = (record: IFilamentCollapsed) => [
    { name: t("buttons.show"), icon: <EyeOutlined />, link: showUrl("filament", record.id) },
    { name: t("buttons.edit"), icon: <EditOutlined />, link: editUrl("filament", record.id) },
    { name: t("buttons.clone"), icon: <PlusSquareOutlined />, link: cloneUrl("filament", record.id) },
    { name: t("filament.buttons.add_spool"), icon: <FileOutlined />, link: filamentAddSpoolUrl(record.id) },
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
      headerButtons={({ defaultButtons }) => (
        <>
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
          <Dropdown
            trigger={["click"]}
            menu={{
              items: allColumnsWithExtraFields.map((column_id) => {
                if (column_id.indexOf("extra.") === 0) {
                  const extraField = extraFields.data?.find((field) => "extra." + field.key === column_id);
                  return {
                    key: column_id,
                    label: extraField?.name ?? column_id,
                  };
                }

                if (column_id.indexOf("material_defaults.") === 0) {
                  const field = MATERIAL_DEFAULTS_FIELDS.find((f) => `material_defaults.${f.key}` === column_id);
                  return {
                    key: column_id,
                    label: field?.label ?? column_id,
                  };
                }

                if (column_id.indexOf("calibration.") === 0) {
                  const config = CALIBRATION_COLUMNS.find((c) => `calibration.${c.type}` === column_id);
                  return {
                    key: column_id,
                    label: config?.label ?? column_id,
                  };
                }

                return {
                  key: column_id,
                  label: t(translateColumnI18nKey(column_id)),
                };
              }),
              selectedKeys: showColumns,
              selectable: true,
              multiple: true,
              onDeselect: (keys) => {
                setShowColumns(keys.selectedKeys);
              },
              onSelect: (keys) => {
                setShowColumns(keys.selectedKeys);
              },
            }}
          >
            <Button type="primary" icon={<EditOutlined />}>
              {t("buttons.hideColumns")}
            </Button>
          </Dropdown>
          {defaultButtons}
        </>
      )}
    >
      <Table<IFilamentCollapsed>
        {...tableProps}
        sticky
        tableLayout="auto"
        scroll={{ x: "max-content" }}
        dataSource={dataSource}
        rowKey="id"
        columns={removeUndefined([
          SortedColumn({
            ...commonProps,
            id: "id",
            i18ncat: "filament",
            width: 70,
          }),
          FilteredQueryColumn({
            ...commonProps,
            id: "vendor.name",
            i18nkey: "filament.fields.vendor_name",
            filterValueQuery: useSpoolmanVendors(),
          }),
          SpoolIconColumn({
            ...commonProps,
            id: "name",
            i18ncat: "filament",
            color: (record: IFilamentCollapsed) =>
              record.multi_color_hexes
                ? {
                    colors: record.multi_color_hexes.split(","),
                    vertical: record.multi_color_direction === "longitudinal",
                  }
                : record.color_hex,
            filterValueQuery: useSpoolmanFilamentNames(),
          }),
          FilteredQueryColumn({
            ...commonProps,
            id: "material",
            i18ncat: "filament",
            filterValueQuery: useSpoolmanMaterials(),
            width: 110,
          }),
          SortedColumn({
            ...commonProps,
            id: "price",
            i18ncat: "filament",
            align: "right",
            width: 80,
            render: (_, obj: IFilamentCollapsed) => {
              if (obj.price === undefined) {
                return "";
              }
              return currencyFormatter.format(obj.price);
            },
          }),
          NumberColumn({
            ...commonProps,
            id: "density",
            i18ncat: "filament",
            unit: "g/cm³",
            maxDecimals: 2,
            width: 100,
          }),
          NumberColumn({
            ...commonProps,
            id: "diameter",
            i18ncat: "filament",
            unit: "mm",
            maxDecimals: 2,
            width: 100,
          }),
          NumberColumn({
            ...commonProps,
            id: "weight",
            i18ncat: "filament",
            unit: "g",
            maxDecimals: 0,
            width: 100,
          }),
          NumberColumn({
            ...commonProps,
            id: "spool_weight",
            i18ncat: "filament",
            unit: "g",
            maxDecimals: 0,
            width: 100,
          }),
          FilteredQueryColumn({
            ...commonProps,
            id: "article_number",
            i18ncat: "filament",
            filterValueQuery: useSpoolmanArticleNumbers(),
            width: 130,
          }),
          NumberColumn({
            ...commonProps,
            id: "settings_extruder_temp",
            i18ncat: "filament",
            unit: "°C",
            maxDecimals: 0,
            width: 100,
          }),
          NumberColumn({
            ...commonProps,
            id: "settings_bed_temp",
            i18ncat: "filament",
            unit: "°C",
            maxDecimals: 0,
            width: 100,
          }),
          DateColumn({
            ...commonProps,
            id: "registered",
            i18ncat: "filament",
          }),
          ...(extraFields.data?.map((field) => {
            return CustomFieldColumn({
              ...commonProps,
              field,
            });
          }) ?? []),
          ...buildMaterialDefaultsColumns<IFilamentCollapsed>(tableState),
          ...buildCalibrationColumns<IFilamentCollapsed>(tableState),
          RichColumn({
            ...commonProps,
            id: "comment",
            i18ncat: "filament",
            width: 150,
          }),
          ActionsColumn(t("table.actions"), actions),
        ])}
      />
    </List>
  );
};

export default FilamentList;
