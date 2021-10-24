import { Forecast } from "./forecast-types";

export class Forecaster {
    getForecast = async(postcode: string): Promise<Forecast> => {
        let date = new Date()
        let dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
 date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
        let from = new Date(dateUTC).toISOString()
        let res = await fetch(`https://api.carbonintensity.org.uk/regional/intensity/${from}/fw48h/postcode/${postcode}`)
        if (!res.ok) {
            throw new Error('Unable to load data, please try again later')
        }
        let j = await res.json()
        if (!j) {
            throw new Error('Invalid postcode - no data available')
        }
        console.log(j)
        return j.data
    }
}