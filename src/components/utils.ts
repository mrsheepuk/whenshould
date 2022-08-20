import { ForecastIndex, TimeAnalysis, Band } from "../lib/forecast-types"

export const getIntensityFill = (entry: TimeAnalysis) => {
    switch (entry.index) {
        case ForecastIndex.verylow:
            return '#89C35C'
        case ForecastIndex.low:
            return '#3EA055'
        case ForecastIndex.moderate:
            return '#E8A317'
        case ForecastIndex.high:
            return '#E42217'
        case ForecastIndex.veryhigh:
            return '#800000'
    }
    // ???
    return 'blue'
}

export const getIntensityForeground = (entry: TimeAnalysis) => {
    switch (entry.index) {
        case ForecastIndex.verylow:
            return 'white'
        case ForecastIndex.low:
            return 'white'
        case ForecastIndex.moderate:
            return 'white'
        case ForecastIndex.high:
            return 'yellow'
        case ForecastIndex.veryhigh:
            return 'yellow'
    }
    // ???
    return 'blue'
}

export const getBandFill = (entry: TimeAnalysis) => {
    switch (entry.band) {
        case Band.best:
            return '#89C35C'
        case Band.ok:
            return '#3EA055'
        case Band.notbad:
            return '#E8A317'
        case Band.avoid:
            return '#E42217'
    }
    // ???
    return 'blue'
}

export const getBandForeground = (entry: TimeAnalysis) => {
    switch (entry.band) {
        case Band.best:
            return 'white'
        case Band.ok:
            return 'white'
        case Band.notbad:
            return 'white'
        case Band.avoid:
            return 'yellow'
    }
    // ???
    return 'blue'
}
