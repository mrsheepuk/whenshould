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
  inRange: number

  to?: Date
  forecast?: number
  index?: ForecastIndex
  totalCarbon?: number
}