import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { List as RefineList, useTable } from "@refinedev/antd";
import { useDelete, useNavigation } from "@refinedev/core";
import { App, Button, Image, Space, Table, Tag } from "antd";
import { getAPIURL } from "../../utils/url";
import { IPrinter } from "./model";

export const PrinterList = () => {
  const { modal } = App.useApp();
  const { create, edit, show } = useNavigation();
  const { mutate: deletePrinter } = useDelete();

  const { tableProps } = useTable<IPrinter>({
    resource: "printer",
    syncWithLocation: false,
  });

  return (
    <RefineList
      title="Impresoras"
      headerButtons={() => (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => create("printer")}>
          Crear
        </Button>
      )}
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title=""
          dataIndex="image_path"
          width={64}
          render={(imagePath: string | undefined, record: IPrinter) =>
            imagePath ? (
              <Image
                src={`${getAPIURL()}/printer/${record.id}/image`}
                width={40}
                height={40}
                style={{ objectFit: "cover", borderRadius: 4 }}
              />
            ) : null
          }
        />
        <Table.Column title="Fabricante" dataIndex="manufacturer" sorter />
        <Table.Column title="Modelo" dataIndex="model" sorter />
        <Table.Column
          title="Volumen de impresión"
          render={(_, record: IPrinter) =>
            record.build_volume_x && record.build_volume_y && record.build_volume_z
              ? `${record.build_volume_x}×${record.build_volume_y}×${record.build_volume_z} mm`
              : ""
          }
        />
        <Table.Column
          title="AMS"
          dataIndex="ams_compatible"
          render={(value: boolean) => (value ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column
          title="Materiales"
          dataIndex="supported_materials"
          render={(value: string | undefined) =>
            value ? (
              <Space size={4} wrap>
                {value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .map((v) => (
                    <Tag key={v}>{v}</Tag>
                  ))}
              </Space>
            ) : null
          }
        />
        <Table.Column
          title="Acciones"
          render={(_, record: IPrinter) => (
            <Space>
              <Button type="text" icon={<EyeOutlined />} onClick={() => show("printer", record.id)} />
              <Button type="text" icon={<EditOutlined />} onClick={() => edit("printer", record.id)} />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: "¿Eliminar esta impresora?",
                    okText: "Eliminar",
                    okButtonProps: { danger: true },
                    cancelText: "Cancelar",
                    onOk: () => deletePrinter({ resource: "printer", id: record.id }),
                  })
                }
              />
            </Space>
          )}
        />
      </Table>
    </RefineList>
  );
};

export default PrinterList;
