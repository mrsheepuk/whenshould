import React, { useState } from 'react';
import { format } from 'date-fns';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { Checkbox, FormControlLabel, LinearProgress, Typography } from '@mui/material';
import { RunWhatRequest } from '../api/request-types';
import { findBestWindow } from '../api/forecast-analyser';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const getIntensityFill = (entry: PossibleTime) => {
    switch (entry.index) {
        case ForecastIndex.verylow:
            return 'green'
        case ForecastIndex.low:
            return 'green'
        case ForecastIndex.moderate:
            return 'yellow'
        case ForecastIndex.high:
            return 'orange'
        case ForecastIndex.veryhigh:
            return 'red'
    }
    // ???
    console.log(entry)
    return 'blue'
}


export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false)

    if (loading) {
        return (
            <>
                <LinearProgress color="success" />
                <Typography variant='caption'>Asking the National Grid elves how windy it is...</Typography>
            </>
        )

    }

    if (!forecast || !req) return null

    const { best, all } = findBestWindow(req, forecast)
    const advanced = req.what?.duration && req.what?.power
    const graphDataKey = advanced && showTotalCarbon ? 'totalCarbon' : 'instForecast'

    return (
        <>
            {best ? (
                <>
                    <Typography variant='h5' component='p' paragraph={true}>
                        The time with the lowest carbon {advanced ? `impact to start your ${req.what?.label}` : 'intensity'} is {advanced ? 'from' : 'at'} <b>{format(best.from, 'EEEE HH:mm')}</b> {advanced ? <>(running until {format(best.to, 'HH:mm')})</> : null}
                    </Typography>
                    <Typography variant='subtitle1' component='p' paragraph={true}>
                        Estimated carbon intensity: {best.forecast.toFixed(1)}g CO2e/kWh
                        {best.totalCarbon ? <> | Total estimated emissions: <b>{best.totalCarbon.toFixed(0)}g CO2e</b></> : null}
                    </Typography>
                </>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={all}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="red" stopOpacity={1}/>
                            <stop offset="95%" stopColor="forestgreen" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    <Bar type="monotone" dataKey={graphDataKey} stroke="#8884d8" fill="url(#colorUv)">
                        {all.map((entry, index) => (
                            <Cell fill={getIntensityFill(entry)} />
                        ))}
                    </Bar>
                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                    <XAxis dataKey="from" tickFormatter={(t) => format(t, 'EEE HH:mm')} minTickGap={10} />
                    <YAxis unit='g' />
                    <Tooltip
                        labelFormatter={(t) => format(t, 'EEEE HH:mm')}
                        formatter={(forecast: number) => 
                            [<>
                                {forecast.toFixed(1)}g CO2e {showTotalCarbon ?
                                    `would be emitted if you run your ${req.what?.label} for ${req.what?.duration} minutes starting at this time` :
                                    '/kWh average at this time' 
                                }
                            </>]} 
                    />
                </BarChart>
            </ResponsiveContainer>
            {advanced ? (
                <>
                    {showTotalCarbon ? 
                        <Typography>Total grams CO2 emitted if you start your {req.what?.label} for {req.what?.duration} minutes at the time shown</Typography> : 
                        <Typography>Estimated g CO2e/kWh for every 30 minutes</Typography>
                    }
                    <FormControlLabel 
                        control={<Checkbox value={showTotalCarbon} onChange={(e) => setShowTotalCarbon(e.target.checked)} />} 
                        label={<>Show total estimated grams CO2 emitted for running your {req.what?.label}</>}
                    />
                </>
            ) : null}
            {/* <ul>
                {all.map((f,i) => (
                    <li key={i}>
                        {format(f.from, 'EEEE HH:mm')} (to {format(f.to, 'HH:mm')}): average: {f.forecast.toFixed(1)}g/kWh {f.totalCarbon ? ` total: ${f.totalCarbon.toFixed(0)}g` : null}
                    </li>
                ))}
            </ul> */}
            {/* Forecast:
            <ul>
                {forecast.data.map((f) => (
                    <li key={f.from}>
                        {format(parseISO(f.from), 'EEEE HH:mm')} to {format(parseISO(f.to), 'EEEE HH:mm')}: {f.intensity.forecast} ({f.intensity.index})
                    </li>
                ))}
            </ul> */}
        </>
    )
}