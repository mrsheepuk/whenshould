import React, { useState } from 'react';
import { format } from 'date-fns';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { Checkbox, FormControlLabel, LinearProgress, Typography } from '@mui/material';
import { RunWhatRequest } from '../api/request-types';
import { findBestWindow } from '../api/forecast-analyser';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const getIntensityFill = (entry: PossibleTime, intensityKey: keyof PossibleTime) => {
    switch (entry[intensityKey]) {
        case ForecastIndex.verylow:
            return 'limegreen'
        case ForecastIndex.low:
            return 'mediumseagreen'
        case ForecastIndex.moderate:
            return '#E8A317'
        case ForecastIndex.high:
            return '#E42217'
        case ForecastIndex.veryhigh:
            return '#800000'
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
    const intensityKey = advanced && showTotalCarbon ? 'index' : 'instIndex'

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
                <BarChart data={all} barGap={0} barCategoryGap={0}>
                    <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0}>
                        {all.map((entry) => (
                            <Cell fill={getIntensityFill(entry, intensityKey)} />
                        ))}
                    </Bar>
                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                    <XAxis dataKey="from" tickFormatter={(t) => format(t, 'EEE HH:mm')} minTickGap={25} interval={'preserveStartEnd'} />
                    <YAxis unit='g' />
                    <Tooltip
                        labelFormatter={(t) => format(t, 'EEEE HH:mm')}
                        formatter={(forecast: number) => 
                            [<>
                                {forecast.toFixed(1)}g CO2{showTotalCarbon ?
                                    ` would be emitted if you run your ${req.what?.label} for ${req.what?.duration} minutes starting at this time` :
                                    'e/kWh average at this time' 
                                }
                            </>]} 
                    />
                </BarChart>
            </ResponsiveContainer>
            {advanced ? (
                <>
                    {showTotalCarbon ? 
                        <Typography>Total estimated grams CO2 emitted if you start your {req.what?.label} for {req.what?.duration} minutes at the time shown</Typography> : 
                        <Typography>Estimated g CO2e/kWh for each 30 minute period</Typography>
                    }
                    <FormControlLabel 
                        control={<Checkbox value={showTotalCarbon} onChange={(e) => setShowTotalCarbon(e.target.checked)} />} 
                        label={<>Graph total estimated grams CO2 emitted for running your {req.what?.label}</>}
                    />
                </>
            ) : null}
        </>
    )
}