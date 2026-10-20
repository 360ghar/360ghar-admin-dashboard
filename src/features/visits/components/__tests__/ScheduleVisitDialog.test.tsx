import { act, fireEvent, render, screen } from '@testing-library/react'
import { ScheduleVisitDialog } from '../ScheduleVisitDialog'

const mocks = vi.hoisted(() => ({ searchProperties: vi.fn() }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/features/properties/api/propertiesApi', () => ({
  useSearchPropertiesQuery: mocks.searchProperties,
}))
vi.mock('@/features/visits/api/visitsApi', () => ({
  useScheduleVisitMutation: () => [vi.fn(), { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

// One stable result: a new object on every render would only re-render the dialog.
const result = { currentData: { items: [], has_more: false, next_cursor: null }, isFetching: false, error: undefined, refetch: vi.fn() }

beforeEach(() => {
  vi.useFakeTimers()
  mocks.searchProperties.mockReset()
  mocks.searchProperties.mockReturnValue(result)
})

afterEach(() => {
  vi.useRealTimers()
})

it('searches properties on the server instead of listing the first 100', () => {
  render(<ScheduleVisitDialog open onOpenChange={vi.fn()} />)
  expect(mocks.searchProperties).toHaveBeenLastCalledWith({ limit: 20, q: undefined }, { skip: false })

  fireEvent.change(screen.getByLabelText('Search properties'), { target: { value: ' Koregaon ' } })
  act(() => { vi.advanceTimersByTime(300) })

  expect(mocks.searchProperties).toHaveBeenLastCalledWith({ limit: 20, q: 'Koregaon' }, { skip: false })
})
