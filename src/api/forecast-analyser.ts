import { parseISO, differenceInMinutes, addHours } from "date-fns";

import { Forecast, ForecastIndex, GenSource, PossibleTime, TimeForecast } from "./forecast-types";
import { getRunWhenHours, RunWhatRequest, RunWhenRange } from "./request-types";

const NO_FORECAST = 999999

// We add a linear scale factor to each prediction going into the future to account for
// the lower confidence and lower convenience about that prediction 
const FUTURE_DISCOUNT = 1.002

// Percentage above best to classify as best, ok and not bad:
const BEST_BAND_PCT = 25
const OK_BAND_PCT = 50
const NOT_BAD_BAND_PCT = 75

export type Forecasts = {[key in RunWhenRange]: (PossibleTime | null)}

export interface ForecastAnalysis {
    forecasts: Forecasts,
    all: PossibleTime[]
}

export function analyseForecast(req: RunWhatRequest, forecast: Forecast): ForecastAnalysis {
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

    let adjust = 1
    forecast.data.forEach((tf, ind) => {
        const calc = calcCurrentWindow(forecast.data, ind, req.duration)
        if (!calc) return

        const from = parseISO(tf.from)
        const to = parseISO(tf.to)
        const fc: PossibleTime = { 
            from: from,
            instTo: to,
            instForecast: tf.intensity.forecast,
            instIndex: tf.intensity.index,
            instGenMix: tf.generationmix,
            inRange: getRunWhenHours(RunWhenRange.Whenever),
            forecast: calc.forecast,
            weightedForecast: calc.forecast * adjust,
            to: calc.endTime,
            index: getIndex(calc.forecast),
            genMix: calc.genMix
        };

        [RunWhenRange.Next24h, RunWhenRange.Next12h, RunWhenRange.Next8h].forEach((range) => {
            if (fc.from <= latestStartTimes[range]) {
                fc.inRange = getRunWhenHours(range)
            }
        })

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
            fc.comparedToNow = 100 - ((fc.forecast / (forecasts[RunWhenRange.Now]?.forecast || 1)) * 100)
        }

        adjust = adjust * FUTURE_DISCOUNT
        all.push(fc)
    });

    // using the best overall as our starting point (assuming we have one), we now 
    // apply a banding to all results based on how close they are to the best
    const bestOverall = forecasts[RunWhenRange.Whenever]
    if (bestOverall) {
        all.forEach((fc, i) => {
            const comparedToBest = (((fc.weightedForecast || fc.instForecast) / (bestOverall.weightedForecast || bestOverall.instForecast)) * 100) - 100
            if (comparedToBest < (BEST_BAND_PCT)) {
                all[i].band = 'best'
            } else if (comparedToBest < (OK_BAND_PCT)) {
                all[i].band = 'ok'
            } else if (comparedToBest < (NOT_BAD_BAND_PCT)) {
                all[i].band = 'notbad'
            } else {
                all[i].band = 'avoid'
            }
            all[i].comparedToBest = comparedToBest
        })
    }

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
