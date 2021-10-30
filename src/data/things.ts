export const ElectricityUsers: ElectricityUser[] = [
    { id: 'anything', label: 'Any electrical item' },
    { id: 'dishwasher', label: 'Dishwasher', duration: 90, power: 1200 },
    { id: 'washing-machine', label: 'Washing machine', duration: 120, power: 1800 },
    { id: 'tumble-dryer', label: 'Tumble dryer', duration: 60, power: 2500 },
    { id: 'car-charge', label: 'Electric car charge (3.6kw)', duration: 360, power: 3600 },
    { id: 'fast-car-charge', label: 'Electric car charge (7kw)', duration: 180, power: 7000 },
]

export interface ElectricityUser {
    id: string
    label: string
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