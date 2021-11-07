import React, { useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, FormControl, FormControlLabel, LinearProgress, Radio, RadioGroup, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { explainRunWhen, getRunWhenHours, RunWhatRequest, RunWhenRange } from '../api/request-types';
import { analyseForecast } from '../api/forecast-analyser';
import { Box } from '@mui/system';

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

    const showIndex = (fc: PossibleTime, showInst?: boolean) => {
        const ind = showInst ? fc.instIndex : fc.index
        if (ind === undefined) {
            return null
        }
        return <>{ind}</>
    }

    return (
        <>
            {best && now ? (
                <>
                    <Typography variant='body1' component='p' paragraph={true}>
                        CO2 emissions for {forecast.postcode} are currently <b>{showIndex(now)}</b>
                        {` `}({now.forecast?.toFixed(0)}g per kWh) - save 
                        {` `}{best.comparedToNow?.toFixed(0)}% by starting {req.what.owned} at
                    </Typography>    
                    <Typography variant='h5' component='p' paragraph={true}>
                        <b>{format(best.from, 'EEEE HH:mm')}</b>
                    </Typography>    
                    <Typography variant='body1' component='p' paragraph={true}>
                        for the lowest CO2 emissions during the {explainRunWhen(req.when)} - 
                        {` `}<b>{showIndex(best)}</b> ({best.forecast?.toFixed(0)}g per kWh)
                    </Typography>
                    {best.totalCarbon ? (
                    <Typography variant='body1'>
                            <>Total emissions: <b>{best.totalCarbon.toFixed(0)}g CO2</b></>
                    </Typography>
                    ) : null}
                    </>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall && best ? (
                <Alert severity='success' sx={{ marginTop: '1em', marginBottom: '1em' }}>
                    Save a further {percentBetter(bestOverall, best).toFixed(0)}% if you wait 
                    {` `}until <b>{format(bestOverall.from, 'EEEE HH:mm')}</b> when the estimated 
                    carbon intensity drops to <b>{showIndex(bestOverall)}</b> ({bestOverall.forecast?.toFixed(0)}g CO2e/kWh)
                    {bestOverall.totalCarbon ? <><br />Total emissions: <b>{bestOverall.totalCarbon.toFixed(0)}g CO2</b></> : null}.
                </Alert>
            ) : null}

            {req.power ? (
                <>
                    <FormControl component="fieldset">
                        <RadioGroup aria-label="graph estimated" name="row-radio-buttons-group" 
                                value={showTotalCarbon ? 'true' : 'false'} 
                                onChange={(e) => setShowTotalCarbon(e.target.value==='true')}>
                            <FormControlLabel value='false' control={<Radio />} label="Show g CO2e/kWh for every 30 minutes" />
                            <FormControlLabel value='true' control={<Radio />} label={`Show total CO2 to run ${req.what.owned}`} />
                        </RadioGroup>
                    </FormControl>
                    <br/>
                </>
            ) : null}

            <ButtonGroup variant='outlined' sx={{ marginBottom: '1em' }}>
                <Button onClick={() => setGraphRange(RunWhenRange.Next8h)} variant={graphRange !== RunWhenRange.Next8h ? 'outlined' : 'contained'}>8h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Next12h)} variant={graphRange !== RunWhenRange.Next12h ? 'outlined' : 'contained'}>12h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Next24h)} variant={graphRange !== RunWhenRange.Next24h ? 'outlined' : 'contained'}>24h</Button>
                <Button onClick={() => setGraphRange(RunWhenRange.Whenever)} variant={graphRange !== RunWhenRange.Whenever ? 'outlined' : 'contained'}>48h</Button>
            </ButtonGroup>

            <Box sx={{ height: '25vh'}}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={all.filter((v) => v.inRange <= graphHrs)} barGap={0} barCategoryGap={0}>
                    <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0}>
                        {all.map((entry, i) => (
                            <Cell key={i} fill={getIntensityFill(entry, intensityKey)} opacity={entry.inRange <= runWhenHrs ? 1 : 0.5} />
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
                                <b>{showIndex(payload, intensityKey==='instIndex')}</b> ({payload.forecast?.toFixed(0)}g{showTotalCarbon ?
                                    <>) to run<br/>{req.what.singular} for {req.duration} minutes<br/><b>starting</b> at this time</> :
                                    <> per kWh)</>
                                }
                            </>
                        ]} 
                    />
                </BarChart>
            </ResponsiveContainer>
            </Box>
            {req.power ? (
                <>
                    {showTotalCarbon ? 
                        <Typography>Total estimated grams CO2 emitted if you start {req.what.singular} for {req.duration} minutes at the time shown</Typography> : 
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
