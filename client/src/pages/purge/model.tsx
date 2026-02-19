import { IFilament } from "../filaments/model";

export interface IPurgeCalibration {
    id: number;
    registered: string;
    from_filament: IFilament;
    to_filament: IFilament;
    purge_volume: number;
    multiplication_factor: number;
    nozzle_size: number;
    print_temp: number;
    image_path?: string;
    comment?: string;
}
