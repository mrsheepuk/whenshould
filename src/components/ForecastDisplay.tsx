import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, LinearProgress, Typography, Tooltip as MUITooltip, Paper, Link, Dialog, DialogContent, DialogActions, Table, TableRow, TableCell, TableBody, Grid } from '@mui/material';
import { InfoOutlined, ArrowUpward, ArrowDownward, ArrowBack, ArrowForward } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Box } from '@mui/system';
import { upperFirst } from 'lodash';
import { Forecast, ForecastIndex, PossibleTime } from '../api/forecast-types';
import { explainRunWhen, getRunWhenHours, RunWhatRequest, RunWhenRange } from '../api/request-types';
import { analyseForecast, ForecastAnalysis } from '../api/forecast-analyser';

export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false)
    const [graphRange, setGraphRange] = useState<RunWhenRange>(RunWhenRange.Whenever)
    const [showForecastVisible, setShowForecastVisible] = useState<boolean>(false)
    const [showForecastMix, setShowForecastMix] = useState<{pt: PossibleTime, inst: boolean}|null>(null)
    const [forecastAnalysis, setForecastAnalysis] = useState<ForecastAnalysis|null>(null)
    const [curr, setCurr] = useState<PossibleTime|null>(null)

    useEffect(() => {
        if (!forecast || !req) {
            setForecastAnalysis(null)
            return
        }
        const fa = analyseForecast(req, forecast)
        setForecastAnalysis(fa)
        setCurr(fa.forecasts[req.when])
    }, [req, forecast])

    if (loading) {
        return (
            <>
                <LinearProgress color="success" sx={{ marginTop: '2em' }} />
                <Typography variant='caption' paragraph={true} sx={{ marginTop: '2em', fontSize: '1em' }}>Asking the National Grid elves how windy it is... and how many dinosaurs they're burning!</Typography>
            </>
        )
    }

    if (!forecast || !req || !forecastAnalysis) return null

    const { forecasts, all } = forecastAnalysis

    const best = forecasts[req.when]
    const bestOverall = forecasts[RunWhenRange.Whenever]
    const currIsBest = curr === best
    const currIsBestOverall = curr === bestOverall

    const currInd = curr ? all.findIndex((pt) => pt.from === curr.from) : -1
    const prevAvail = currInd > 0
    const nextAvail = currInd < (all.length - 1)
    const now = forecasts[RunWhenRange.Now]
    const graphDataKey = req.power && showTotalCarbon ? 'totalCarbon' : 'instForecast'
    const intensityKey = req.power && showTotalCarbon ? 'index' : 'instIndex'
    const runWhenHrs = getRunWhenHours(req.when)
    const graphHrs = getRunWhenHours(graphRange)

    const showMix = (pt: PossibleTime, inst?: boolean) => {
        setShowForecastMix({ pt, inst: inst === true })
        setShowForecastVisible(true)
    }
    const next = () => {
        if (!nextAvail) return
        setCurr(all[currInd + 1])
    }
    const prev = () => {
        if (!prevAvail) return
        setCurr(all[currInd - 1])
    }

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter(bestOverall, best) > 10
    }

    const percentBetter = (a: PossibleTime, b: PossibleTime) => {
        return 100 - (((a?.forecast || 1) / (b?.forecast || 1)) * 100)
    }

    const showIndex = (fc: PossibleTime, { inst, disableFM, hideTime } : { inst?: boolean, disableFM?: boolean, hideTime?: boolean }) => {
        const ind = (inst ? fc.instIndex : fc.index) as ForecastIndex
        const fcast = (inst ? fc.instForecast : fc.forecast) as number
        const ncast = (inst ? now?.instForecast || 0 : now?.forecast || 0)
        if (ind === undefined || fcast === undefined) {
            return null
        }
        return <>
            <Link underline='none' sx={{ cursor: 'pointer' }} color='#000' onClick={() => disableFM ? null : showMix(fc, inst===true)}>
                <div style={{ whiteSpace: 'nowrap', width: '10em', display: 'inline-block' }}>
                    {!hideTime ? (
                        <div style={{ 
                            border: '1px solid #999',
                            borderBottom: '0',
                            width: '100%',
                            padding: '0 0.5em',
                        }}>
                            <Typography variant='h6'>{format(fc.from, 'EEE HH:mm')}</Typography>
                        </div>
                    ) : null}
                    <div style={{ 
                        border: '1px solid #999',
                        borderBottom: '0',
                        width: '100%',
                        padding: '0 0.5em',
                        backgroundColor: getIntensityFill(fc, inst ? 'instIndex' : 'index'),
                        color: getIntensityForeground(fc, inst ? 'instIndex' : 'index')
                    }}>
                        <Typography variant='h6'>{upperFirst(ind)}</Typography>
                    </div>
                    <div style={{ 
                        border: '1px solid #999',
                        borderBottom: '0',
                        width: '100%',
                        padding: '0 0.5em' 
                    }}>
                        <>{fcast.toFixed(0)}g/kWh{!disableFM ? <> <InfoOutlined sx={{ paddingTop: '0.25em', marginRight: '-0.2em' }} fontSize='inherit' /></> : null}</>
                    </div>
                    <div style={{ 
                        border: '1px solid #999',
                        borderTop: '0',
                        width: '100%',
                        padding: '0 0.5em' 
                    }}>
                        {fc.totalCarbon !== undefined ? (
                        <MUITooltip title={<>Total estimated CO2 to run {req.what.owned} for {req.duration} minutes</>}>
                            <><b>{fc.totalCarbon >= 1000 ? <>{(fc.totalCarbon / 1000).toFixed(2)}kg</> : <>{fc.totalCarbon.toFixed(0)}g</>} total</b></>
                        </MUITooltip>
                        ) : null}
                        <br/>
                        {fcast !== ncast ? (<>
                            {fcast > ncast ? <ArrowUpward sx={{ paddingTop: '0.25em' }} fontSize='inherit' /> : <ArrowDownward sx={{ paddingTop: '0.25em' }} fontSize='inherit'  />}
                            {Math.abs(fc.comparedToNow || 0).toFixed(0)}%
                            {` `}{fcast > ncast ? 'above' : 'below'} now
                        </>) : <><ArrowUpward sx={{ paddingTop: '0.25em' }} fontSize='inherit' /> {fc.comparedToBest?.toFixed(0)}% above best</>}
                        {/* <br/>
                        {fc.band} - {fc.comparedToBest?.toFixed(0)}% - {fc.weightedForecast?.toFixed(0)}w-g */}
                    </div>
                </div>
            </Link>
        </>
    }

    const fcMix = showForecastMix?.inst ? showForecastMix.pt.instGenMix : showForecastMix?.pt?.genMix
    const graphData = all.filter((v) => v.inRange <= graphHrs && v.forecast !== undefined)

    return (
        <>
            <Dialog open={showForecastVisible} onClose={() => setShowForecastVisible(false)}>
                {showForecastMix ? (<>
                    <DialogContent>
                        {showForecastMix ? (
                            <>
                                <Typography variant='body2' paragraph={true}>
                                    {!showForecastMix?.inst ? <>Average impact to run {req.what.singular} for {req.duration} minutes <b>starting at</b></> : <>Details at</>}
                                    {` `}<b>{format(showForecastMix.pt.from, 'EEE HH:mm')}</b> in {forecast.postcode}:
                                </Typography>
                                <Typography variant='body2' paragraph={true} sx={{ textAlign: 'center' }}>
                                    {showIndex(showForecastMix.pt, { disableFM: true, hideTime: true })}
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
                </>) : null}
                <DialogActions>
                    <Button autoFocus onClick={() => setShowForecastVisible(false)}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {curr && now && bestOverall ? (
                <>
                    <Typography variant='body1' component='p' paragraph={true}>
                        Start {req.what.owned} at
                    </Typography>
                    {showIndex(curr, { })}
                    {/* <Typography variant='h5' component='p' paragraph={true}>
                    </Typography> */}
                    <Typography variant='body2' component='p' paragraph={true} sx={{ marginTop: '0.5em' }}>
                        {/* <b>{Math.abs(curr.comparedToNow || 0).toFixed(0)}%</b> {(curr.forecast || curr.instForecast) > (now.forecast || now.instForecast) ? 'higher than' : 'lower than'} now:<br/>{showIndex(now, { })} */}
                        {currIsBest ? 
                            <><b>Lowest CO2 emissions in the {explainRunWhen(req.when)} in {forecast.postcode}</b></>
                        : currIsBestOverall && !currIsBest ? 
                            <><b>Lowest CO2 emissions in the {explainRunWhen(RunWhenRange.Whenever)} in {forecast.postcode}</b></> 
                        : !currIsBest && !currIsBestOverall ? 
                            <><span style={{ color: 'rgba(255,255,255,0)' }}>nothing to say</span></> 
                        : null}

                    </Typography>
                    <Grid container spacing={0} columns={10}>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!prevAvail} onClick={() => prev()} sx={{ height: '100%' }}><ArrowBack /></Button></Grid>
                        <Grid item xs={2}><Button size='small' variant={curr.from===now.from ? 'contained' : 'text'} onClick={() => setCurr(now)} sx={{ height: '100%' }}>Now</Button></Grid>
                        <Grid item xs={2}><Button size='small' variant={curr.from===best?.from ? 'contained' : 'text'} onClick={() => setCurr(best)} sx={{ height: '100%' }}>Better</Button></Grid>
                        <Grid item xs={2}><Button size='small' variant={curr.from===bestOverall?.from ? 'contained' : 'text'} onClick={() => setCurr(bestOverall)} sx={{ height: '100%' }}>Best</Button></Grid>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!nextAvail} onClick={() => next()} sx={{ height: '100%' }}><ArrowForward /></Button></Grid>
                    </Grid>
                </>
            ) : (
                <Typography variant='body1'>
                    Could not identify best period to use
                </Typography>
            )}

            {overalBetter() && bestOverall && now ? (
                <Alert severity='success' sx={{ marginTop: '1em', maxWidth: '60em', marginLeft: 'auto', marginRight: 'auto' }}>
                    Save <b>{percentBetter(bestOverall, now).toFixed(0)}%</b> if you can wait 
                    {` `}until <Link onClick={() => setCurr(bestOverall)}><b>{format(bestOverall.from, 'EEEE HH:mm')}</b></Link>
                </Alert>
            ) : null}

            <Paper elevation={1} sx={{ marginTop: '1em', padding: '0.5em' }}>
                <Box sx={{ height: '25vh' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} barGap={0} barCategoryGap={-0.5}>
                            <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0} onClick={(d) => setCurr(d)}>
                                {graphData.map((entry, i) => 
                                    <Cell 
                                        key={i} 
                                        fill={i === currInd ? 'yellow' : getIntensityFill(entry, intensityKey)} 
                                        opacity={entry.inRange <= runWhenHrs ? 1 : 1} 
                                        strokeWidth={i === currInd ? 1 : 0} 
                                        stroke='black'
                                    />
                                )}
                            </Bar>
                            <CartesianGrid stroke="#ccc" strokeDasharray="2 5" />
                            <XAxis dataKey="from" 
                                tickFormatter={(t) => format(t, 'HH:mm')} 
                                minTickGap={15} 
                                interval={'preserveStart'} 
                            />
                            <YAxis unit='g' />
                            {/* <Tooltip
                                labelFormatter={(t) => format(t, 'EEEE HH:mm')}
                                formatter={(forecast: number, name: string, { payload } : { payload: PossibleTime }) => [
                                    <>
                                        {showIndex(payload, { inst: intensityKey === 'instIndex', disableFM: true })} {payload.totalCarbon ?
                                            <><br/>to run {req.what.singular} for<br />{req.duration} minutes <b>starting</b><br/> at this time</> :
                                            null
                                        }
                                    </>
                                ]} 
                            /> */}
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
