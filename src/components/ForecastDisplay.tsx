import React, { useState } from 'react';
import { format } from 'date-fns';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { FormControl, FormControlLabel, FormLabel, LinearProgress, Radio, RadioGroup, Typography } from '@mui/material';
import { explainRunWhen, RunWhatRequest } from '../api/request-types';
import { findBestWindow } from '../api/forecast-analyser';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
                <Typography variant='caption'>Asking the National Grid elves how windy it is... and how many dinosaurs they're burning!</Typography>
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
                The time with the lowest carbon impact to start your {getDevice()}
                {` `}in {forecast.postcode}
                {` `}in the {explainRunWhen(req.when)}
                {` `}is {b.to ? 'from' : 'at'} <b>{format(b.from, 'EEEE HH:mm')}</b>
                {` `}{b.to ? <>(running until {format(b.to, 'HH:mm')})</> : null}
            </Typography>
            <Typography variant='subtitle1' component='p' paragraph={true}>
                Estimated carbon intensity: {b.forecast?.toFixed(1)}g CO2e/kWh
                {b.totalCarbon ? <> | Total estimated emissions: <b>{b.totalCarbon.toFixed(0)}g CO2e</b></> : null}
            </Typography>
        </>
    )

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter() > 10
    }

    const percentBetter = () => {
        return ((bestOverall?.forecast || 1) / (best?.forecast || 1)) * 100
    }

    return (
        <>
            {best ? showBest(best) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall ? (
                <>
                    <Typography variant='h5' component='p' paragraph={true}>
                        You could save {percentBetter().toFixed(0)}% further carbon by waiting to run your {getDevice()} 
                        {` `}until <b>{format(bestOverall.from, 'EEEE HH:mm')}</b>.
                    </Typography>
                    <Typography variant='subtitle1' component='p' paragraph={true}>
                        At this time, the estimated carbon intensity is: {bestOverall.forecast?.toFixed(1)}g CO2e/kWh
                        {bestOverall.totalCarbon ? <> | Total estimated emissions: <b>{bestOverall.totalCarbon.toFixed(0)}g CO2e</b></> : null}
                    </Typography>
                </>
            ) : null}

            {req.power ? (
                <FormControl component="fieldset">
                    <FormLabel component="legend">Show estimated:</FormLabel>
                    <RadioGroup row aria-label="graph" name="row-radio-buttons-group" 
                            value={showTotalCarbon ? 'true' : 'false'} 
                            onChange={(e) => setShowTotalCarbon(e.target.value==='true')}>
                        <FormControlLabel value='false' control={<Radio />} label="g CO2e/kWh for each 30 minute period" />
                        <FormControlLabel value='true' control={<Radio />} label={`g CO2 total for running your ${getDevice()}`} />
                    </RadioGroup>
                </FormControl>
            ) : null}
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={all} barGap={0} barCategoryGap={0}>
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
