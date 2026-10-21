import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OwnerSelector from '../OwnerSelector'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  selected: { id: 20, label: 'Owner Twenty' },
  items: [{ id: 21, role: 'user', full_name: 'Owner Twenty One' }],
  getUser: vi.fn(),
  ownerResult: { originalArgs: 20 as number | undefined, error: undefined as unknown },
}))

vi.mock('@/hooks/redux', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: () => mocks.selected,
}))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'agent' }) }))
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (value: string) => value }))
vi.mock('@/features/pm/hooks/useOwnersSearch', () => ({
  useOwnersSearch: () => ({
    data: { items: mocks.items },
    currentData: { items: mocks.items },
    isFetching: false,
  }),
}))
vi.mock('@/features/users/api/usersApi', () => ({
  useGetUserQuery: (id: number, options: unknown) => {
    mocks.getUser(id, options)
    return mocks.ownerResult
  },
}))

describe('OwnerSelector', () => {
  beforeEach(() => {
    mocks.dispatch.mockClear()
    mocks.getUser.mockReset()
    mocks.ownerResult = { originalArgs: 20, error: undefined }
  })

  it('keeps the selected owner when a paginated search omits that owner', () => {
    render(<OwnerSelector />)

    expect(screen.getByRole('combobox')).toHaveTextContent('Owner Twenty')
    expect(mocks.getUser).toHaveBeenCalledWith(20, {
      skip: false,
      refetchOnMountOrArgChange: true,
    })
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('clears a selected owner when the direct lookup denies access', async () => {
    mocks.ownerResult = { originalArgs: 20, error: { status: 403 } }
    render(<OwnerSelector />)

    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'pm/setSelectedOwner',
      payload: null,
    }))
  })

  it('does not clear the current owner for a stale or transient lookup error', () => {
    mocks.ownerResult = { originalArgs: 21, error: { status: 403 } }
    const { rerender } = render(<OwnerSelector />)
    expect(mocks.dispatch).not.toHaveBeenCalled()

    mocks.ownerResult = { originalArgs: 20, error: { status: 500 } }
    rerender(<OwnerSelector />)
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })
})
