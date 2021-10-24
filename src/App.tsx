import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Forecast } from './api/forecast-types';
import { Forecaster } from './api/forecaster';
import { format, parseISO } from 'date-fns';

function App() {
  const [postcode, setPostcode] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [forecast, setForecast] = useState<Forecast | undefined>(undefined)
  const [err, setErr] = useState<string | undefined>(undefined)
  // useEffect(() => {
  //   ;(async () => {
  //   })()
  // }, [postcode])

  const loadData = async () => {
    if (!postcode) return
    setLoading(true)
    setErr(undefined)
    const f = await new Forecaster().getForecast(postcode)
    if (f.ok) {
      setForecast(f.forecast)
    } else {
      setErr(f.err)
    }
    setLoading(false)
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          <input type="text" readOnly={loading} value={postcode} onChange={(e) => setPostcode(e.target.value)} /> <button disabled={loading} onClick={() => loadData()}>Load</button>
        </p>
        {err ? (
          <p>{err}</p>
        ) : null}
        {forecast ? (
          <>
          Forecast:
            <ul>
            {forecast.data.map((f) => (
              <li>
                {format(parseISO(f.from), 'EEEE HH:mm')} to {format(parseISO(f.to), 'EEEE HH:mm')}: {f.intensity.forecast} ({f.intensity.index})
              </li>
            ))}
            </ul>
          </>
        ) : null}
      </header>
    </div>
  );
}

export default App;
