import { ElectricityUser } from "../data/things";

export interface RunWhatRequest {
    what?: ElectricityUser
    where: string|null
    notBefore?: Date
    finishBy?: Date
}
