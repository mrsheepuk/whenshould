import { Forecast } from "./forecast-types";

export interface ForecastResult {
    forecast?: Forecast
    ok: boolean
    err?: string
}

export class Forecaster {
    getForecast = async(postcode: string, date: Date | null): Promise<ForecastResult> => {
        let from = getISO(date || new Date())
        try {
            let res = await fetch(`https://api.carbonintensity.org.uk/regional/intensity/${from}/fw48h/postcode/${postcode}`)
            if (!res.ok) {
                return { ok: false, err: 'Invalid request, please check the details and try again' }
            }
            let j = await res.json()
            if (!j) {
                return { ok: false, err: 'Invalid postcode or no data available - the National Grid only provide carbon data for Great Britain (not including Northern Ireland, unfortunately)' }
            }
            return { ok: true,forecast: j.data }
        } catch (err) {
            return { ok: false, err: 'Error requesting data, please try again later'}
        }
    }
}

const getISO = (date: Date): string => {
    let dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
    return new Date(dateUTC).toISOString()
}