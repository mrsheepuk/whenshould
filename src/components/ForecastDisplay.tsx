import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Alert, Button, ButtonGroup, LinearProgress, Typography, Tooltip as MUITooltip, Paper, Link, Dialog, DialogContent, DialogActions, Table, TableRow, TableCell, TableBody, Grid } from '@mui/material';
import { ArrowBack, ArrowForward, ArrowLeft, ArrowRight, Forward30, Replay30, SkipNext, SkipPrevious } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Box } from '@mui/system';
import { upperFirst } from 'lodash';

import { Forecast, TimeAnalysis } from '../lib/forecast-types';
import { explainRunWhen, getRunWhenHours, RunWhatRequest, RunWhenRange } from '../lib/request-types';
import { analyseForecast, ForecastAnalysis } from '../lib/forecast-analyser';
import { getIntensityFill } from './utils';
import { TimeInfo } from './TimeInfo';

export function ForecastDisplay({ req, forecast, loading } : { 
    req?: RunWhatRequest, 
    forecast?: Forecast, 
    loading: boolean,
}) {
    const [showTotalCarbon, setShowTotalCarbon] = useState<boolean>(false) //req?.power !== undefined)
    const [graphRange, setGraphRange] = useState<RunWhenRange>(RunWhenRange.Whenever)
    const [showForecastVisible, setShowForecastVisible] = useState<boolean>(false)
    const [showForecastMix, setShowForecastMix] = useState<{pt: TimeAnalysis, inst: boolean}|null>(null)
    const [forecastAnalysis, setForecastAnalysis] = useState<ForecastAnalysis|null>(null)
    const [curr, setCurr] = useState<TimeAnalysis|null>(null)

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

    const { forecasts, all, bands } = forecastAnalysis

    const now = forecasts[RunWhenRange.Now]
    const best = forecasts[req.when]
    const bestOverall = forecasts[RunWhenRange.Whenever]
    const bestIsNow = now === best
    const currIsBest = curr === best
    const currIsBestOverall = curr === bestOverall

    const currInd = curr ? all.findIndex((pt) => pt.from === curr.from) : -1
    const currBand = curr ? bands.find((b) => b.from <= curr.from && b.to > curr.from) : null
    const prevAvail = currInd > 0
    const nextAvail = currInd < (all.length - 1)
    const graphDataKey = req.power && showTotalCarbon ? 'totalCarbon' : 'forecast'
    const runWhenHrs = getRunWhenHours(req.when)
    const graphHrs = getRunWhenHours(graphRange)

    const showMix = (pt: TimeAnalysis, inst?: boolean) => {
        setShowForecastMix({ pt, inst: inst === true })
        setShowForecastVisible(true)
    }
    const next = () => {
        if (!nextAvail) return
        setCurr(all[currInd + 1])
    }
    const nextBand = () => {
        if (!nextAvail) return
        const currBand = curr && curr.band
        // find next entry that has a different band
        for (let x = currInd + 1; x < all.length; x++) {
            if (all[x].band !== currBand) {
                setCurr(all[x])
                return
            }
        }
    }
    const prev = () => {
        if (!prevAvail) return
        setCurr(all[currInd - 1])
    }
    const prevBand = () => {
        if (!prevAvail) return
        const currBand = curr && curr.band
        // find next entry that has a different band
        for (let x = currInd - 1; x > -1; x--) {
            if (all[x].band !== currBand) {
                setCurr(all[x])
                return
            }
        }
        setCurr(all[0])
    }

    const overalBetter = () => {
        return bestOverall && best && 
            bestOverall.from !== best.from && 
            percentBetter(bestOverall, best) > 10
    }

    const percentBetter = (a: TimeAnalysis, b: TimeAnalysis) => {
        return 100 - ((a.forecast / b.forecast) * 100)
    }

    const graphData = all.filter((v) => v.inRange <= graphHrs)

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
                                    <TimeInfo req={req} fc={showForecastMix.pt} now={now || undefined} hideTime={true} />
                                </Typography>
                                <Table size='small'>
                                    <TableBody>
                                        {showForecastMix?.pt?.generationmix?.filter((s) => s.perc > 0.1).sort((a, b) => b.perc - a.perc).map((s, i) => 
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

            {curr && now && best && bestOverall ? (
                <>
                    <Typography variant='body1' component='p' paragraph={true}>
                        Start {req.what.owned} at
                    </Typography>
                    <TimeInfo req={req} now={now} fc={curr} onClick={showMix} />
                    <Grid container spacing={0} columns={12} sx={{ marginTop: '0.5em' }}>
                        <Grid item xs={2}><Button size='small' variant={curr.from===now.from ? 'contained' : 'text'} onClick={() => setCurr(now)} sx={{ height: '100%' }}>Now</Button></Grid>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!prevAvail} onClick={() => prevBand()} sx={{ height: '100%' }}><SkipPrevious /></Button></Grid>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!prevAvail} onClick={() => prev()} sx={{ height: '100%' }}><Replay30 /></Button></Grid>
                        {/* <Grid item xs={2}><Button size='small' variant={curr.from===best?.from ? 'contained' : 'text'} onClick={() => setCurr(best)} sx={{ height: '100%' }}>Better</Button></Grid>  */}
                        <Grid item xs={2}><Button size='small' variant={curr.from===bestOverall?.from ? 'contained' : 'text'} onClick={() => setCurr(bestOverall)} sx={{ height: '100%' }}>Best</Button></Grid>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!nextAvail} onClick={() => next()} sx={{ height: '100%' }}><Forward30 /></Button></Grid>
                        <Grid item xs={2}><Button size='small' variant='text' disabled={!nextAvail} onClick={() => nextBand()} sx={{ height: '100%' }}><SkipNext /></Button></Grid>
                    </Grid>
                    <Typography variant='body2' component='p' paragraph={true} sx={{ marginTop: '0.5em' }}>
                        {currIsBest ? 
                            <><b>Lowest CO2 emissions in the {explainRunWhen(req.when)} in {forecast.postcode}</b></>
                        : currIsBestOverall && !currIsBest ? 
                            <><b>Lowest CO2 emissions in the {explainRunWhen(RunWhenRange.Whenever)} in {forecast.postcode}</b></> 
                        : !currIsBest && !currIsBestOverall && currBand ? 
                            <>From {format(currBand.from, 'EEE HH:mm')} to {format(currBand.to, 'HH:mm')} averages {currBand.forecast.toFixed(0)}g/kWh ({currBand.index})</>
                        : !currIsBest && !currIsBestOverall ?
                            <><span style={{ color: 'rgba(255,255,255,0)' }}>nothing to say</span></> 
                        : null}
                    </Typography>
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

            {/* <pre>{JSON.stringify(bands.map((b) => { return { from: b.from, to: b.to, forecast: b.forecast, band: b.band, total: b.totalCarbon, gen: b.generationmix } }), null, 2)}</pre> */}

            <Paper elevation={1} sx={{ marginTop: '1em', padding: '0.5em' }}>
                <Box sx={{ height: '25vh' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} barGap={0} barCategoryGap={-0.5}>
                            <Bar type="monotone" dataKey={graphDataKey} strokeWidth={0} onClick={(d) => setCurr(d)}>
                                {graphData.map((entry, i) => 
                                    <Cell
                                        key={i} 
                                        fill={i === currInd ? 'yellow' : getIntensityFill(entry)} 
                                        opacity={entry.inRange <= runWhenHrs ? 1 : 1} 
                                        strokeWidth={i === currInd ? 0 : 0} 
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

