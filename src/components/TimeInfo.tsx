import React from 'react';
import { Link, Tooltip, Typography } from '@mui/material';
import { ArrowDownward, ArrowUpward, InfoOutlined } from '@mui/icons-material';
import { format } from 'date-fns';
import { upperFirst } from 'lodash';

import { TimeAnalysis } from '../lib/forecast-types';
import { getIntensityFill, getIntensityForeground } from './utils';
import { RunWhatRequest } from '../lib/request-types';

export function TimeInfo({ fc, req, now, hideTime, onClick } : { fc: TimeAnalysis, req: RunWhatRequest, now?: TimeAnalysis, disableFM?: boolean, hideTime?: boolean, onClick?: (fc: TimeAnalysis) => void }) {
    const ind = fc.index
    const fcast = fc.forecast
    const ncast = now?.forecast || 0

    return (
        <Link underline='none' sx={{ cursor: 'pointer' }} color='#000' onClick={() => onClick ? onClick(fc) : null}>
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
                    backgroundColor: getIntensityFill(fc),
                    color: getIntensityForeground(fc)
                }}>
                    <Typography variant='h6'>{upperFirst(ind)}</Typography>
                </div>
                <div style={{ 
                    border: '1px solid #999',
                    borderBottom: '0',
                    width: '100%',
                    padding: '0 0.5em' 
                }}>
                    <>{fcast.toFixed(0)}g/kWh{onClick ? <> <InfoOutlined sx={{ paddingTop: '0.25em', marginRight: '-0.2em' }} fontSize='inherit' /></> : null}</>
                </div>
                <div style={{ 
                    border: '1px solid #999',
                    borderTop: '0',
                    width: '100%',
                    padding: '0 0.5em' 
                }}>
                    {fc.totalCarbon !== undefined ? (
                        <>
                            <Tooltip title={<>Total estimated CO2 to run {req.what.owned} for {req.duration} minutes</>}>
                                <><b>{fc.totalCarbon >= 1000 ? <>{(fc.totalCarbon / 1000).toFixed(2)}kg</> : <>{fc.totalCarbon.toFixed(0)}g</>} total</b></>
                            </Tooltip>
                            <br/>
                        </>
                    ) : null}
                    {fcast !== ncast ? (<>
                        {fcast > ncast ? <ArrowUpward sx={{ paddingTop: '0.25em' }} fontSize='inherit' /> : <ArrowDownward sx={{ paddingTop: '0.25em' }} fontSize='inherit'  />}
                        {Math.abs(fc.comparedToNow || 0).toFixed(0)}%
                        {` `}{fcast > ncast ? 'above' : 'below'} now
                    </>) : <><ArrowUpward sx={{ paddingTop: '0.25em' }} fontSize='inherit' /> {fc.comparedToBest?.toFixed(0)}% above best</>}
                </div>
            </div>
        </Link>
    )
}