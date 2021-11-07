export const ElectricityUsers: ElectricityUser[] = [
    { id: 'anything', label: 'Any electrical item', name: 'device', singular: 'a device', owned: 'your device' },
    { id: 'dishwasher', label: 'Dishwasher', name: 'dishwasher', singular: 'a dishwasher', owned: 'your dishwasher', 
        duration: 90, power: 1200 },
    { id: 'washing-machine', label: 'Washing machine', name: 'washing machine', singular: 'a washing machine', owned: 'your washing machine', 
        duration: 120, power: 1800 },
    { id: 'tumble-dryer', label: 'Tumble dryer', name: 'tumble dryer', singular: 'a tumble dryer', owned: 'your tumble dryer',
        duration: 60, power: 2500 },
    { id: 'car-charge', label: 'Electric car charge (3.6kw)', name: 'EV charge', singular: 'an EV charger', owned: 'your EV charger', 
        duration: 360, power: 3600 },
    { id: 'fast-car-charge', label: 'Electric car charge (7kw)', name: 'EV charge', singular: 'an EV charger', owned: 'your EV charger', 
        duration: 180, power: 7000 },
]

export interface ElectricityUser {
    id: string
    label: string
    name: string
    singular: string
    owned: string
    /**
     * Approximate duration this thing will run for in minutes
     */
    duration?: number
    /**
     * Typical/average power draw for this while running
     * expressed in watts.
     */
    power?: number
}