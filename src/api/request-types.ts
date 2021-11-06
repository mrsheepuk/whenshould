import { ElectricityUser } from "../data/things";

export enum RunWhenRange {
    Now = 'Now',
    Next8h = 'Next8h',
    Next12h = 'Next12h',
    Next24h = 'Next24',
    Whenever = 'Whenever',
}

export function getRunWhen(when: string): RunWhenRange {
    switch (when) {
        case RunWhenRange.Now:
            return RunWhenRange.Now
        case RunWhenRange.Next8h:
            return RunWhenRange.Next8h
        case RunWhenRange.Next12h:
            return RunWhenRange.Next12h
        case RunWhenRange.Next24h:
            return RunWhenRange.Next24h
    }
    return RunWhenRange.Whenever
}

export function getRunWhenHours(when: RunWhenRange): number {
    switch (when) {
        case RunWhenRange.Now:
            return 1
        case RunWhenRange.Next8h:
            return 8
        case RunWhenRange.Next12h:
            return 12
        case RunWhenRange.Next24h:
            return 24
    }
    return 48
}

export function explainRunWhen(when: RunWhenRange) {
    switch (when) {
        case RunWhenRange.Now:
            return 'now'
        case RunWhenRange.Next8h:
            return 'next 8 hours'
        case RunWhenRange.Next12h:
            return 'next 12 hours'
        case RunWhenRange.Next24h:
            return 'next 24 hours'
    }
    return 'next 48 hours'
}

export interface RunWhatRequest {
    what?: ElectricityUser
    where: string|null
    duration: number
    when: RunWhenRange,
    power?: number
}
