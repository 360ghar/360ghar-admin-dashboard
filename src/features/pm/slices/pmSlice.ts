import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { clearCredentials } from '@/features/auth/slices/authSlice'
import type { RootState } from '@/store'
import { readJSON, removeStored, writeJSON } from '@/lib/storage'

export interface SelectedOwner {
  id: number
  label: string
}

interface PmState {
  selected_owner: SelectedOwner | null
}

const STORAGE_KEY = 'pm_selected_owner'

const isSelectedOwner = (value: unknown): value is SelectedOwner => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'number' && typeof candidate.label === 'string'
}

const readSelectedOwner = (): SelectedOwner | null =>
  readJSON<SelectedOwner | null>(STORAGE_KEY, null, isSelectedOwner)

const initialState: PmState = {
  selected_owner: readSelectedOwner(),
}

const pmSlice = createSlice({
  name: 'pm',
  initialState,
  reducers: {
    setSelectedOwner: (state, action: PayloadAction<SelectedOwner | null>) => {
      state.selected_owner = action.payload
      if (action.payload) writeJSON(STORAGE_KEY, action.payload)
      else removeStored(STORAGE_KEY)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearCredentials, (state) => {
      state.selected_owner = null
      removeStored(STORAGE_KEY)
    })
  },
})

export const { setSelectedOwner } = pmSlice.actions

export const selectSelectedOwner = (state: RootState) => state.pm.selected_owner
export const selectSelectedOwnerId = (state: RootState) => state.pm.selected_owner?.id ?? null

export default pmSlice.reducer

