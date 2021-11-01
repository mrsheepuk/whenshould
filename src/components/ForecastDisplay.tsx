import React, { useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, FormControl, FormControlLabel, LinearProgress, Radio, RadioGroup, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { explainRunWhen, RunWhatRequest, RunWhenRange } from '../api/request-types';
import { findBestWindow } from '../api/forecast-analyser';

export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false)
    const [graphAll, setGraphAll] = useState<boolean>(true)

    if (loading) {
        return (
            <>
                <LinearProgress color="success" sx={{ marginTop: '2em' }} />
                <Typography variant='caption' paragraph={true} sx={{ marginTop: '2em', fontSize: '1em' }}>Asking the National Grid elves how windy it is... and how many dinosaurs they're burning!</Typography>
            </>
        )

    }

    if (!forecast || !req) return null

    const { best, bestOverall, all } = findBestWindow(req, forecast)
    const graphDataKey = req.power && showTotalCarbon ? 'totalCarbon' : 'instForecast'
    const intensityKey = req.power && showTotalCarbon ? 'index' : 'instIndex'
    const getDevice = () => {
        return req.what?.label || 'device'
    }

    const showBest = (b: PossibleTime) => (
        <>
            <Typography variant='h5' component='p' paragraph={true}>
                Start your {getDevice()} at
            </Typography>    
            <Typography variant='h4' component='p' paragraph={true}>
                <b>{format(b.from, 'EEEE HH:mm')}</b>
            </Typography>    
            <Typography variant='h5' component='p' paragraph={true}>
                for the lowest carbon emissions during the {explainRunWhen(req.when)}
                {` `}in {forecast.postcode}
            </Typography>
            <Typography variant='subtitle1'>
                Estimated carbon intensity: <b>{b.forecast?.toFixed(0)}g CO2e/kWh</b>
                {b.totalCarbon ? (
                    <> - Total emissions: <b>{b.totalCarbon.toFixed(0)}g CO2</b></>
                ) : null}
            </Typography>
        </>
    )

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter() > 10
    }

    const percentBetter = () => {
        return 100 - (((bestOverall?.forecast || 1) / (best?.forecast || 1)) * 100)
    }

    return (
        <>
            {best ? showBest(best) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall ? (
                <Alert severity='success' sx={{ marginTop: '1em', marginBottom: '1em' }}>
                    You could save {percentBetter().toFixed(0)}% more CO2 if you wait 
                    {` `}until <b>{format(bestOverall.from, 'EEEE HH:mm')}</b> when the estimated 
                    carbon intensity drops to {bestOverall.forecast?.toFixed(0)}g CO2e/kWh
                    {bestOverall.totalCarbon ? <> - total emissions: <b>{bestOverall.totalCarbon.toFixed(0)}g CO2</b></> : null}.
                </Alert>
            ) : null}

            {req.power ? (
                <FormControl component="fieldset">
                    <RadioGroup aria-label="graph estimated" name="row-radio-buttons-group" 
                            value={showTotalCarbon ? 'true' : 'false'} 
                            onChange={(e) => setShowTotalCarbon(e.target.value==='true')}>
                        <FormControlLabel value='false' control={<Radio />} label="Show g CO2e/kWh for every 30 minutes" />
                        <FormControlLabel value='true' control={<Radio />} label={`Show total CO2 to run your ${getDevice()}`} />
                    </RadioGroup>
                </FormControl>
            ) : null}
            {req.when !== RunWhenRange.Whenever ? (
                <ButtonGroup variant='outlined' sx={{ marginBottom: '1em' }}>
                    <Button onClick={() => setGraphAll(!graphAll)} variant={graphAll ? 'outlined' : 'contained'}>{explainRunWhen(req.when)}</Button>
                    <Button onClick={() => setGraphAll(!graphAll)} variant={!graphAll ? 'outlined' : 'contained'}>All data (48 hours)</Button>
                </ButtonGroup>
            ) : null}

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={all.filter((v) => graphAll || v.inRange)} barGap={0} barCategoryGap={0}>
                    <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0}>
                        {all.map((entry) => (
                            <Cell fill={getIntensityFill(entry, intensityKey)} opacity={entry.inRange ? 1 : 0.5} />
                        ))}
                    </Bar>
                    <CartesianGrid stroke="#ccc" strokeDasharray="2 5" />
                    <XAxis dataKey="from" 
                        tickFormatter={(t) => format(t, 'HH:mm')} 
                        minTickGap={15} 
                        interval={'preserveStart'} 
                    />
                    <YAxis unit='g' />
                    <Tooltip
                        labelFormatter={(t) => format(t, 'EEEE HH:mm')}
                        formatter={(forecast: number) => [
                            <>
                                {forecast.toFixed(0)}g CO2{showTotalCarbon ?
                                    <> to run your <br/>{getDevice()} for {req.duration} minutes<br/><b>starting</b> at this time</> :
                                    'e/kWh average at this time' 
                                }
                            </>
                        ]} 
                    />
                </BarChart>
            </ResponsiveContainer>
            {req.power ? (
                <>
                    {showTotalCarbon ? 
                        <Typography>Total estimated grams CO2 emitted if you start your {getDevice()} for {req.duration} minutes at the time shown</Typography> : 
                        <Typography>Estimated g CO2e/kWh for each 30 minute period</Typography>
                    }
                </>
            ) : null}
        </>
    )
}

const getIntensityFill = (entry: PossibleTime, intensityKey: keyof PossibleTime) => {
    switch (entry[intensityKey]) {
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
