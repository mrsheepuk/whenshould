import React, { useEffect, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { Button, Container, Grid, Toolbar, Alert, AlertTitle, Typography, Link, Snackbar, ThemeProvider } from '@mui/material'
import { createTheme } from '@mui/material/styles';

import './App.css';
import Logo from './leaf.svg';
import { Forecast } from './api/forecast-types';
import { Forecaster } from './api/forecaster';
import { RunWhatForm } from './components/RunWhatForm';
import { ForecastDisplay } from './components/ForecastDisplay';
import { RunWhatRequest } from './api/request-types';
import { HowWorksDialog } from './components/HowWorksDialog';
import { WhyDialog } from './components/WhyDialog';
import { VERSION } from './version';

const VERSION_CHECK_MINUTES = 60
const theme = createTheme({
  palette: {
    primary: {
      main: '#3EA055'
    }
  },
});


const LOCAL_STORAGE_LAST_SETTINGS_KEY = "lastsettings"

function App() {
  const [loading, setLoading] = useState<boolean>(false)
  const [req, setReq] = useState<RunWhatRequest | undefined>(undefined)
  const [forecast, setForecast] = useState<Forecast | undefined>(undefined)
  const [err, setErr] = useState<string | undefined>(undefined)
  const [edit, setEdit] = useState<boolean>(false)
  const [showInfo, setShowInfo] = useState<'about'|'why'|null>(null)
  const [newVersionAvailable, setNewVersionAvailable] = useState<boolean|string>(false)
  const [nextVersionCheck, setNextVersionCheck] = useState<number>(0)

  useEffect(() => {
    // On initialisation, load last settings if present 
    const ls = localStorage.getItem(LOCAL_STORAGE_LAST_SETTINGS_KEY)
    if (ls) {
      setReq(JSON.parse(ls) as RunWhatRequest)
      setEdit(true)
    }
  }, [])

  useEffect(() => {
    if (new Date().getTime() < nextVersionCheck) {
      return
    }
    checkVersion()
  })

  const checkVersion = async () => {
    try {
      let res = await fetch(`version.dat?${new Date().getTime()}`)
      if (res.ok) {
        const newVer = (await res.text()).trim()
        setNewVersionAvailable(VERSION !== newVer ? newVer : false)
      }
    } catch {
      // Ignoring errors here, it won't hurt anything.
    }
    setNextVersionCheck(new Date().getTime() + (VERSION_CHECK_MINUTES * 60 * 1000))
  }

  const load = async (req: RunWhatRequest) => {
    if (!req.where) return
    setReq(req)
    localStorage.setItem(LOCAL_STORAGE_LAST_SETTINGS_KEY, JSON.stringify(req))
    setEdit(false)
    setLoading(true)
    setErr(undefined)
    const pcmatch = req.where.match(/^[a-z]+/i)
    if (pcmatch) {
      window.gtag('event', 'postcode_forecast', {
        'event_category': 'forecast',
        'event_label': pcmatch[0].toUpperCase()
      });
    }

    const f = await new Forecaster().getForecast(req.where, req.startTime)
    if (f.ok) {
      setForecast(f.forecast)
    } else {
      setErr(f.err)
    }
    setLoading(false)
  }

  const showForm = !req || edit || err

  const reset = () => {
    localStorage.removeItem(LOCAL_STORAGE_LAST_SETTINGS_KEY)
    setReq(undefined)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <header>
          <Toolbar sx={{ borderBottom: '1px solid #ccc', marginBottom: '1vh', backgroundColor: 'white' }}>
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
          <HowWorksDialog open={showInfo==='about'} onClose={() => setShowInfo(null)} />
          <WhyDialog open={showInfo==='why'} onClose={() => setShowInfo(null)} />
          <Snackbar
            open={newVersionAvailable !== false}
            onClose={() => setNewVersionAvailable(false)}
            message="whento.info has been updated"
            action={(
              <Button color='info' size="small" onClick={() => window.location.replace(window.location.toString() + `?ver=${newVersionAvailable}`)}>
                Reload now
              </Button>
            )}
          />
          <Grid container spacing={2}>
            {showForm ? (
              <Grid item xs={12}>
                <Typography variant='body1' component='p' paragraph={true}>
                  Find the lowest carbon time to run your dishwasher, charge your EV,
                  use your tumble dryer, or any other electrical appliance by entering 
                  a few details.<br />
                  <Link component='button' onClick={() => setShowInfo('about')}>Learn more</Link>{` `}|{` `}
                  <Link component='button' onClick={() => setShowInfo('why')}>Why is this important?</Link>
                </Typography>
                <RunWhatForm presets={req} onSubmit={(req) => load(req)} disabled={loading} onReset={() => reset()} />
                {err ? (
                  <Alert severity="error" sx={{ marginTop: '1em', marginBottom: '1em', textAlign: 'left' }}>
                    <AlertTitle>Problem retrieving forecast</AlertTitle>
                    {err}
                  </Alert>
                ) : null}
              </Grid>
            ) : (
              <>
                <Grid item xs={12}>
                  <ForecastDisplay req={req} forecast={forecast} loading={loading} />
                </Grid>
                <Grid item xs={12}>
                {!loading ? (
                  <Button 
                      sx={{ width: '100%' }} 
                      variant='contained' 
                      onClick={() => setEdit(true)}>
                    Start again
                  </Button>
                ) : null}
                </Grid>
              </>
            )}
          </Grid>
        </main>
      </Container>
    </ThemeProvider>
  );
}

export default App;
