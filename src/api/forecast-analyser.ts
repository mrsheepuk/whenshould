import { parseISO, differenceInMinutes, addHours } from "date-fns";

import { Forecast, ForecastIndex, GenSource, PossibleTime, TimeForecast } from "./forecast-types";
import { getRunWhenHours, RunWhatRequest, RunWhenRange } from "./request-types";

const NO_FORECAST = 999999

export type Forecasts = {[key in RunWhenRange]: (PossibleTime | null)}

export function analyseForecast(req: RunWhatRequest, forecast: Forecast): { 
    forecasts: Forecasts,
    all: PossibleTime[] 
} {
    const date = req.startTime || new Date()
    const forecasts: Forecasts = {
        [RunWhenRange.Now]: null,
        [RunWhenRange.Next8h]: null,
        [RunWhenRange.Next12h]: null,
        [RunWhenRange.Next24h]: null,
        [RunWhenRange.Whenever]: null,
    }
    const latestStartTimes: { [key in RunWhenRange]: Date} = {
        [RunWhenRange.Now]: date,
        [RunWhenRange.Next8h]: addHours(date, 8),
        [RunWhenRange.Next12h]: addHours(date, 12),
        [RunWhenRange.Next24h]: addHours(date, 24),
        [RunWhenRange.Whenever]: addHours(date, 72),
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
            instGenMix: tf.generationmix,
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
            fc.genMix = calc.genMix
            if (req.power) {
                fc.totalCarbon = fc.forecast * (((req.power) / 1000) * (req.duration / 60))
            }
            
            [RunWhenRange.Next8h, RunWhenRange.Next12h, RunWhenRange.Next24h, RunWhenRange.Whenever].forEach((range) => {
                if (fc.inRange <= getRunWhenHours(range) && (!forecasts[range] || calc.forecast < (forecasts[range]?.forecast || NO_FORECAST))) {
                    forecasts[range] = fc
                }
            })
            if (forecasts[RunWhenRange.Now] === null) {
                fc.comparedToNow = 0
                // Always use the first forecast as the 'now'
                forecasts[RunWhenRange.Now] = fc
            } else {
                fc.comparedToNow = 100 - (((fc.forecast || 1) / (forecasts[RunWhenRange.Now]?.forecast || 1)) * 100)
            }
        }
        all.push(fc)
    });

    return { forecasts, all }
}

function calcCurrentWindow(possible: TimeForecast[], startIndex: number, reqDurationMins: number): { forecast: number, endTime: Date, genMix: GenSource[] } | null {
    let carbonSum = 0
    let minutesFound = 0
    let minutesLeft = reqDurationMins
    let genMix: GenSource[] = []
    for (let x = startIndex; x < possible.length; x++) {
        const blockDuration = differenceInMinutes(parseISO(possible[x].to), parseISO(possible[x].from))
        const blockIntensityPerMinute = (possible[x].intensity.forecast / 60)
        genMix = addBlockMix(genMix, possible[x], blockDuration, minutesFound)

        if (blockDuration >= minutesLeft) {
            carbonSum += blockIntensityPerMinute * minutesLeft
            return { 
                genMix: genMix,
                // Convert back to g/kwh
                forecast: (carbonSum / reqDurationMins) * 60, 
                endTime: parseISO(possible[x].to) 
            }
        }

        carbonSum += blockIntensityPerMinute * blockDuration
        minutesLeft = minutesLeft - blockDuration
        minutesFound = reqDurationMins - minutesLeft
    }
    // If we ran out of time, this isn't valid.
    return null
}

function addBlockMix(genMix: GenSource[], possible: TimeForecast, blockDuration: number, minutesFound: number): GenSource[] {
    if (!genMix || genMix.length === 0) {
        return [...possible.generationmix]
    }
    return [...genMix.map((egs) => {
        const g = possible.generationmix.find((gs) => gs.fuel === egs.fuel)
        if (g) {
            return {...egs, perc: ((((egs.perc/100) * minutesFound) + ((g.perc/100) * blockDuration)) / (minutesFound + blockDuration) * 100)}
        }
        return {...egs, perc: (((egs.perc/100) * minutesFound) / (minutesFound + blockDuration)) * 100}
    })]
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
