import React, { useEffect, useState } from 'react';
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, Link, MenuItem, TextField, Typography } from '@mui/material';
import { Box } from '@mui/system';

import { ElectricityUser, ElectricityUsers } from '../data/things';
import { getRunWhen, RunWhatRequest, RunWhenRange } from '../lib/request-types';

export function RunWhatForm({ onSubmit, disabled, presets } : { 
    onSubmit: (req: RunWhatRequest) => Promise<void>, 
    disabled?: boolean,
    presets?: RunWhatRequest
}) {
    const [what, setWhat] = useState<ElectricityUser>(presets?.what || ElectricityUsers[0])
    const [duration, setDuration] = useState<number>(presets?.duration || presets?.what?.duration || 60)
    const [power, setPower] = useState<number|undefined>(presets?.power || presets?.what?.power || undefined)
    const [where, setWhere] = useState<string|null>(presets?.where || null)
    const [when, setWhen] = useState<string>(presets?.when || RunWhenRange.Next24h)
    const [whereErr, setWhereErr] = useState<string|null>(null)
    const [showWattsHelp, setShowWattsHelp] = useState<boolean>(false)

    useEffect(() => {
        if (what && what.duration) {
            setDuration(what.duration)
        }
        if (what && what.power) {
            setPower(what.power)
        } else {
            setPower(undefined)
        }
    }, [what])

    const whereValid = (w: string|null): boolean => {
        return (w?.match(/^[A-Z]{1,2}\d[A-Z\d]?$/i)) !== null       
    }
    const removePostcodeSuffix = (w: string | null): string | null => {
        if (!w) return w
        const match = w.match(/^[A-Z]{1,2}\d[A-Z\d]?/i)
        // If a valid match for a postcode prefix, return JUST the prefix,
        // else return the whole user input. This will then be validated.
        if (match && match.length === 1) {
            return match[0]
        }
        return w
    }
    const checkSetWhere = (w: string|null) => {
        w = removePostcodeSuffix(w)
        setWhere(w)
        if (w && !whereValid(w)) {
            setWhereErr('First half of UK postcode only, e.g. SW19 or W1A')
            return
        }
        setWhereErr(null)
    }

    const explainWhat = () => {
        if (what.id === ElectricityUsers[0].id) {
            return null
        }
        if (!what.duration || !what.power) {
            return null
        }
        const kwh = (what.power / 1000) * (what.duration / 60)
        return `Typical: ${kwh.toFixed(1)}kWh (${what.power}w for ${what.duration} minutes)`
    }

    const doSubmit = async () => {
        if (where === null || !whereValid(where)) return
        await onSubmit({
            startTime: new Date(),
            what, 
            where, 
            when: getRunWhen(when), 
            duration,
            power,
        })
    }

    return (
        <Box component="form">
            <Dialog open={showWattsHelp} onClose={() => setShowWattsHelp(false)}>
                <DialogTitle>Power usage</DialogTitle>
                <DialogContent>
                    <Typography paragraph={true} variant='body1'>
                        This is used to estimate the total CO2
                        emissions for using your device at the specified times. 
                    </Typography>
                    <Typography paragraph={true} variant='body1'>
                        It does not affect the calculation of the best time 
                        to run your device, so if you don't know simply keep the 
                        default value or leave blank.
                    </Typography>
                    <Typography paragraph={true} variant='body1'>
                        For an accurate estimation of total CO2 emissions
                        set this to the <b>average</b> power used by your device
                        during the time you will be using it.
                    </Typography>
                    <Typography paragraph={true} variant='body1'>
                        Typical approximate values are pre-populated for common
                        appliances if you select them from the 'What' drop-down. 
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setShowWattsHelp(false)}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
            <Grid container spacing={2} columns={8}>
                <Grid item md={4} xs={8}>
                    <Autocomplete<ElectricityUser,false,true>
                        fullWidth
                        disabled={disabled}
                        disablePortal
                        disableClearable
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        multiple={false}
                        options={ElectricityUsers}
                        onChange={(_,w) => setWhat(w)}
                        value={what} 
                        renderInput={(params) => 
                            <TextField {...params} 
                                label='What?' 
                                helperText={explainWhat()} 
                            />
                        }
                    />
                </Grid>
                <Grid item md={2} xs={4}>
                    <TextField fullWidth
                        label='For how long?'
                        disabled={disabled}
                        value={duration}
                        type='number'
                        onChange={(e) => setDuration(e.target.value as unknown as number)}
                        onKeyPress={(e) => e.key === 'Enter' && doSubmit()}
                        InputProps={{
                            endAdornment: <InputAdornment position='end'>mins</InputAdornment>
                        }}
                        helperText='Approximate duration'
                    />
                </Grid>
                <Grid item md={2} xs={4}>
                    <TextField fullWidth
                        label='Power usage?'
                        disabled={disabled}
                        value={power || ''}
                        type='number'
                        onChange={(e) => setPower(e.target.value as unknown as number)}
                        onKeyPress={(e) => e.key === 'Enter' && doSubmit()}
                        InputProps={{
                            endAdornment: power ? <InputAdornment position='end'>watts</InputAdornment> : null
                        }}
                        helperText={(
                            <>
                                In watts, if known.{` `}
                                <Link sx={{ cursor: 'pointer' }} onClick={() => setShowWattsHelp(true)}>Help</Link>
                            </>
                        )}
                    />
                </Grid>

                <Grid item md={4} xs={8}>
                    <TextField fullWidth select
                        sx={{ textAlign: 'left' }}
                        label='When?'
                        disabled={disabled}
                        value={when}
                        onChange={(e) => setWhen(e.target.value)}
                    >
                        <MenuItem key={RunWhenRange.Whenever} value={RunWhenRange.Whenever}>
                            Next 48 hours
                        </MenuItem>
                        <MenuItem key={RunWhenRange.Next24h} value={RunWhenRange.Next24h}>
                            Next 24 hours
                        </MenuItem>
                        <MenuItem key={RunWhenRange.Next12h} value={RunWhenRange.Next12h}>
                            Next 12 hours
                        </MenuItem>
                        <MenuItem key={RunWhenRange.Next8h} value={RunWhenRange.Next8h}>
                            Next 8 hours
                        </MenuItem>
                    </TextField>
                </Grid>
                <Grid item md={3} xs={8}>
                    <TextField fullWidth
                        label='Where?'
                        disabled={disabled}
                        value={where || ''}
                        onChange={(e) => checkSetWhere(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && doSubmit()}
                        InputProps={{
                            placeholder: 'Postcode area (e.g. SW19)'
                        }}
                        error={whereErr != null}
                        helperText={whereErr}
                        required={true}
                    />
                </Grid>
                <Grid item md={1} xs={8}>
                    <Button 
                        sx={{ marginTop: '0.5em', width: '100%' }} 
                        variant='contained' 
                        disabled={disabled || !whereValid(where)} 
                        onClick={() => doSubmit()}>
                        Go
                    </Button>
                </Grid>
            </Grid>
        </Box>
    )
}