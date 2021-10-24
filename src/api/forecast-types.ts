export class Forecast {
  regionid: number
  dnoregion: string
  shortname: string
  postcode: string
  data: TimeForecast[]
}

export enum ForecastIndex {
  verylow,
  low,
  moderate,
  high,
  veryhigh
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
