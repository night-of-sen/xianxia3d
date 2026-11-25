import * as THREE from 'three'

/** 时辰天气预设 */
export type TimeOfDay = 'dawn' | 'sunset' | 'night'

/** 国风仙侠调色板（全局统一取色） */
export const PALETTE = {
  skyTop: '#6b8fa3',
  skyHorizon: '#c5ccd0',
  fog: '#c4ccd0',
  inkDark: '#233038',
  inkLight: '#687f8a',
  jade: '#38e8d0',
  gold: '#ffbe55',
  peach: '#f7b6c8',
  lantern: '#ff9d3b',
} as const

export interface WeatherPreset {
  label: string
  bg: string
  fog: string
  fogDensity: number
  exposure: number
  envBgIntensity: number
  envIntensity: number
  useHdrBg: boolean
  sunDir: [number, number, number]
  sunColor: string
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  fillColor: string
  fillIntensity: number
  cloudLight: string
  cloudShadow: string
  cloudDeep: string
  cloudRim: string
  mountainTops: [string, string, string, string]
  mountainBases: [string, string, string, string]
  mistColor: string
}

export const WEATHER_PRESETS: Record<TimeOfDay, WeatherPreset> = {
  dawn: {
    label: '晨曦青绿',
    bg: '#b7c7cf',
    fog: '#c4ccd0',
    fogDensity: 0.0021,
    exposure: 0.78,
    envBgIntensity: 0.62,
    envIntensity: 0.65,
    useHdrBg: true,
    sunDir: [0.5, 0.42, -0.76],
    sunColor: '#ffd499',
    sunIntensity: 2.5,
    hemiSky: '#7ea3b8',
    hemiGround: '#8fa3ad',
    hemiIntensity: 0.42,
    fillColor: '#7cb0c4',
    fillIntensity: 0.65,
    cloudLight: '#eadfcb',
    cloudShadow: '#7a93a3',
    cloudDeep: '#485f70',
    cloudRim: '#f2b86b',
    mountainTops: ['#3c535f', '#58717d', '#7a919b', '#98aab2'],
    mountainBases: ['#a5b5bd', '#b6c3c8', '#c1cbd0', '#c4ccd0'],
    mistColor: '#efeae0',
  },
  sunset: {
    label: '残阳暮霞',
    bg: '#4b313a',
    fog: '#b06d5c',
    fogDensity: 0.0023,
    exposure: 0.86,
    envBgIntensity: 0.38,
    envIntensity: 0.48,
    useHdrBg: false,
    sunDir: [0.68, 0.22, -0.7],
    sunColor: '#ff7e47',
    sunIntensity: 3.1,
    hemiSky: '#d97862',
    hemiGround: '#432d3b',
    hemiIntensity: 0.45,
    fillColor: '#695585',
    fillIntensity: 0.75,
    cloudLight: '#f2a472',
    cloudShadow: '#7d4a58',
    cloudDeep: '#352236',
    cloudRim: '#ff9040',
    mountainTops: ['#3b2436', '#573342', '#7d484d', '#9c5f56'],
    mountainBases: ['#8d544c', '#9c5f54', '#a8695a', '#b06d5c'],
    mistColor: '#e8a282',
  },
  night: {
    label: '月夜星海',
    bg: '#09111c',
    fog: '#122030',
    fogDensity: 0.0024,
    exposure: 0.92,
    envBgIntensity: 0.08,
    envIntensity: 0.22,
    useHdrBg: false,
    sunDir: [-0.45, 0.52, -0.72],
    sunColor: '#a6cfff',
    sunIntensity: 1.55,
    hemiSky: '#29486b',
    hemiGround: '#0d1824',
    hemiIntensity: 0.45,
    fillColor: '#2d6e78',
    fillIntensity: 0.55,
    cloudLight: '#4e6f8c',
    cloudShadow: '#23384d',
    cloudDeep: '#0d1926',
    cloudRim: '#8cc7ff',
    mountainTops: ['#0b1624', '#102033', '#15283d', '#182e45'],
    mountainBases: ['#112030', '#122233', '#132436', '#122030'],
    mistColor: '#5c84a6',
  },
}

/** 场景全局参数 */
export const WORLD = {
  fogDensity: 0.0022,
  cloudSeaHeight: -20,
} as const

export const ENV_ROT_Y = 1.6725
export const SUN_DIR = new THREE.Vector3(0.5, 0.42, -0.76).normalize()
