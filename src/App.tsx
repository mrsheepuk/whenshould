import React, { useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';

import logo from './logo.svg';
import './App.css';
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

  const load = async (req: RunWhatRequest) => {
    if (!req.where) return
    setReq(req)
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
          <img src={logo} className="App-logo" alt="Tell me when to run" />
          {err ? (
            <p>{err}</p>
          ) : null}
        </header>
        <div style={{ marginTop: '1em' }}>
          <RunWhatForm onSubmit={(req) => load(req)} disabled={loading} />
          <ForecastDisplay req={req} forecast={forecast} loading={loading} />
        </div>
      </div>
    </React.Fragment>
  );
}

export default App;
