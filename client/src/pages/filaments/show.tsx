import { DateField, NumberField, Show, TextField } from "@refinedev/antd";
import { useShow, useTranslate } from "@refinedev/core";
import { Button, Card, Col, Row, Typography } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useNavigate } from "react-router";
import { ExtraFieldDisplay, ParsedExtras } from "../../components/extraFields";
import { NumberFieldUnit } from "../../components/numberField";
import SpoolIcon from "../../components/spoolIcon";
import { Stat } from "../../components/stat";
import { enrichText } from "../../utils/parsing";
import { EntityType, useGetFields } from "../../utils/queryFields";
import { useCurrencyFormatter } from "../../utils/settings";
import { CalibrationsSection } from "./calibrationsSection";
import { MaterialDefaultsCard } from "./materialDefaultsCard";
import { IFilament } from "./model";
dayjs.extend(utc);

export const FilamentShow = () => {
  const t = useTranslate();
  const navigate = useNavigate();
  const extraFields = useGetFields(EntityType.filament);
  const currencyFormatter = useCurrencyFormatter();
  const { query } = useShow<IFilament>({
    liveMode: "auto",
  });
  const { data, isLoading } = query;

  const record = data?.data;
  const parsedTipo = record ? ParsedExtras(record).extra?.tipo : undefined;
  const tipo = typeof parsedTipo === "string" ? parsedTipo : undefined;

  const formatTitle = (item: IFilament) => {
    let vendorPrefix = "";
    if (item.vendor) {
      vendorPrefix = `${item.vendor.name} - `;
    }
    return t("filament.titles.show_title", {
      id: item.id,
      name: vendorPrefix + item.name,
      interpolation: { escapeValue: false },
    });
  };

  const gotoVendor = (): undefined => {
    const URL = `/vendor/show/${record?.vendor?.id}`;
    navigate(URL);
  };

  const gotoSpools = (): undefined => {
    const URL = `/spool#filters=[{"field":"filament.id","operator":"in","value":[${record?.id}]}]`;
    navigate(URL);
  };

  const colorObj = record?.multi_color_hexes
    ? {
        colors: record.multi_color_hexes.split(","),
        vertical: record.multi_color_direction === "longitudinal",
      }
    : record?.color_hex;

  return (
    <Show
      isLoading={isLoading}
      title={record ? formatTitle(record) : ""}
      headerButtons={({ defaultButtons }) => (
        <>
          <Button type="primary" onClick={gotoSpools}>
            {t("filament.fields.spools")}
          </Button>
          {defaultButtons}
        </>
      )}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small" title={t("filament.fields.name")}>
            <Row gutter={[16, 12]}>
              <Col span={8}>
                <Stat label={t("filament.fields.id")} value={<NumberField value={record?.id ?? ""} />} />
              </Col>
              <Col span={16}>
                <Stat
                  label={t("filament.fields.vendor")}
                  value={
                    record?.vendor && (
                      <button
                        onClick={gotoVendor}
                        style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
                      >
                        <Typography.Link>{record.vendor.name}</Typography.Link>
                      </button>
                    )
                  }
                />
              </Col>
              <Col span={24}>
                <Stat label={t("filament.fields.name")} value={record?.name} />
              </Col>
              <Col span={24}>
                <Stat
                  label={t("filament.fields.registered")}
                  value={
                    record?.registered && (
                      <DateField
                        value={dayjs.utc(record.registered).local()}
                        title={dayjs.utc(record.registered).local().format()}
                        format="YYYY-MM-DD HH:mm:ss"
                      />
                    )
                  }
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card size="small" title="Apariencia">
            <Row gutter={[16, 12]}>
              <Col span={24}>
                <Stat
                  label={t("filament.fields.color_hex")}
                  value={
                    (colorObj || record?.color_hex) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {colorObj && <SpoolIcon color={colorObj} size="small" no_margin />}
                        {record?.color_hex && <span>#{record.color_hex}</span>}
                      </div>
                    )
                  }
                />
              </Col>
              <Col span={24}>
                <Stat label={t("filament.fields.material")} value={record?.material} />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card size="small" title="Especificaciones físicas">
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.density")}
                  value={
                    record?.density !== undefined && (
                      <NumberFieldUnit
                        value={record.density}
                        unit="g/cm³"
                        options={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                      />
                    )
                  }
                />
              </Col>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.diameter")}
                  value={
                    record?.diameter !== undefined && (
                      <NumberFieldUnit
                        value={record.diameter}
                        unit="mm"
                        options={{ maximumFractionDigits: 2, minimumFractionDigits: 2 }}
                      />
                    )
                  }
                />
              </Col>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.weight")}
                  value={
                    record?.weight !== undefined && (
                      <NumberFieldUnit
                        value={record.weight}
                        unit="g"
                        options={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                      />
                    )
                  }
                />
              </Col>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.spool_weight")}
                  value={
                    record?.spool_weight !== undefined && (
                      <NumberFieldUnit
                        value={record.spool_weight}
                        unit="g"
                        options={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                      />
                    )
                  }
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card size="small" title="Configuración de impresión">
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.settings_extruder_temp")}
                  value={
                    record?.settings_extruder_temp ? (
                      <NumberFieldUnit value={record.settings_extruder_temp} unit="°C" />
                    ) : undefined
                  }
                />
              </Col>
              <Col span={12}>
                <Stat
                  label={t("filament.fields.settings_bed_temp")}
                  value={
                    record?.settings_bed_temp ? (
                      <NumberFieldUnit value={record.settings_bed_temp} unit="°C" />
                    ) : undefined
                  }
                />
              </Col>
              <Col span={24}>
                <Stat
                  label={t("filament.fields.price")}
                  value={record?.price ? currencyFormatter.format(record.price) : undefined}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {(record?.article_number || record?.external_id || record?.comment) && (
          <Col xs={24}>
            <Card size="small" title="Información adicional">
              <Row gutter={[16, 12]}>
                <Col xs={24} sm={8}>
                  <Stat label={t("filament.fields.article_number")} value={record?.article_number} />
                </Col>
                <Col xs={24} sm={8}>
                  <Stat
                    label={t("filament.fields.external_id")}
                    value={record?.external_id}
                    tooltip="Identificador de este filamento en la base de datos externa (SpoolmanDB) de la que se importó. Sirve para rastrear la fuente de los datos, no es necesario para usar Spoolman."
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Stat
                    label={t("filament.fields.comment")}
                    value={record?.comment && <TextField value={enrichText(record.comment)} />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {(extraFields?.data?.length ?? 0) > 0 && (
          <Col xs={24}>
            <Card size="small" title={t("settings.extra_fields.tab")}>
              <Row gutter={[16, 12]}>
                {extraFields?.data?.map((field, index) => (
                  <Col xs={24} sm={12} md={8} key={index}>
                    <ExtraFieldDisplay field={field} value={record?.extra[field.key]} />
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      <MaterialDefaultsCard vendor={record?.vendor?.name} material={record?.material} type={tipo} />
      <CalibrationsSection filamentId={record?.id} />
    </Show>
  );
};

export default FilamentShow;
