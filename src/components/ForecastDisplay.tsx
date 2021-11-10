import React, { useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, FormControl, FormControlLabel, LinearProgress, Radio, RadioGroup, Typography, Tooltip as MUITooltip } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Box } from '@mui/system';
import { upperFirst } from 'lodash';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { explainRunWhen, getRunWhenHours, RunWhatRequest, RunWhenRange } from '../api/request-types';
import { analyseForecast } from '../api/forecast-analyser';

export function ForecastDisplay({ req, forecast, loading, onChangeOptions } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
    onChangeOptions: (req: RunWhatRequest) => void,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false)
    const [graphRange, setGraphRange] = useState<RunWhenRange>(RunWhenRange.Whenever)

    if (loading) {
        return (
            <>
                <LinearProgress color="success" sx={{ marginTop: '2em' }} />
                <Typography variant='caption' paragraph={true} sx={{ marginTop: '2em', fontSize: '1em' }}>Asking the National Grid elves how windy it is... and how many dinosaurs they're burning!</Typography>
            </>
        )

    }

    if (!forecast || !req) return null

    const { forecasts, all } = analyseForecast(req, forecast)

    const best = forecasts[req.when]
    const bestOverall = forecasts[RunWhenRange.Whenever]
    const now = forecasts[RunWhenRange.Now]
    const graphDataKey = req.power && showTotalCarbon ? 'totalCarbon' : 'instForecast'
    const intensityKey = req.power && showTotalCarbon ? 'index' : 'instIndex'
    const runWhenHrs = getRunWhenHours(req.when)
    const graphHrs = getRunWhenHours(graphRange)

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter(bestOverall, best) > 10
    }

    const percentBetter = (a: PossibleTime, b: PossibleTime) => {
        return 100 - (((a?.forecast || 1) / (b?.forecast || 1)) * 100)
    }

    const showIndex = (fc: PossibleTime, instind?: keyof PossibleTime, forecastind?: keyof PossibleTime) => {
        const ind = (instind ? fc[instind] : fc.index) as ForecastIndex
        const fcast = (forecastind ? fc[forecastind] : fc.forecast) as number
        if (ind === undefined || fcast === undefined) {
            return null
        }
        return <>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}><span style={{ 
                    border: '1px solid #999',
                    borderRight: '0',
                    display: 'inline-block',
                    padding: '0 0.5em',
                    boxSizing: 'unset',
                    backgroundColor: getIntensityFill(fc, instind || 'index'), 
                    color: getIntensityForeground(fc, instind || 'index')
                }}>{upperFirst(ind)}</span><span style={{ 
                    border: '1px solid #999',
                    borderLeft: '0',
                    display: 'inline-block', 
                    boxSizing: 'unset',
                    padding: '0 0.5em' 
                }}>{fcast.toFixed(0)}g/kWh</span></span>
        </>
    }

    return (
        <>
            {best && now ? (
                <>
                    <Typography variant='body1' component='p' paragraph={true}>
                        CO2 emissions are currently {showIndex(now)}<br/>
                        Save <b>{best.comparedToNow?.toFixed(0)}%</b> by starting {req.what.owned} at:
                    </Typography>    
                    <Typography variant='h5' component='p' paragraph={true}>
                        <b>{format(best.from, 'EEEE HH:mm')}</b><br/>
                        {showIndex(best)}
                    </Typography>    
                    <Typography variant='body1' component='p' paragraph={true}>
                        This is the lowest emissions {best.totalCarbon ? <>(total: <MUITooltip title={<>Total estimated CO2 to run {req.what.owned} for {req.duration} minutes</>}><b>{best.totalCarbon.toFixed(0)}g</b></MUITooltip>)</> : null}
                        {` `}during the {explainRunWhen(req.when)} for {forecast.postcode}
                    </Typography>
                    </>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall && now ? (
                <Alert severity='success' sx={{ marginTop: '1em', marginBottom: '1em', maxWidth: '60em', marginLeft: 'auto', marginRight: 'auto' }}>
                    Save <b>{percentBetter(bestOverall, now).toFixed(0)}%</b> CO2 if you wait 
                    {` `}until <b>{format(bestOverall.from, 'EEEE HH:mm')}</b> when the estimated 
                    carbon intensity drops to {showIndex(bestOverall)} {bestOverall.totalCarbon ? <> total: <b>{bestOverall.totalCarbon.toFixed(0)}g</b></> : null}
                </Alert>
            ) : null}

            <Box sx={{ height: '25vh'}}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={all.filter((v) => v.inRange <= graphHrs)} barGap={0} barCategoryGap={0}>
                    <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0}>
                        {all.map((entry, i) => (
                            <Cell key={i} fill={getIntensityFill(entry, intensityKey)} opacity={entry.inRange <= runWhenHrs ? 1 : 0.7} />
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
                        formatter={(forecast: number, name: string, { payload } : { payload: PossibleTime }) => [
                            <>
                                {showIndex(payload, intensityKey)} {payload.totalCarbon ?
                                    <><br/>{payload.totalCarbon.toFixed(0)}g total to run<br/>{req.what.singular} for {req.duration} minutes<br/><b>starting</b> at this time</> :
                                    null
                                }
                            </>
                        ]} 
                    />
                </BarChart>
            </ResponsiveContainer>
            </Box>
            {req.power ? (
                <FormControl component="fieldset" sx={{ marginRight: '1em' }}>
                    <RadioGroup row aria-label="graph estimated" name="row-radio-buttons-group" 
                            value={showTotalCarbon ? 'true' : 'false'} 
                            onChange={(e) => setShowTotalCarbon(e.target.value==='true')}>
                        <FormControlLabel value='false' control={<Radio />} label="g/kWh for every 30 minutes" />
                        <FormControlLabel value='true' control={<Radio />} label={`Total CO2 to run ${req.what.owned}`} />
                    </RadioGroup>
                </FormControl>
            ) : null}
            <ButtonGroup variant='outlined'>
                <Button onClick={() => setGraphRange(RunWhenRange.Next8h)} variant={graphRange !== RunWhenRange.Next8h ? 'outlined' : 'contained'}>8h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Next12h)} variant={graphRange !== RunWhenRange.Next12h ? 'outlined' : 'contained'}>12h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Next24h)} variant={graphRange !== RunWhenRange.Next24h ? 'outlined' : 'contained'}>24h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Whenever)} variant={graphRange !== RunWhenRange.Whenever ? 'outlined' : 'contained'}>48h</Button>
            </ButtonGroup>
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

const getIntensityForeground = (entry: PossibleTime, intensityKey: keyof PossibleTime) => {
    switch (entry[intensityKey]) {
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
