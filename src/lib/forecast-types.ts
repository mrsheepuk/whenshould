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

export enum Band {
  best = 'best',
  ok = 'ok',
  notbad = 'notbad',
  avoid = 'avoid'
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

export class TimeAnalysis {
  from: Date
  to: Date
  forecast: number
  /**
   * The weighted forecast is the forecast discounted by the further into the 
   * future it is, this accounts for the lower confidence and lower convenience
   * of waiting further into the future.
   */
  weightedForecast: number
  inRange: number
  generationmix: GenSource[]
  index: ForecastIndex
  band?: Band
  totalCarbon?: number
  comparedToNow?: number
  comparedToBest?: number
}
