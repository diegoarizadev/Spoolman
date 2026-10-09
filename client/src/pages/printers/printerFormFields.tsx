import { Col, Form, Input, InputNumber, Row, Switch, Typography } from "antd";

const { Title } = Typography;
const { TextArea } = Input;

/**
 * All the non-image Form.Item fields for a Printer, shared between create and edit so the two
 * forms can't drift apart. Comma-separated fields (nozzle diameters, AMS units, materials,
 * connectivity) are kept as plain text inputs with a hint, rather than a tag-picker, to avoid
 * the array<->string conversion that a controlled tags Select would need on load.
 */
export function PrinterFormFields() {
  return (
    <>
      <Title level={5}>Identificación</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Fabricante" name="manufacturer" rules={[{ required: true }]}>
            <Input maxLength={64} placeholder="ej. Bambu Lab" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Modelo" name="model" rules={[{ required: true }]}>
            <Input maxLength={64} placeholder="ej. A1" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="SKU del fabricante" name="sku">
        <Input maxLength={128} />
      </Form.Item>
      <Form.Item label="Comentario" name="comment">
        <TextArea maxLength={1024} />
      </Form.Item>

      <Title level={5}>Volumen de impresión</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Ancho (X, mm)" name="build_volume_x">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Profundidad (Y, mm)" name="build_volume_y">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Altura (Z, mm)" name="build_volume_z">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Diámetros de boquilla (mm)" name="nozzle_diameters" help="Separados por coma, ej: 0.2,0.4,0.6,0.8">
        <Input placeholder="0.2,0.4,0.6,0.8" />
      </Form.Item>

      <Title level={5}>Temperaturas</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Temp. máx. hotend (°C)" name="max_hotend_temp">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Temp. máx. cama (°C)" name="max_bed_temp">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>

      <Title level={5}>Cámara</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Cerrada" name="chamber_enclosed" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Con calefacción" name="chamber_heated" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Temp. máx. cámara (°C)" name="chamber_max_temp">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>

      <Title level={5}>Multi-material / AMS</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Compatible con AMS/MMU" name="ams_compatible" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Cabezales de impresión" name="print_heads">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Colores soportados" name="colors_supported">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Unidades AMS/MMU compatibles" name="ams_units" help="Separados por coma">
        <Input placeholder="AMS, AMS Lite, AMS 2 Pro, AMS HT" />
      </Form.Item>
      <Form.Item label="Materiales soportados" name="supported_materials" help="Separados por coma">
        <Input placeholder="PLA, PETG, TPU, PVA" />
      </Form.Item>

      <Title level={5}>Rendimiento</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Vel. máx. de impresión (mm/s)" name="max_print_speed">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Aceleración máx. (mm/s²)" name="max_acceleration">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>

      <Title level={5}>Dimensiones físicas</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Ancho (mm)" name="physical_width">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Profundidad (mm)" name="physical_depth">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Altura (mm)" name="physical_height">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Peso neto (kg)" name="net_weight">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>

      <Title level={5}>Eléctrico / Conectividad</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Voltaje" name="voltage">
            <Input placeholder="100-240" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Frecuencia (Hz)" name="frequency">
            <Input placeholder="50/60" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Potencia máx. (W)" name="max_power">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Conectividad" name="connectivity" help="Separados por coma">
        <Input placeholder="WiFi, Bambu-Bus, USB" />
      </Form.Item>
    </>
  );
}

export default PrinterFormFields;
