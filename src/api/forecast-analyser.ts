import { parseISO, differenceInMinutes, addHours } from "date-fns";

import { Forecast, ForecastIndex, PossibleTime, TimeForecast } from "./forecast-types";
import { RunWhatRequest, RunWhenRange } from "./request-types";

const NO_FORECAST = 999999

export function findBestWindow(req: RunWhatRequest, forecast: Forecast): { 
    best: PossibleTime | null, 
    bestOverall: PossibleTime | null, 
    all: PossibleTime[] 
} {
    let best: PossibleTime | null = null
    let bestOverall: PossibleTime | null = null
    let all: PossibleTime[] = []

    let endTime = addHours(new Date(), 72)
    switch (req.when) {
        case RunWhenRange.Next8h:
            endTime = addHours(new Date(), 8)
            break
        case RunWhenRange.Next12h:
            endTime = addHours(new Date(), 12)
            break
        case RunWhenRange.Next24h:
            endTime = addHours(new Date(), 24)
            break
    }

    forecast.data.forEach((tf, ind) => {
        const calc = calcCurrentWindow(forecast.data, ind, req.duration)
        const from = parseISO(tf.from)
        const to = parseISO(tf.to)
        const fc: PossibleTime = { 
            from: from,
            instTo: to,
            instForecast: tf.intensity.forecast,
            instIndex: tf.intensity.index,
            inRange: to < endTime
        }
        if (calc) {
            fc.forecast = calc.forecast 
            fc.to = calc.endTime
            fc.index = getIndex(calc.forecast)
            if (req.power) {
                fc.totalCarbon = fc.forecast * (((req.power) / 1000) * (req.duration / 60))
            }
            if (!bestOverall || fc.forecast < (bestOverall.forecast || NO_FORECAST)) {
                bestOverall = fc 
            }
            if (fc.inRange && (!best || fc.forecast < (best.forecast || NO_FORECAST))) {
                best = fc
            }
        }
        all.push(fc)
    });

    return { best, bestOverall, all }
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
