import { parseISO, differenceInMinutes } from "date-fns";

import { Forecast, ForecastIndex, PossibleTime, TimeForecast } from "./forecast-types";
import { RunWhatRequest } from "./request-types";

const NO_FORECAST = 999999

export function findBestWindow(req: RunWhatRequest, forecast: Forecast): { best: PossibleTime | null, all: PossibleTime[] } {
    let best: PossibleTime = {
        from: new Date(),
        to: new Date(),
        forecast: NO_FORECAST,
    }
    let all: PossibleTime[] = []

    // Filter by start/end if specified
    const possible = forecast.data.filter((tf) => {
        if (req.notBefore && req.notBefore < parseISO(tf.from)) {
            return false
        }
        if (req.finishBy && parseISO(tf.to) > req.finishBy) {
            return false
        }
        return true
    })

    if (!req.what?.duration) {
        // Simple mode: just find the best time if we have no required
        // duration
        possible.forEach((tf) => {
            const fc: PossibleTime = { 
                forecast: tf.intensity.forecast, 
                index: tf.intensity.index,
                instForecast: tf.intensity.forecast, 
                instIndex: tf.intensity.index,
                from:  parseISO(tf.from), 
                to: parseISO(tf.to),
            }
            all.push(fc)
            if (fc.forecast < best.forecast) {
                best = fc
            }
        });
    } else {
        // Complex mode: need to sum over consecutive blocks to find the
        // best N-block long period
        const duration = req.what.duration
        possible.forEach((tf, ind) => {
            const calc = calcCurrentWindow(possible, ind, duration)
            const from = parseISO(tf.from)
            if (!calc) return
            const fc: PossibleTime = { 
                forecast: calc.forecast, 
                from: from, 
                to: calc.endTime,
                index: getIndex(calc.forecast),
                instForecast: tf.intensity.forecast,
                instIndex: tf.intensity.index,
                instTo: parseISO(tf.to)
            }
            if (req.what?.duration && req.what?.power) {
                fc.totalCarbon = fc.forecast * (((req.what.power) / 1000) * (req.what.duration / 60))
            }
            all.push(fc)
            if (fc.forecast < best.forecast) {
                best = fc
            }
        });
    }

    // If we've failed to match inside the time window
    if (best.forecast === NO_FORECAST) {
        return { best: null, all }
    }

    return { best, all }
}

function calcCurrentWindow(possible: TimeForecast[], startIndex: number, reqDurationMins: number): { forecast: number, endTime: Date } | null {
    let carbonSum = 0
    let minutesLeft = reqDurationMins
    for (let x = startIndex; x < possible.length; x++) {
        const blockDuration = differenceInMinutes(parseISO(possible[x].to), parseISO(possible[x].from))
        const blockIntensityPerMinute = (possible[x].intensity.forecast / 60)

        if (blockDuration >= minutesLeft) {
            carbonSum += blockIntensityPerMinute * minutesLeft
            // Convert back to g/kwh
            return { 
                forecast: (carbonSum / reqDurationMins) * 60, 
                endTime: parseISO(possible[x].to) 
            }
        }

        carbonSum += blockIntensityPerMinute * blockDuration
        minutesLeft = minutesLeft - blockDuration
    }
    // If we ran out of time, this isn't valid.
    return null
}

const indexes: Record<string,Record<ForecastIndex,number>> = {    
    '2021': {
        [ForecastIndex.verylow]: 0,
        [ForecastIndex.low]: 50,
        [ForecastIndex.moderate]: 140, 
        [ForecastIndex.high]: 220, 
        [ForecastIndex.veryhigh]: 330
    },
    '2022': {
        [ForecastIndex.verylow]: 0,
        [ForecastIndex.low]: 45,
        [ForecastIndex.moderate]: 130, 
        [ForecastIndex.high]: 210, 
        [ForecastIndex.veryhigh]: 310
    },
    '2023': {
        [ForecastIndex.verylow]: 0,
        [ForecastIndex.low]: 40,
        [ForecastIndex.moderate]: 120, 
        [ForecastIndex.high]: 200, 
        [ForecastIndex.veryhigh]: 290
    },
    '2024': {
        [ForecastIndex.verylow]: 0,
        [ForecastIndex.low]: 35,
        [ForecastIndex.moderate]: 110, 
        [ForecastIndex.high]: 190, 
        [ForecastIndex.veryhigh]: 270
    }
}

export function getIndex(forecast: number): ForecastIndex {
    // This implements the logic from the national grid methodology document
    // Use 2024 if the year isn't in the lookup table. Update this as years get added above.
    const yearIndexes = indexes[new Date().getFullYear().toString()] || indexes['2024']
    if (forecast < yearIndexes[ForecastIndex.low]) return ForecastIndex.verylow
    if (forecast < yearIndexes[ForecastIndex.moderate]) return ForecastIndex.low
    if (forecast < yearIndexes[ForecastIndex.high]) return ForecastIndex.moderate
    if (forecast < yearIndexes[ForecastIndex.veryhigh]) return ForecastIndex.high
    return ForecastIndex.veryhigh
}
