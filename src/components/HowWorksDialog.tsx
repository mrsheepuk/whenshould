import { Dialog, DialogTitle, Typography, DialogActions, DialogContent, Button } from "@mui/material";

export function HowWorksDialog({ open, onClose } : {open: boolean, onClose: () => any}) {
    return (
        <Dialog open={open} onClose={onClose} scroll='paper' maxWidth='md'>
        <DialogTitle>How this works</DialogTitle>
        <DialogContent>
          <Typography paragraph={true} variant='body1'>
            Using your postcode area (e.g. SW19), we ask the National Grid's carbon intensity API for a 
            forecast for your region over the next 48 hours. 
          </Typography>

          <Typography paragraph={true} variant='body1'>
            With that, we look for the period with the lowest average carbon emissions for 
            the duration you've set within the time range you've requested.
          </Typography>

          <Typography paragraph={true} variant='body1'>
            Find out more about the <a href="https://carbonintensity.org.uk/" target="_blank" rel="noreferrer">estimation 
            model the National Grid uses to produce this data</a> - and know that the 
            estimates do change, particularly further into the future.
          </Typography>

          <Typography paragraph={true} variant='body1'>
            If you provide an approximate power draw, you can see an estimate of the total 
            CO2 emissions caused by running your device.
          </Typography>

          <Typography paragraph={true} variant='body1'>
            <a href="https://github.com/mrsheepuk/whenshould/issues" target="_blank" rel="noreferrer">Raise an issue 
            on GitHub</a> if you have any problems or suggestions.
          </Typography>

          <Typography paragraph={true} variant='body1'>
            The lovely leaf imagery is provided by the fabulous 
            {` `}<a href="https://undraw.co" target="_blank" rel="noreferrer">unDraw.co</a>.
          </Typography>

          <Typography variant='h6'>Privacy:</Typography>
          <ul>
            <li>
              We submit your postcode area directly to the National Grid API to determine 
              the carbon intensity for your area
            </li>
            <li>We use Google Analytics to monitor usage of this service.</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={onClose}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    )
}