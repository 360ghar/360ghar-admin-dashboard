import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useGetProfileQuery, useUpdatePreferencesMutation, useUpdateLocationMutation, useUpdateProfileMutation } from '@/features/users/api/usersApi'
import type { PropertyPurpose, PropertyType, UserNotificationSettingsWrite, UserPreferencesPatch } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Save, Home, Building, Warehouse, Bell } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'

const PROPERTY_PURPOSE_VALUES: readonly PropertyPurpose[] = ['buy', 'rent', 'short_stay']
const PROPERTY_TYPE_VALUES: readonly PropertyType[] = [
  'house', 'apartment', 'builder_floor', 'room', 'villa', 'plot', 'condo', 'penthouse',
  'studio', 'loft', 'pg', 'flatmate', 'office', 'shop', 'warehouse',
]
const isPropertyType = (value: unknown): value is PropertyType =>
  typeof value === 'string' && PROPERTY_TYPE_VALUES.some((type) => type === value)

/** Read the stored preferences into the form. An unset or unknown value stays unset: no fallback to a real value. */
const normalizePreferences = (p: Partial<UserPreferencesPatch> | null | undefined): UserPreferencesPatch => {
  const text = (x: unknown) => (Array.isArray(x) ? x.filter((item): item is string => typeof item === 'string' && item.length > 0) : [])
  const num = (x: unknown) => (typeof x === 'number' && !Number.isNaN(x) ? x : undefined)
  const purpose = PROPERTY_PURPOSE_VALUES.find((value) => value === p?.purpose)
  return {
    property_type: (Array.isArray(p?.property_type) ? p.property_type : []).filter(isPropertyType),
    purpose,
    budget_min: num(p?.budget_min),
    budget_max: num(p?.budget_max),
    bedrooms_min: num(p?.bedrooms_min),
    bedrooms_max: num(p?.bedrooms_max),
    area_min: num(p?.area_min),
    area_max: num(p?.area_max),
    location_preference: text(p?.location_preference),
    max_distance_km: num(p?.max_distance_km),
  }
}

/** The four notification keys the backend accepts. Any other key fails the whole save with 422. */
const NOTIFICATION_TOGGLES = [
  ['email_notifications', 'Email notifications'],
  ['push_notifications', 'Push notifications'],
  ['sms_notifications', 'SMS notifications'],
  ['promotional_emails', 'Promotional emails'],
] as const satisfies readonly (readonly [keyof UserNotificationSettingsWrite, string])[]

const UserPreferencesPage = () => {
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useGetProfileQuery()
  const [updatePreferences, { isLoading: preferencesLoading }] = useUpdatePreferencesMutation()
  const [updateLocation, { isLoading: locationLoading }] = useUpdateLocationMutation()
  const [updateProfile, { isLoading: notifLoading }] = useUpdateProfileMutation()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<UserPreferencesPatch>({ property_type: [], location_preference: [] })
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationSettingsWrite>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    promotional_emails: false,
  })

  const initialMount = useRef(true)
  useEffect(() => {
    if (profile?.preferences) setPreferences(normalizePreferences(profile.preferences))
    if (typeof profile?.current_latitude === 'number' && typeof profile?.current_longitude === 'number') setLocation({ latitude: profile.current_latitude, longitude: profile.current_longitude })
    else if (initialMount.current && profile) setLocation({ latitude: 19.0760, longitude: 72.8777 })
    if (profile?.notification_settings) {
      const { email_notifications, push_notifications, sms_notifications, promotional_emails } = profile.notification_settings
      setNotifPrefs((prev) => ({
        email_notifications: email_notifications ?? prev.email_notifications,
        push_notifications: push_notifications ?? prev.push_notifications,
        sms_notifications: sms_notifications ?? prev.sms_notifications,
        promotional_emails: promotional_emails ?? prev.promotional_emails,
      }))
    }
    initialMount.current = false
  }, [profile])

  const handleNotifSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    try {
      // Self save through the profile route. Only the four contract keys are sent.
      await updateProfile({ notification_settings: notifPrefs }).unwrap()
      toast({ title: 'Success', description: 'Notification preferences saved' })
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to save notification preferences'), variant: 'destructive' })
    }
  }

  const handlePreferencesSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // `PUT /users/preferences` keeps unsent keys and `null` removes one, so a cleared input must go out as `null`.
    const body: UserPreferencesPatch = {
      property_type: preferences.property_type ?? [],
      location_preference: preferences.location_preference ?? [],
      purpose: preferences.purpose ?? null,
      budget_min: preferences.budget_min ?? null,
      budget_max: preferences.budget_max ?? null,
      bedrooms_min: preferences.bedrooms_min ?? null,
      bedrooms_max: preferences.bedrooms_max ?? null,
      area_min: preferences.area_min ?? null,
      area_max: preferences.area_max ?? null,
      max_distance_km: preferences.max_distance_km ?? null,
    }
    try { await updatePreferences(body).unwrap(); toast({ title: 'Success', description: 'Preferences updated successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update preferences'), variant: 'destructive' }) }
  }

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location) { toast({ title: 'Error', description: 'Location data is not available', variant: 'destructive' }); return }
    try { await updateLocation(location).unwrap(); toast({ title: 'Success', description: 'Location updated successfully' }) }
    catch (error: unknown) { toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update location'), variant: 'destructive' }) }
  }

  const togglePropertyType = (type: PropertyType) => setPreferences(prev => ({ ...prev, property_type: (prev.property_type || []).includes(type) ? (prev.property_type || []).filter(t => t !== type) : [...(prev.property_type || []), type] }))
  const toggleLocationPreference = (loc: string) => setPreferences(prev => ({ ...prev, location_preference: (prev.location_preference || []).includes(loc) ? (prev.location_preference || []).filter(l => l !== loc) : [...(prev.location_preference || []), loc] }))

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
          <p className="text-muted-foreground">Loading your preferences...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <LoadingState type="skeleton" rows={4} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
          <p className="text-muted-foreground">Customize your property search preferences and location settings.</p>
        </div>
        <ErrorState title="Failed to load preferences" onRetry={() => void refetchProfile()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Preferences</h1><p className="text-muted-foreground">Customize your property search preferences and location settings.</p></div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" />Property Preferences</CardTitle></CardHeader>
          <CardContent><form onSubmit={(e) => { void handlePreferencesSubmit(e) }} className="space-y-4">
            <div><Label className="text-sm font-medium">Property Type</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {([{ value: 'apartment', label: 'Apartment', icon: Building }, { value: 'house', label: 'House', icon: Home }, { value: 'builder_floor', label: 'Builder Floor', icon: Warehouse }, { value: 'room', label: 'Room', icon: Home }] as const).map(({ value, label, icon: Icon }) => (
                <div key={value} className="flex items-center space-x-2"><Checkbox id={`property-type-${value}`} checked={(preferences.property_type || []).includes(value)} onCheckedChange={() => togglePropertyType(value)} /><Label htmlFor={`property-type-${value}`} className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4" />{label}</Label></div>
              ))}</div></div>
            <div><Label htmlFor="purpose">Purpose</Label><Select value={preferences.purpose ?? undefined} onValueChange={(value) => { const purpose = PROPERTY_PURPOSE_VALUES.find((item) => item === value); if (purpose) setPreferences(prev => ({ ...prev, purpose })) }}><SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger><SelectContent><SelectItem value="rent">Rent</SelectItem><SelectItem value="buy">Buy</SelectItem><SelectItem value="short_stay">Short Stay</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="budget_min">Min Budget (₹)</Label><Input id="budget_min" type="number" value={preferences.budget_min ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, budget_min: e.target.value === '' ? undefined : Number(e.target.value) }))} /></div>
              <div><Label htmlFor="budget_max">Max Budget (₹)</Label><Input id="budget_max" type="number" value={preferences.budget_max ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, budget_max: e.target.value === '' ? undefined : Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="bedrooms_min">Min Bedrooms</Label><Input id="bedrooms_min" type="number" value={preferences.bedrooms_min ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, bedrooms_min: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) }))} /></div>
              <div><Label htmlFor="bedrooms_max">Max Bedrooms</Label><Input id="bedrooms_max" type="number" value={preferences.bedrooms_max ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, bedrooms_max: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="area_min">Min Area (sqft)</Label><Input id="area_min" type="number" value={preferences.area_min ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, area_min: e.target.value === '' ? undefined : Number(e.target.value) }))} /></div>
              <div><Label htmlFor="area_max">Max Area (sqft)</Label><Input id="area_max" type="number" value={preferences.area_max ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, area_max: e.target.value === '' ? undefined : Number(e.target.value) }))} /></div>
            </div>
            <div><Label htmlFor="max_distance">Max Distance (km)</Label><Input id="max_distance" type="number" value={preferences.max_distance_km ?? ''} onChange={(e) => setPreferences(prev => ({ ...prev, max_distance_km: e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)) }))} /></div>
            <Button type="submit" disabled={preferencesLoading} className="w-full">{preferencesLoading && <LoadingSpinner size="sm" className="mr-2 inline-flex" />}<Save className="mr-2 h-4 w-4" />Save Preferences</Button>
          </form></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Location Settings</CardTitle></CardHeader>
          <CardContent><form onSubmit={(e) => { void handleLocationSubmit(e) }} className="space-y-4">
            <div><Label className="text-sm font-medium">Current Location</Label>
              {location ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div><Label htmlFor="latitude" className="text-xs">Latitude</Label><Input id="latitude" type="number" step="0.0001" min={-90} max={90} value={location.latitude} onChange={(e) => setLocation(prev => prev ? ({ ...prev, latitude: Number(e.target.value) }) : null)} /></div>
                <div><Label htmlFor="longitude" className="text-xs">Longitude</Label><Input id="longitude" type="number" step="0.0001" min={-180} max={180} value={location.longitude} onChange={(e) => setLocation(prev => prev ? ({ ...prev, longitude: Number(e.target.value) }) : null)} /></div>
              </div> : <div className="text-sm text-muted-foreground mt-2">Location data is loading...</div>}
            </div>
            <div><Label className="text-sm font-medium">Preferred Locations</Label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'].map((city) => (
                <div key={city} className="flex items-center space-x-2"><Checkbox id={`location-${city}`} checked={(preferences.location_preference || []).includes(city)} onCheckedChange={() => toggleLocationPreference(city)} /><Label htmlFor={`location-${city}`} className="text-sm">{city}</Label></div>
              ))}</div></div>
            <Button type="submit" disabled={locationLoading} className="w-full">{locationLoading && <LoadingSpinner size="sm" className="mr-2 inline-flex" />}<MapPin className="mr-2 h-4 w-4" />Update Location</Button>
          </form></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Preferences</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void handleNotifSubmit(e) }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {NOTIFICATION_TOGGLES.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor={`notif-${key}`} className="text-sm">{label}</Label>
                  <Switch id={`notif-${key}`} checked={!!notifPrefs[key]} onCheckedChange={(checked) => setNotifPrefs((prev) => ({ ...prev, [key]: checked }))} />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={notifLoading} className="w-full">{notifLoading && <LoadingSpinner size="sm" className="mr-2 inline-flex" />}<Save className="mr-2 h-4 w-4" />Save Notification Preferences</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserPreferencesPage
