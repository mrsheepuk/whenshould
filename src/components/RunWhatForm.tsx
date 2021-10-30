import React, { useState } from 'react';
import { Autocomplete, Button, FormControl, StepLabel, TextField } from '@mui/material';
import { Box } from '@mui/system';

import { ElectricityUser, ElectricityUsers } from '../data/things';
import { RunWhatRequest } from '../api/request-types';

export function RunWhatForm({ onSubmit, disabled, presets } : { 
    onSubmit: (req: RunWhatRequest) => Promise<void>, 
    disabled?: boolean,
    presets?: RunWhatRequest
}) {
    const [what, setWhat] = useState<ElectricityUser>(presets?.what || ElectricityUsers[0])
    const [where, setWhere] = useState<string|null>(presets?.where || null)
    const [whereErr, setWhereErr] = useState<string|null>(null)

    const whereValid = (w: string|null): boolean => {
        return (w?.match(/^[A-Z]{1,2}\d[A-Z\d]?$/i)) !== null       
    }
    const checkSetWhere = (w: string|null) => {
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
        return `Typical power usage: ${kwh.toFixed(2)}kWh (${what.power}w for ${what.duration} minutes)`
    }

    const doSubmit = async () => {
        if (!whereValid(where)) return
        await onSubmit({ what, where })
    }

    return (
        <Box
            component="form"
            sx={{
            '& .MuiTextField-root': { m: 1, width: '30ch' },
            }}
        >
            <FormControl>
                <Autocomplete<ElectricityUser,false,true>
                    disabled={disabled}
                    disablePortal
                    disableClearable
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    multiple={false}
                    options={ElectricityUsers}
                    onChange={(_,w) => setWhat(w)}
                    value={what} 
                    sx={{ width: 300 }}
                    renderInput={(params) => <TextField {...params} label='What do you want to run?' helperText={explainWhat()} />}
                />
            </FormControl>

            <FormControl>
                <TextField
                    label='Where are you?'
                    disabled={disabled}
                    value={where || ''}
                    onChange={(e) => checkSetWhere(e.target.value)}
                    InputProps={{
                        placeholder: 'Postcode (e.g. SW19)'
                    }}
                    inputProps={{
                        pattern: '^[A-Z]{1,2}\\d[A-Z\\d]?$'
                    }}
                    error={whereErr != null}
                    helperText={whereErr}
                    required={true}
                />
            </FormControl>
            <FormControl>
                <StepLabel>Go</StepLabel>
                <Button variant='contained' disabled={disabled || !whereValid(where)} onClick={() => doSubmit()}>Go</Button>
            </FormControl> 
        </Box>
    )
}