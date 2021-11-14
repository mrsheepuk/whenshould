export class Forecast {
  regionid: number
  dnoregion: string
  shortname: string
  postcode: string
  data: TimeForecast[]
}

export enum ForecastIndex {
  verylow = 'very low',
  low = 'low',
  moderate = 'moderate',
  high = 'high',
  veryhigh = 'very high'
}

export class TimeForecast {
  from: string
  to: string
  intensity: {
    forecast: number
    index: ForecastIndex
  }
  generationmix: GenSource[]
}

export class GenSource {
  fuel: string
  perc: number
}

export class PossibleTime {
  from: Date
  instTo: Date
  instForecast: number
  instIndex: ForecastIndex
  instGenMix: GenSource[]
  inRange: number

  to: Date
  forecast: number
  /**
   * The weighted forecast is the forecast discounted by the further into the 
   * future it is, this accounts for the lower confidence and lower convenience
   * of waiting further into the future.
   */
  weightedForecast: number
  genMix: GenSource[]
  index: ForecastIndex
  totalCarbon?: number
  comparedToNow?: number
  comparedToBest?: number
  band?: 'best'|'ok'|'notbad'|'avoid'
}