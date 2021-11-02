import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Button, Container, Grid, Toolbar, Alert, AlertTitle, Typography, Dialog, DialogTitle, Link, Box } from '@mui/material'

import './App.css';
import Logo from './leaf.svg';
import { Forecast } from './api/forecast-types';
import { Forecaster } from './api/forecaster';
import { RunWhatForm } from './components/RunWhatForm';
import { ForecastDisplay } from './components/ForecastDisplay';
import { RunWhatRequest } from './api/request-types';

function App() {
  const [loading, setLoading] = useState<boolean>(false)
  const [req, setReq] = useState<RunWhatRequest | undefined>(undefined)
  const [forecast, setForecast] = useState<Forecast | undefined>(undefined)
  const [err, setErr] = useState<string | undefined>(undefined)
  const [edit, setEdit] = useState<boolean>(false)
  const [about, setAbout] = useState<boolean>(false)

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
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <header>
          <Toolbar sx={{ borderBottom: '1px solid #ccc', marginBottom: '1vh' }}>
            <img className='logo' src={Logo} alt="When to..." />
            <Typography
              component="h1"
              variant="h5"
              color="inherit"
              align="center"
              noWrap
              sx={{ flex: 1 }}
            >
              Tell me when to run...
            </Typography>
          </Toolbar>
        </header>
        <main>
          <Dialog open={about} onClose={() => setAbout(false)} scroll='paper' maxWidth='md'>
            <DialogTitle>How this works</DialogTitle>
            <Box sx={{ padding: '1em' }}>
              <p>
                Using your postcode area, we ask the National Grid's carbon intensity API for a 
                forecast for your region over the next 48 hours. 
              </p>

              <p>
                With that, we look for the period with the lowest average carbon emissions for 
                the duration you've set within the time range you've requested.
              </p>

              <p>
                Find out more about the <a href="https://carbonintensity.org.uk/" target="_blank" rel="noreferrer">estimation 
                model the National Grid uses to produce this data</a> - and know that the 
                estimates do change, particularly further into the future.
              </p>

              <p>
                If you provide an approximate power draw, you can see an estimate of the total 
                CO2 emissions caused by running your device.
              </p>

              <p>
                <a href="https://github.com/mrsheepuk/whenshould/issues" target="_blank" rel="noreferrer">Raise an issue 
                on GitHub</a> if you have any problems or suggestions.
              </p>

              <p>
                The lovely leaf imagery is provided by the fabulous 
                <a href="https://undraw.co" target="_blank" rel="noreferrer">undraw.co</a>.
              </p>

              <p>Privacy:</p>

              <ul>
                <li>
                  We submit your postcode area directly to the National Grid API to determine 
                  the carbon intensity for your area.
                </li>
                <li>We do not currently store any data about your request ourselves.</li>
                <li>We use Google Analytics to monitor usage of this service.</li>
              </ul>
            </Box>
          </Dialog>

          <Grid container spacing={2}>
            {!req || edit || err ? (
              <Grid item xs={12}>
                <Typography variant='body1' component='p' paragraph={true}>
                  Find the lowest carbon time to run your dishwasher, charge your EV,
                  use your tumble dryer, or any other electrical appliance by entering 
                  a few details. <Link component='button' onClick={() => setAbout(true)}>Learn more</Link>
                </Typography>
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
                {!loading ? (
                  <Button 
                      sx={{ marginTop: '0.5em', width: '100%' }} 
                      variant='contained' 
                      onClick={() => setEdit(true)}>
                    Change options
                  </Button>
                ) : null}
              </Grid>
            )}
            <Grid item xs={12}>
              <ForecastDisplay req={req} forecast={forecast} loading={loading} />
            </Grid>
          </Grid>
        </main>
      </Container>
    </React.Fragment>
  );
}

export default App;
