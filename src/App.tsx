import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Button, Container, Grid } from '@mui/material'

import './App.css';
import { Forecast } from './api/forecast-types';
import { Forecaster } from './api/forecaster';
import { RunWhatForm } from './components/RunWhatForm';
import { ForecastDisplay } from './components/ForecastDisplay';
import { RunWhatRequest } from './api/request-types';
import { Alert, AlertTitle, Typography } from '@mui/material';

function App() {
  const [loading, setLoading] = useState<boolean>(false)
  const [req, setReq] = useState<RunWhatRequest | undefined>(undefined)
  const [forecast, setForecast] = useState<Forecast | undefined>(undefined)
  const [err, setErr] = useState<string | undefined>(undefined)
  const [edit, setEdit] = useState<boolean>(false)

  const load = async (req: RunWhatRequest) => {
    if (!req.where) return
    setReq(req)
    setEdit(false)
    setLoading(true)
    setErr(undefined)
    const f = await new Forecaster().getForecast(req.where)
    if (f.ok) {
      setForecast(f.forecast)
    } else {
      setErr(f.err)
    }
    setLoading(false)
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <div className="App">
        <header className="App-header">
          <Typography variant='h4' component='h1'>Tell me when to run...</Typography>
        </header>
        <Container sx={{ marginTop: '1em' }}>
          <Grid container spacing={2}>
            {!req || edit ? (
              <Grid item xs={12}>
                <RunWhatForm presets={req} onSubmit={(req) => load(req)} disabled={loading} />
                {err ? (
                  <Alert severity="error">
                    <AlertTitle>Error</AlertTitle>
                    {err}
                  </Alert>
                ) : null}
              </Grid>
            ) : (
              <Grid item xs={12}>
                <Button 
                    disabled={loading}
                    sx={{ marginTop: '0.5em', width: '100%' }} 
                    variant='contained' 
                    onClick={() => setEdit(true)}>
                  Change options
                </Button>
              </Grid>
            )}
            <Grid item xs={12}>
              <ForecastDisplay req={req} forecast={forecast} loading={loading} />
            </Grid>
          </Grid>
        </Container>
      </div>
    </React.Fragment>
  );
}

export default App;
