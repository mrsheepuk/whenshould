import React from 'react';
import { format } from 'date-fns';

import { Forecast } from '../api/forecast-types';
import { LinearProgress, Typography } from '@mui/material';
import { RunWhatRequest } from '../api/request-types';
import { findBestWindow } from '../api/forecast-analyser';

export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
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

    return (
        <>
            {best ? (
                <Typography variant='body1'>
                    Best time: {best.forecast.toFixed(1)}g/kWh from <b>{format(best.from, 'EEEE HH:mm')} to {format(best.to, 'HH:mm')}</b>
                    {best.totalCarbon ? <><br/>Total carbon impact: <b>{best.totalCarbon.toFixed(0)}g</b></> : null}
                </Typography>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}
            <p>Other options:</p>
            <ul>
                {all.map((f,i) => (
                    <li key={i}>
                        {format(f.from, 'EEEE HH:mm')} (to {format(f.to, 'HH:mm')}): average: {f.forecast.toFixed(1)}g/kWh {f.totalCarbon ? ` total: ${f.totalCarbon.toFixed(0)}g` : null}
                    </li>
                ))}
            </ul>
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