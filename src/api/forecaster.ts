import { Forecast } from "./forecast-types";

export interface ForecastResult {
    forecast?: Forecast
    ok: boolean
    err?: string
}

export class Forecaster {
    getForecast = async(postcode: string): Promise<ForecastResult> => {
        let date = new Date()
        let dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
 date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
        let from = new Date(dateUTC).toISOString()
        try {
            let res = await fetch(`https://api.carbonintensity.org.uk/regional/intensity/${from}/fw48h/postcode/${postcode}`)
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