import { parseISO, differenceInMinutes } from "date-fns";
import { Forecast, IdealTime as PossibleTime, TimeForecast } from "./forecast-types";
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
            const fc: PossibleTime = { forecast: tf.intensity.forecast, from:  parseISO(tf.from), to: parseISO(tf.to) }
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
            const fc: PossibleTime = { forecast: calc.forecast, from: from, to: calc.endTime }
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
