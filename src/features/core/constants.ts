import type { AppKey, DevicePlatform, PageFormat } from '@/types/api'

/** Labels typed over the backend enums: a value the backend adds fails the type check until it is labelled here. */
export const APP_KEY_LABELS: Record<AppKey, string> = {
  ghar: 'Ghar (customer app)',
  estate: 'Estate (owner app)',
  flatmates: 'Flatmates',
  stays: 'Stays',
}

export const APP_KEYS = Object.keys(APP_KEY_LABELS) as AppKey[]

export const DEVICE_PLATFORM_LABELS: Record<DevicePlatform, string> = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
}

export const DEVICE_PLATFORMS = Object.keys(DEVICE_PLATFORM_LABELS) as DevicePlatform[]

export const PAGE_FORMAT_LABELS: Record<PageFormat, string> = {
  html: 'HTML',
  markdown: 'Markdown',
  json: 'JSON',
}

export const PAGE_FORMATS = Object.keys(PAGE_FORMAT_LABELS) as PageFormat[]

export function isAppKey(value: string): value is AppKey {
  return Object.prototype.hasOwnProperty.call(APP_KEY_LABELS, value)
}

export function isDevicePlatform(value: string): value is DevicePlatform {
  return Object.prototype.hasOwnProperty.call(DEVICE_PLATFORM_LABELS, value)
}

export function isPageFormat(value: string): value is PageFormat {
  return Object.prototype.hasOwnProperty.call(PAGE_FORMAT_LABELS, value)
}
