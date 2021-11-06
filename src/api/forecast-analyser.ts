import { parseISO, differenceInMinutes, addHours } from "date-fns";

import { Forecast, ForecastIndex, PossibleTime, TimeForecast } from "./forecast-types";
import { getRunWhenHours, RunWhatRequest, RunWhenRange } from "./request-types";

const NO_FORECAST = 999999

export type Forecasts = {[key in RunWhenRange]: (PossibleTime | null)}

export function analyseForecast(req: RunWhatRequest, forecast: Forecast): { 
    forecasts: Forecasts,
    all: PossibleTime[] 
} {
    const forecasts: Forecasts = {
        [RunWhenRange.Now]: null,
        [RunWhenRange.Next8h]: null,
        [RunWhenRange.Next12h]: null,
        [RunWhenRange.Next24h]: null,
        [RunWhenRange.Whenever]: null,
    }
    const latestStartTimes: { [key in RunWhenRange]: Date} = {
        [RunWhenRange.Now]: new Date(),
        [RunWhenRange.Next8h]: addHours(new Date(), 8),
        [RunWhenRange.Next12h]: addHours(new Date(), 12),
        [RunWhenRange.Next24h]: addHours(new Date(), 24),
        [RunWhenRange.Whenever]: addHours(new Date(), 72),
    }
    let all: PossibleTime[] = []

    forecast.data.forEach((tf, ind) => {
        const calc = calcCurrentWindow(forecast.data, ind, req.duration)
        const from = parseISO(tf.from)
        const to = parseISO(tf.to)
        const fc: PossibleTime = { 
            from: from,
            instTo: to,
            instForecast: tf.intensity.forecast,
            instIndex: tf.intensity.index,
            inRange: getRunWhenHours(RunWhenRange.Whenever)
        };

        [RunWhenRange.Next24h, RunWhenRange.Next12h, RunWhenRange.Next8h].forEach((range) => {
            if (fc.from <= latestStartTimes[range]) {
                fc.inRange = getRunWhenHours(range)
            }
        })

        if (calc) {
            fc.forecast = calc.forecast 
            fc.to = calc.endTime
            fc.index = getIndex(calc.forecast)
            if (req.power) {
                fc.totalCarbon = fc.forecast * (((req.power) / 1000) * (req.duration / 60))
            }
            
            [RunWhenRange.Next8h, RunWhenRange.Next12h, RunWhenRange.Next24h, RunWhenRange.Whenever].forEach((range) => {
                if (fc.inRange <= getRunWhenHours(range) && (!forecasts[range] || calc.forecast < (forecasts[range]?.forecast || NO_FORECAST))) {
                    forecasts[range] = fc
                }
            })
            if (forecasts[RunWhenRange.Now] === null) {
                // Always use the first forecast as the 'now'
                forecasts[RunWhenRange.Now] = fc
            }
        }
        all.push(fc)
    });

    return { forecasts, all }
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
