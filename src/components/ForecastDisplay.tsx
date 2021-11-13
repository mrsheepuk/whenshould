import React, { useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, LinearProgress, Typography, Tooltip as MUITooltip, Paper, Link, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Box } from '@mui/system';
import { upperFirst } from 'lodash';
import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { explainRunWhen, getRunWhenHours, RunWhatRequest, RunWhenRange } from '../api/request-types';
import { analyseForecast } from '../api/forecast-analyser';

export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false)
    const [graphRange, setGraphRange] = useState<RunWhenRange>(RunWhenRange.Whenever)
    const [showForecastVisible, setShowForecastVisible] = useState<boolean>(false)
    const [showForecastMix, setShowForecastMix] = useState<{pt: PossibleTime, inst: boolean}|null>(null)

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

    const showMix = (pt: PossibleTime, inst?: boolean) => {
        setShowForecastMix({ pt, inst: inst === true })
        setShowForecastVisible(true)
    }

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter(bestOverall, best) > 10
    }

    const percentBetter = (a: PossibleTime, b: PossibleTime) => {
        return 100 - (((a?.forecast || 1) / (b?.forecast || 1)) * 100)
    }

    const showIndex = (fc: PossibleTime, inst?: boolean, disableFM?: boolean) => {
        const ind = (inst ? fc.instIndex : fc.index) as ForecastIndex
        const fcast = (inst ? fc.instForecast : fc.forecast) as number
        if (ind === undefined || fcast === undefined) {
            return null
        }
        return <>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}><span style={{ 
                    border: '1px solid #999',
                    borderRight: '0',
                    display: 'inline-block',
                    padding: '0 0.5em',
                    backgroundColor: getIntensityFill(fc, inst ? 'instIndex' : 'index'),
                    color: getIntensityForeground(fc, inst ? 'instIndex' : 'index')
                }}>{upperFirst(ind)}</span><span style={{ 
                    border: '1px solid #999',
                    borderLeft: '0',
                    display: 'inline-block', 
                    padding: '0 0.3em 0 0.5em' 
                }}>
                    {!disableFM ? (
                        <Link underline='none' sx={{ cursor: 'pointer' }} color='#000' onClick={() => showMix(fc, inst===true)}>{fcast.toFixed(0)}g/kWh <InfoOutlined sx={{ paddingTop: '0.25em' }} fontSize='inherit' /></Link> 
                    ) : (
                        <>{fcast.toFixed(0)}g/kWh</>
                    )}
                </span></span>
        </>
    }

    const fcMix = showForecastMix?.inst ? showForecastMix.pt.instGenMix : showForecastMix?.pt?.genMix

    return (
        <>
            <Dialog open={showForecastVisible} onClose={() => setShowForecastVisible(false)}>
                <DialogTitle>Power generation mix</DialogTitle>
                <DialogContent>
                    {showForecastMix ? (
                        <>
                            <Typography variant='body2' paragraph={true} sx={{ textAlign: 'center' }}>
                                {showIndex(showForecastMix.pt, false, true)}
                            </Typography>
                            <Typography variant='body2' paragraph={true}>
                                Estimated mix of power generation sources for {forecast.postcode} from {format(showForecastMix?.pt.from || new Date(), 'EEEE HH:mm')}
                                {!showForecastMix?.inst ? <> for a {req.duration}min duration</> : <></>}:
                            </Typography>
                            <Table size='small'>
                                <TableBody>
                                    {fcMix?.filter((s) => s.perc > 0.1).sort((a, b) => b.perc - a.perc).map((s, i) => 
                                        <TableRow key={i}>
                                            <TableCell>{upperFirst(s.fuel)}</TableCell>
                                            <TableCell>{s.perc.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </>
                    ) : null }
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setShowForecastVisible(false)}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {best && now ? (
                <>
                    <Typography variant='body1' component='p' paragraph={true}>
                        Start {req.what.owned} at
                    </Typography>    
                    <Typography variant='h5' component='p' paragraph={true}>
                        <b>{format(best.from, 'EEEE HH:mm')}</b><br/>
                        {showIndex(best)}
                    </Typography>    
                    <Typography variant='body2' component='p'>
                        for the lowest CO2 emissions {best.totalCarbon ? <>(total: <MUITooltip title={<>Total estimated CO2 to run {req.what.owned} for {req.duration} minutes</>}><b>{best.totalCarbon.toFixed(0)}g</b></MUITooltip>)</> : null}
                        {` `}in the {explainRunWhen(req.when)}, saving 
                        {` `}<b>{best.comparedToNow?.toFixed(0)}%</b> compared to now: {showIndex(now)}
                    </Typography>
                </>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall && now ? (
                <Alert severity='success' sx={{ marginTop: '1em', maxWidth: '60em', marginLeft: 'auto', marginRight: 'auto' }}>
                    Save <b>{percentBetter(bestOverall, now).toFixed(0)}%</b> if you wait 
                    {` `}until <b>{format(bestOverall.from, 'EEEE HH:mm')}</b> when the estimated 
                    carbon intensity drops to {showIndex(bestOverall)} {bestOverall.totalCarbon ? <> total: <b>{bestOverall.totalCarbon.toFixed(0)}g</b></> : null}
                </Alert>
            ) : null}

            <Paper elevation={1} sx={{ marginTop: '1em', padding: '0.5em' }}>
                <Box sx={{ height: '25vh' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={all.filter((v) => v.inRange <= graphHrs)} barGap={0} barCategoryGap={-0.5}>
                            <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0}>
                                {all.map((entry, i) => (
                                    <Cell key={i} fill={getIntensityFill(entry, intensityKey)} opacity={entry.inRange <= runWhenHrs ? 1 : 1} strokeWidth={0} />
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
                                        {showIndex(payload, intensityKey === 'instIndex', true)} {payload.totalCarbon ?
                                            <><br/>{payload.totalCarbon.toFixed(0)}g total to run<br/>{req.what.singular} for {req.duration} minutes<br/><b>starting</b> at this time</> :
                                            null
                                        }
                                    </>
                                ]} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
                <ButtonGroup size='small' variant='text'>
                    <Button onClick={() => setGraphRange(RunWhenRange.Next8h)} variant={graphRange !== RunWhenRange.Next8h ? undefined : 'contained'}>8h</Button>
                    <Button onClick={() => setGraphRange(RunWhenRange.Next12h)} variant={graphRange !== RunWhenRange.Next12h ? undefined : 'contained'}>12h</Button>
                    <Button onClick={() => setGraphRange(RunWhenRange.Next24h)} variant={graphRange !== RunWhenRange.Next24h ? undefined : 'contained'}>24h</Button>
                    <Button onClick={() => setGraphRange(RunWhenRange.Whenever)} variant={graphRange !== RunWhenRange.Whenever ? undefined : 'contained'}>48h</Button>
                </ButtonGroup>
                {req.power ? (
                    <>
                        <br/>
                        <ButtonGroup size='small' variant='text' sx={{ marginTop: '1em' }}>
                            <Button onClick={() => setShowTotalCarbon(false)} variant={showTotalCarbon ? undefined : 'contained'}>CO2 per kWh</Button>
                            <MUITooltip title={<>Total estimated CO2 to run {req.what.owned} for {req.duration} minutes</>}>                              
                                <Button onClick={() => setShowTotalCarbon(true)} variant={!showTotalCarbon ? undefined : 'contained'}>
                                    Total CO2 to run {req.what.name}
                                </Button>
                            </MUITooltip>
                        </ButtonGroup>
                    </>
                ) : null}
            </Paper>
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
