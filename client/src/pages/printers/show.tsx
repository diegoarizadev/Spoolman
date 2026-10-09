import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Show } from "@refinedev/antd";
import { useDelete, useNavigation, useShow } from "@refinedev/core";
import { App, Button, Card, Col, Image, Row, Typography } from "antd";
import { Stat, TagList } from "../../components/stat";
import { getAPIURL } from "../../utils/url";
import { IPrinter } from "./model";

const { Text } = Typography;

export const PrinterShow = () => {
  const { modal } = App.useApp();
  const { list, edit } = useNavigation();
  const { mutate: deletePrinter } = useDelete();

  const { query } = useShow<IPrinter>({ liveMode: "auto" });
  const { data, isLoading } = query;
  const record = data?.data;

  const hasBuildVolume = record?.build_volume_x || record?.build_volume_y || record?.build_volume_z;
  const hasChamber = record?.chamber_enclosed !== undefined;
  const hasAms = record?.ams_compatible || record?.ams_units;
  const hasPhysical = record?.physical_width || record?.physical_depth || record?.physical_height || record?.net_weight;
  const hasElectrical = record?.voltage || record?.frequency || record?.max_power;

  return (
    <Show
      isLoading={isLoading}
      title={record ? `${record.manufacturer} ${record.model}` : ""}
      headerButtons={() => (
        <>
          <Button icon={<EditOutlined />} onClick={() => record && edit("printer", record.id)}>
            Editar
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              record &&
              modal.confirm({
                title: "¿Eliminar esta impresora?",
                okText: "Eliminar",
                okButtonProps: { danger: true },
                cancelText: "Cancelar",
                onOk: () =>
                  deletePrinter(
                    { resource: "printer", id: record.id },
                    { onSuccess: () => list("printer") },
                  ),
              })
            }
          >
            Eliminar
          </Button>
        </>
      )}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" title="Identificación">
            {record?.image_path && (
              <Image
                src={`${getAPIURL()}/printer/${record.id}/image`}
                style={{ width: "100%", borderRadius: 8, marginBottom: 12 }}
              />
            )}
            <Row gutter={[16, 12]}>
              <Col span={24}>
                <Stat label="Fabricante" value={record?.manufacturer} />
              </Col>
              <Col span={24}>
                <Stat label="Modelo" value={record?.model} />
              </Col>
              <Col span={24}>
                <Stat label="SKU" value={record?.sku} />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Row gutter={[16, 16]}>
            {hasBuildVolume && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Volumen de impresión">
                  <Row gutter={[16, 12]}>
                    <Col span={8}>
                      <Stat label="Ancho (X)" value={record?.build_volume_x} unit="mm" />
                    </Col>
                    <Col span={8}>
                      <Stat label="Profundidad (Y)" value={record?.build_volume_y} unit="mm" />
                    </Col>
                    <Col span={8}>
                      <Stat label="Altura (Z)" value={record?.build_volume_z} unit="mm" />
                    </Col>
                    <Col span={24}>
                      <Stat label="Diámetros de boquilla" value={record?.nozzle_diameters?.split(",").join(" / ")} unit="mm" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {(record?.max_hotend_temp || record?.max_bed_temp) && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Temperaturas">
                  <Row gutter={[16, 12]}>
                    <Col span={12}>
                      <Stat label="Max. Hotend" value={record?.max_hotend_temp} unit="°C" />
                    </Col>
                    <Col span={12}>
                      <Stat label="Max. Cama" value={record?.max_bed_temp} unit="°C" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {hasChamber && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Cámara">
                  <Row gutter={[16, 12]}>
                    <Col span={8}>
                      <Stat label="Cerrada" value={record?.chamber_enclosed ? "Sí" : "No"} />
                    </Col>
                    <Col span={8}>
                      <Stat label="Calefaccionada" value={record?.chamber_heated ? "Sí" : "No"} />
                    </Col>
                    <Col span={8}>
                      <Stat label="Temp. máx." value={record?.chamber_max_temp} unit="°C" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {hasAms && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Multi-material / AMS">
                  <Row gutter={[16, 12]} style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Stat label="Compatible AMS/MMU" value={record?.ams_compatible ? "Sí" : "No"} />
                    </Col>
                    <Col span={6}>
                      <Stat label="Cabezales" value={record?.print_heads} />
                    </Col>
                    <Col span={6}>
                      <Stat label="Colores" value={record?.colors_supported} />
                    </Col>
                  </Row>
                  {record?.ams_units && (
                    <>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                        Unidades compatibles
                      </Text>
                      <TagList value={record.ams_units} />
                    </>
                  )}
                </Card>
              </Col>
            )}

            {record?.supported_materials && (
              <Col xs={24}>
                <Card size="small" title="Materiales soportados">
                  <TagList value={record.supported_materials} />
                </Card>
              </Col>
            )}

            {(record?.max_print_speed || record?.max_acceleration) && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Rendimiento">
                  <Row gutter={[16, 12]}>
                    <Col span={12}>
                      <Stat label="Vel. máx." value={record?.max_print_speed} unit="mm/s" />
                    </Col>
                    <Col span={12}>
                      <Stat label="Aceleración máx." value={record?.max_acceleration} unit="mm/s²" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {hasPhysical && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Dimensiones físicas">
                  <Row gutter={[16, 12]}>
                    <Col span={8}>
                      <Stat label="Ancho" value={record?.physical_width} unit="mm" />
                    </Col>
                    <Col span={8}>
                      <Stat label="Profundidad" value={record?.physical_depth} unit="mm" />
                    </Col>
                    <Col span={8}>
                      <Stat label="Altura" value={record?.physical_height} unit="mm" />
                    </Col>
                    <Col span={24}>
                      <Stat label="Peso neto" value={record?.net_weight} unit="kg" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {(hasElectrical || record?.connectivity) && (
              <Col xs={24} sm={12}>
                <Card size="small" title="Eléctrico / Conectividad">
                  <Row gutter={[16, 12]} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Stat label="Voltaje" value={record?.voltage} />
                    </Col>
                    <Col span={8}>
                      <Stat label="Frecuencia" value={record?.frequency} unit="Hz" />
                    </Col>
                    <Col span={8}>
                      <Stat label="Potencia máx." value={record?.max_power} unit="W" />
                    </Col>
                  </Row>
                  {record?.connectivity && <TagList value={record.connectivity} />}
                </Card>
              </Col>
            )}

            {record?.comment && (
              <Col xs={24}>
                <Card size="small" title="Comentario">
                  <Text>{record.comment}</Text>
                </Card>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
    </Show>
  );
};

export default PrinterShow;
