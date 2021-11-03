import { Dialog, DialogTitle, Typography, DialogActions, DialogContent, Button } from "@mui/material";

export function WhyDialog({ open, onClose } : {open: boolean, onClose: () => any}) {
    return (
        <Dialog open={open} onClose={onClose} scroll='paper' maxWidth='md'>
            <DialogTitle>Why is this important?</DialogTitle>
            <DialogContent>
              <Typography paragraph={true} variant='body1'>
                When you use electricity you're creating demand on the National Grid, 
                using whatever mix of generation is supplying you at that time. 
              </Typography>
            
              <Typography paragraph={true} variant='body1'>
                At times where there's higher overall usage or lower renewable energy available,
                more non-renewable sources (such as gas or oil) need to be added to the grid, 
                increasing the overall carbon emitted to meet the country's electricity needs.
              </Typography>

              <Typography paragraph={true} variant='body1'>
                Many domestic electrical uses can be easily moved to times when there's less
                load on the grid or more renewable energy is available (e.g. when it's windy) - 
                scheduling your dishwasher to run overnight, waiting a few hours to run and 
                dry a load of laundry, choosing when to charge your electric vehicle or home 
                battery.
              </Typography>

              <Typography variant='h6'>But I have a green electricity tariff!</Typography>

              <Typography paragraph={true} variant='body1'>
                With a green tariff your supplier ensures that, over time, an amount of 
                renewable energy equivalent to your usage is purchased and put into the grid. 
              </Typography>

              <Typography paragraph={true} variant='body1'>
                This is great because it encourages producers of renewable energy to invest 
                in producing more of it. However, what you're using at any moment remains 
                whatever is powering the grid at that time, so <b>it's still beneficial to 
                shift usage to lower carbon times</b>.
              </Typography>

              <Typography paragraph={true} variant='body1'>
                Shifting your usage to lower carbon times also leaves more renewables 
                available at higher carbon times for those not on fully green tariffs.
              </Typography>

              <Typography paragraph={true} variant='body1'>
                This lowers the overall amount of carbon emissions 
                because <b>less non-renewable electricity needs to be added</b> to 
                meet that demand.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button autoFocus onClick={onClose}>
                OK
              </Button>
            </DialogActions>
        </Dialog>
    )
}