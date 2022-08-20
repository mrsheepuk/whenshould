import { parseISO, differenceInMinutes, addHours } from "date-fns";

import { Band, Forecast, GenSource, TimeAnalysis, TimeForecast } from "./forecast-types";
import { getRunWhenHours, RunWhatRequest, RunWhenRange } from "./request-types";
import { getIndex } from "./utils";

// We add a linear scale factor to each prediction going into the future to account for
// the lower confidence and lower convenience about that prediction 
const FUTURE_DISCOUNT = 1.002

// Percentage above best to classify as best, ok and not bad:
const BEST_BAND_PCT = 25
const OK_BAND_PCT = 50
const NOT_BAD_BAND_PCT = 75

const NO_FORECAST = 999999

export type Forecasts = {[key in RunWhenRange]: (TimeAnalysis | null)}

export interface ForecastAnalysis {
    forecasts: Forecasts,
    all: TimeAnalysis[],
    inst: TimeAnalysis[],
    bands: TimeAnalysis[],
}

export function analyseForecast(req: RunWhatRequest, forecast: Forecast): ForecastAnalysis {
    let result: ForecastAnalysis = {
        forecasts: {
            [RunWhenRange.Now]: null,
            [RunWhenRange.Next8h]: null,
            [RunWhenRange.Next12h]: null,
            [RunWhenRange.Next24h]: null,
            [RunWhenRange.Whenever]: null,
        },
        all: [],
        inst: [],
        bands: []
    }

    const latestStartTimes = getLatestStartTimes(req.startTime)
    let adjust = 1
    forecast.data.forEach((tf, ind) => {
        const from = parseISO(tf.from)
        const to = parseISO(tf.to)

        const calc = calcForecast(forecast.data, ind, req.duration)
        if (!calc) return

        const i: TimeAnalysis = { 
            from: from,
            to: to,
            forecast: tf.intensity.forecast,
            weightedForecast: tf.intensity.forecast * adjust,
            index: tf.intensity.index,
            generationmix: tf.generationmix,
            inRange: getRunWhenHours(RunWhenRange.Whenever),
        };

        const fc: TimeAnalysis = { 
            from: from,
            to: calc.endTime,
            forecast: calc.forecast,
            weightedForecast: calc.forecast * adjust,
            index: getIndex(calc.forecast),
            generationmix: calc.genMix,
            inRange: getRunWhenHours(RunWhenRange.Whenever),
            totalCarbon: req.power ? calc.forecast * ((req.power / 1000) * (req.duration / 60)) : undefined
        };
        
        setRanges(latestStartTimes, result, fc, i)

        adjust = adjust * FUTURE_DISCOUNT
        result.all.push(fc)
        result.inst.push(i)
    });

    applyBandings(result, req)

    return result
}

function calcForecast(forecastData: TimeForecast[], startIndex: number, reqDurationMins: number): 
        { forecast: number, endTime: Date, genMix: GenSource[] } | null {
    let carbonSum = 0, minutesFound = 0, minutesLeft = reqDurationMins
    let genMix: GenSource[] = []
    for (let x = startIndex; x < forecastData.length; x++) {
        const blockDuration = differenceInMinutes(parseISO(forecastData[x].to), parseISO(forecastData[x].from))
        const blockIntensityPerMinute = (forecastData[x].intensity.forecast / 60)
        genMix = addBlockMix(genMix, forecastData[x], blockDuration, minutesFound)

        if (blockDuration >= minutesLeft) {
            carbonSum += blockIntensityPerMinute * minutesLeft
            return { 
                genMix: genMix,
                // Convert back to g/kwh
                forecast: (carbonSum / reqDurationMins) * 60, 
                endTime: parseISO(forecastData[x].to) 
            }
        }

        carbonSum += blockIntensityPerMinute * blockDuration
        minutesLeft = minutesLeft - blockDuration
        minutesFound = reqDurationMins - minutesLeft
    }

    // If we ran out of time, this isn't valid.
    return null
}

function addBlockMix(genMix: GenSource[], tf: TimeForecast|TimeAnalysis, blockDuration: number, minutesFound: number): GenSource[] {
    if (!genMix || genMix.length === 0) {
        return [...tf.generationmix]
    }
    return [...genMix.map((egs) => {
        const g = tf.generationmix.find((gs) => gs.fuel === egs.fuel)
        if (g) {
            return {...egs, perc: ((((egs.perc/100) * minutesFound) + ((g.perc/100) * blockDuration)) / (minutesFound + blockDuration) * 100)}
        }
        return {...egs, perc: (((egs.perc/100) * minutesFound) / (minutesFound + blockDuration)) * 100}
    })]
}

function setRanges(latestStartTimes: { [key in RunWhenRange]: Date}, result: ForecastAnalysis, fc: TimeAnalysis, i: TimeAnalysis) {
    // Go down the ranges, so setting the shortest range the forecast is inside
    [RunWhenRange.Next24h, RunWhenRange.Next12h, RunWhenRange.Next8h].forEach((range) => {
        if (fc.from <= latestStartTimes[range]) {
            fc.inRange = getRunWhenHours(range)
            i.inRange = fc.inRange
        }
    });

    // Go up the ranges and see if this forecast is the best for any of them
    [RunWhenRange.Next8h, RunWhenRange.Next12h, RunWhenRange.Next24h, RunWhenRange.Whenever].forEach((range) => {
        if (fc.inRange <= getRunWhenHours(range) && (!result.forecasts[range] || fc.forecast < (result.forecasts[range]?.forecast || NO_FORECAST))) {
            result.forecasts[range] = fc
        }
    })

    // Set the comparison to the current time (or record the current time if
    // this is the first forecast we've checked)
    if (result.forecasts[RunWhenRange.Now] === null) {
        fc.comparedToNow = 0
        // Always use the first forecast as the 'now'
        result.forecasts[RunWhenRange.Now] = fc
    } else {
        fc.comparedToNow = 100 - ((fc.forecast / (result.forecasts[RunWhenRange.Now]?.forecast || 1)) * 100)
        i.comparedToBest = 100 - ((i.forecast / (result.forecasts[RunWhenRange.Now]?.forecast || 1)) * 100)
    }
}

function applyBandings(result: ForecastAnalysis, req: RunWhatRequest) {
    const bestOverall = result.forecasts[RunWhenRange.Whenever]
    if (!bestOverall) return

    // using the best overall as our starting point (assuming we have one), we now 
    // apply a banding to all results based on how close they are to the best
    result.all.forEach((fc, i) => {
        const comparedToBest = ((fc.weightedForecast / bestOverall.weightedForecast) * 100) - 100
        if (comparedToBest < (BEST_BAND_PCT)) {
            result.all[i].band = Band.best
        } else if (comparedToBest < (OK_BAND_PCT)) {
            result.all[i].band = Band.ok
        } else if (comparedToBest < (NOT_BAD_BAND_PCT)) {
            result.all[i].band = Band.notbad
        } else {
            result.all[i].band = Band.avoid
        }
        result.all[i].comparedToBest = comparedToBest
    })

    // work out aggregate time bands
    let currBand: TimeAnalysis|null = null
    result.all.forEach((_, i) => {
        if (!currBand) {
            currBand = {...result.all[i]}
        } else if (currBand.band !== result.all[i].band) {
            result.bands.push(currBand)
            const fromTime = currBand.to
            currBand = {...result.all[i], from: fromTime}
        } else {
            // Update curr band averages
            const bandDuration = differenceInMinutes(currBand.from, result.all[i].from)
            const thisDuration = 30
            currBand.generationmix = addBlockMix(currBand.generationmix, result.all[i], thisDuration, bandDuration)
            currBand.forecast = (
                (
                    ((currBand.forecast / 60) * bandDuration) + 
                    ((result.all[i].forecast / 60) * thisDuration)
                ) / (bandDuration + thisDuration)
            ) * 60
            currBand.to = result.all[i].from
            currBand.index = getIndex(currBand.forecast)
            if (req.power) {
                currBand.totalCarbon = currBand.forecast * (((req.power) / 1000) * (req.duration / 60))
            }
        }
    })
    if (currBand) {
        result.bands.push(currBand)
    }
}

function getLatestStartTimes(date: Date) : { [key in RunWhenRange]: Date} {
    return {
       [RunWhenRange.Now]: date,
       [RunWhenRange.Next8h]: addHours(date, getRunWhenHours(RunWhenRange.Next8h)),
       [RunWhenRange.Next12h]: addHours(date, getRunWhenHours(RunWhenRange.Next12h)),
       [RunWhenRange.Next24h]: addHours(date, getRunWhenHours(RunWhenRange.Next24h)),
       [RunWhenRange.Whenever]: addHours(date, 72),
   }    
}
