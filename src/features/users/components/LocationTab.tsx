import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { MapPin } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface LocationTabProps {
  profile: {
    current_latitude?: number | null
    current_longitude?: number | null
    created_at?: string
    is_active?: boolean
    is_verified?: boolean
    privacy_settings?: {
      show_phone?: boolean
      show_email?: boolean
      allow_location_tracking?: boolean
    }
  } | null | undefined
  updatingLocation: boolean
  handleLocationUpdate: () => void
  onUpdatePrivacy: (settings: { show_phone?: boolean; show_email?: boolean; allow_location_tracking?: boolean }) => Promise<void>
}

const LocationTab: React.FC<LocationTabProps> = ({ profile, updatingLocation, handleLocationUpdate, onUpdatePrivacy }) => (
  <Card>
    <CardHeader>
      <CardTitle>Location Settings</CardTitle>
      <CardDescription>Manage your location preferences</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md gap-3">
          <div>
            <h3 className="font-medium">Current Location</h3>
            <p className="text-sm text-muted-foreground">
              {profile?.current_latitude && profile?.current_longitude
                ? `${profile.current_latitude.toFixed(4)}, ${profile.current_longitude.toFixed(4)}`
                : 'No location set'}
            </p>
          </div>
          <Button onClick={handleLocationUpdate} disabled={updatingLocation} variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            {updatingLocation ? 'Updating...' : 'Update Location'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm">{profile?.created_at ? formatDate(profile.created_at) : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Account Status</span>
                <Badge variant={profile?.is_active ? "default" : "secondary"}>{profile?.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verified</span>
                <Badge variant={profile?.is_verified ? "default" : "outline"}>{profile?.is_verified ? "Verified" : "Not Verified"}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Show Phone Number</span>
                <Switch
                  checked={profile?.privacy_settings?.show_phone ?? false}
                  onCheckedChange={(checked) => { void onUpdatePrivacy({ show_phone: checked }) }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show Email</span>
                <Switch
                  checked={profile?.privacy_settings?.show_email ?? false}
                  onCheckedChange={(checked) => { void onUpdatePrivacy({ show_email: checked }) }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Location Tracking</span>
                <Switch
                  checked={profile?.privacy_settings?.allow_location_tracking ?? false}
                  onCheckedChange={(checked) => { void onUpdatePrivacy({ allow_location_tracking: checked }) }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default LocationTab
