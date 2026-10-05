import { InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Tooltip, Typography } from "antd";
import { Stat, TagList } from "../../components/stat";
import { getAPIURL } from "../../utils/url";

const { Title, Text } = Typography;

export interface MaterialDefaults {
  brand: string;
  material: string;
  type: string;
  nozzle_temp?: string;
  bed_temp?: string;
  chamber_temp?: string;
  fan_speed?: string;
  density?: string;
  diameter?: string;
  flow_ratio?: string;
  max_volumetric_speed?: string;
  max_speed?: string;
  drying_temp?: string;
  drying_time_h?: string;
  spool_weight?: string;
  weight?: string;
  softening_temp?: string;
  vicat_temp?: string;
  glass_transition_temp?: string;
  melting_temp?: string;
  melt_flow_rate?: string;
  shore_hardness?: string;
  tensile_strength_xy?: string;
  tensile_strength_z?: string;
  flexural_strength_xy?: string;
  flexural_strength_z?: string;
  flexural_modulus_xy?: string;
  flexural_modulus_z?: string;
  elongation_xy?: string;
  elongation_z?: string;
  izod_notched_xy?: string;
  izod_notched_z?: string;
  charpy_notched_xy?: string;
  charpy_notched_z?: string;
  ams_compatibility?: string;
  build_plate?: string;
}

export async function fetchMaterialDefaults(vendor: string, material: string, type: string): Promise<MaterialDefaults | null> {
  const url = `${getAPIURL()}/material-defaults?${new URLSearchParams({ vendor, material, type }).toString()}`;
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch material defaults: ${response.status}`);
  }
  return response.json();
}

function useMaterialDefaults(vendor?: string, material?: string, type?: string) {
  return useQuery({
    queryKey: ["material-defaults", vendor, material, type],
    queryFn: () => fetchMaterialDefaults(vendor as string, material as string, type as string),
    enabled: Boolean(vendor && material && type),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

/**
 * Complements the filament's own fields with manufacturer-published slicer/material defaults,
 * looked up by vendor + material + the "tipo" extra field. Renders nothing if any of those three
 * are missing, or if the bundled dataset has no matching entry.
 */
export function MaterialDefaultsCard({
  vendor,
  material,
  type,
}: {
  vendor?: string;
  material?: string;
  type?: string;
}) {
  const { data, isLoading } = useMaterialDefaults(vendor, material, type);

  if (!vendor || !material || !type || isLoading || !data) {
    return null;
  }

  const hasTemps = data.nozzle_temp || data.bed_temp || data.chamber_temp;
  const hasFan = data.fan_speed;
  const hasFlow = data.max_volumetric_speed || data.flow_ratio;
  const hasDrying = data.drying_temp || data.drying_time_h;
  const hasAms = data.ams_compatibility || data.build_plate;
  const hasThermalDatasheet = data.softening_temp || data.vicat_temp || data.glass_transition_temp || data.melting_temp;
  const hasMechanicalDatasheet =
    data.tensile_strength_xy || data.flexural_strength_xy || data.izod_notched_xy || data.charpy_notched_xy;
  const hasOtherDatasheet = data.melt_flow_rate || data.shore_hardness || data.max_speed;

  return (
    <div style={{ marginTop: 24 }}>
      <Title level={4}>
        Material Defaults — {data.brand} {data.material} {data.type}
      </Title>
      <Text type="secondary">Valores publicados por el fabricante. No editables desde Spoolman.</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card size="small" title="Ficha técnica">
            <Row gutter={[16, 12]}>
              <Col span={12}>
                <Stat label="Densidad" value={data.density} unit="g/cm³" />
              </Col>
              <Col span={12}>
                <Stat label="Diámetro" value={data.diameter} unit="mm" />
              </Col>
              <Col span={12}>
                <Stat label="Peso nominal" value={data.weight} unit="g" />
              </Col>
              <Col span={12}>
                <Stat label="Carrete vacío" value={data.spool_weight} unit="g" />
              </Col>
            </Row>
          </Card>
        </Col>

        {hasTemps && (
          <Col xs={24} sm={12}>
            <Card size="small" title="Temperaturas">
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <Stat label="Nozzle" value={data.nozzle_temp} unit="°C" />
                </Col>
                <Col span={8}>
                  <Stat label="Cama" value={data.bed_temp} unit="°C" />
                </Col>
                <Col span={8}>
                  <Stat label="Cámara" value={data.chamber_temp} unit="°C" />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {(hasFan || hasFlow) && (
          <Col xs={24} sm={12}>
            <Card size="small" title="Velocidad y flujo">
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Stat label="Fan Speed" value={data.fan_speed} unit="%" />
                </Col>
                <Col span={12}>
                  <Stat label="Vel. máxima" value={data.max_speed} unit="mm/s" />
                </Col>
                <Col span={12}>
                  <Stat
                    label="Max Volumetric Speed"
                    value={data.max_volumetric_speed}
                    unit="mm³/s"
                    tooltip="Cuánto material puede fundir y extruir la boquilla por segundo sin perder calidad. Suele limitar la velocidad real de impresión más que la velocidad en mm/s."
                  />
                </Col>
                <Col span={12}>
                  <Stat
                    label="Flow Ratio"
                    value={data.flow_ratio}
                    tooltip="Factor de corrección del flujo de extrusión respecto al valor de referencia del slicer, para compensar el comportamiento de este filamento en particular."
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {hasDrying && (
          <Col xs={24} sm={12}>
            <Card size="small" title="Secado">
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Stat label="Temp. secado" value={data.drying_temp} unit="°C" />
                </Col>
                <Col span={12}>
                  <Stat label="Tiempo" value={data.drying_time_h} unit="h" />
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {(hasThermalDatasheet || hasMechanicalDatasheet || hasOtherDatasheet) && (
          <Col xs={24}>
            <Card size="small" title="Datasheet">
              <Row gutter={[24, 16]}>
                {hasMechanicalDatasheet && (
                  <Col xs={24} md={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Mecánico
                    </Text>
                    <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Stat
                          label="Tracción XY"
                          value={data.tensile_strength_xy}
                          unit="MPa"
                          tooltip="Fuerza máxima que resiste el material al estirarse antes de romperse (ensayo ASTM D638). XY = en el plano de impresión."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Tracción Z"
                          value={data.tensile_strength_z}
                          unit="MPa"
                          tooltip="Igual que Tracción XY pero medido entre capas (eje Z) — suele ser el punto más débil de una pieza impresa en 3D."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Flexión XY"
                          value={data.flexural_strength_xy}
                          unit="MPa"
                          tooltip="Fuerza máxima que resiste la pieza al doblarse antes de ceder o romperse (ensayo ASTM D790)."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Flexión Z"
                          value={data.flexural_strength_z}
                          unit="MPa"
                          tooltip="Resistencia a la flexión (ASTM D790) medida entre capas (eje Z)."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Elongación XY"
                          value={data.elongation_xy}
                          unit="%"
                          tooltip="Cuánto se estira el material antes de romperse, en % de su largo original (ASTM D638). Mayor valor = más flexible/dúctil."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Elongación Z"
                          value={data.elongation_z}
                          unit="%"
                          tooltip="Elongación a la rotura (ASTM D638) medida entre capas (eje Z)."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Izod XY"
                          value={data.izod_notched_xy}
                          unit="kJ/m²"
                          tooltip="Energía que absorbe una probeta con muesca antes de romperse de un golpe (ensayo Izod, ASTM D256). Mayor valor = más resistente a impactos."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Charpy XY"
                          value={data.charpy_notched_xy}
                          unit="kJ/m²"
                          tooltip="Energía que absorbe el material ante un golpe, en un ensayo de apoyo en 3 puntos (Charpy, ISO 179). Mide tenacidad frente a impactos, similar al Izod."
                        />
                      </Col>
                    </Row>
                  </Col>
                )}
                {hasThermalDatasheet && (
                  <Col xs={24} md={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Térmico
                    </Text>
                    <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Stat
                          label="Ablandamiento"
                          value={data.softening_temp}
                          unit="°C"
                          tooltip="Temperatura a partir de la cual el material empieza a perder rigidez y deformarse bajo su propio peso o una carga liviana."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Vicat"
                          value={data.vicat_temp}
                          unit="°C"
                          tooltip="Temperatura a la que una aguja normalizada penetra 1mm en el material bajo carga (ASTM D1525 / ISO 306). Mide resistencia al calor bajo presión puntual."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Tg"
                          value={data.glass_transition_temp}
                          unit="°C"
                          tooltip="Temperatura de transición vítrea: por encima de este punto el material pasa de un estado rígido/quebradizo a uno blando y flexible."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Fusión"
                          value={data.melting_temp}
                          unit="°C"
                          tooltip="Temperatura a la que el material pasa de sólido a líquido. Solo aplica a materiales semicristalinos (PLA, PETG, Nylon...)."
                        />
                      </Col>
                    </Row>
                  </Col>
                )}
                {hasOtherDatasheet && (
                  <Col xs={24} md={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Otros
                    </Text>
                    <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Stat
                          label="MFR"
                          value={data.melt_flow_rate}
                          unit="g/10min"
                          tooltip="Gramos de material que fluyen en 10 min a través de un orificio estándar, bajo temperatura y peso definidos (ASTM D1238). Valor alto = fluye fácil; bajo = más viscoso."
                        />
                      </Col>
                      <Col span={12}>
                        <Stat
                          label="Shore"
                          value={data.shore_hardness}
                          tooltip="Resistencia del material a que un indentador penetre su superficie (ASTM D2240). Más relevante en filamentos flexibles como TPU."
                        />
                      </Col>
                    </Row>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        )}

        {hasAms && (
          <Col xs={24}>
            <Card size="small" title="Compatibilidad AMS / Placas">
              <Row gutter={[24, 12]}>
                {data.ams_compatibility && (
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                      AMS
                      <Tooltip title="Sistemas de cambio automático de filamento (Bambu Lab AMS y variantes) con los que este material es compatible, según el fabricante.">
                        <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 11, cursor: "help" }} />
                      </Tooltip>
                    </Text>
                    <TagList value={data.ams_compatibility} />
                  </Col>
                )}
                {data.build_plate && (
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                      Placas
                      <Tooltip title="Superficies de impresión (build plates) recomendadas por el fabricante para lograr buena adherencia con este material.">
                        <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 11, cursor: "help" }} />
                      </Tooltip>
                    </Text>
                    <TagList value={data.build_plate} />
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

export default MaterialDefaultsCard;
