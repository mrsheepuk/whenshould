import { Forecast } from "./forecast-types";

export interface ForecastResult {
    forecast?: Forecast
    ok: boolean
    err?: string
}

export class Forecaster {
    getForecast = async(postcode: string, past?: boolean): Promise<ForecastResult> => {
        try {
            const period = past ? 'pt24h' : 'fw48h'
            let res = await fetch(`https://api.carbonintensity.org.uk/regional/intensity/${getISONow()}/${period}/postcode/${postcode}`)
            if (!res.ok) {
                return { ok: false, err: 'Invalid request, please check the details and try again' }
            }
            let j = await res.json()
            if (!j) {
                return { ok: false, err: 'Invalid postcode - no data available' }
            }
            return { ok: true,forecast: j.data }
        } catch (err) {
            return { ok: false, err: 'Error requesting data, please try again later'}
        }
    }
}

const getISONow = (): string => {
    let date = new Date()
    let dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
    return new Date(dateUTC).toISOString()
}