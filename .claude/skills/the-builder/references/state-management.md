# State Management

**Trigger:** Decide where state lives in a client application — local component state, lifted state, global state, server state, URL state, derived state — and how to handle async data, optimistic updates, and synchronization. Load whenever building UI that holds data, fetches from a backend, or syncs across components.

## The Categories of State

Most state confusion comes from treating all state as one thing. It isn't. Categorize first:

| Type | Lives in | Examples |
|------|----------|----------|
| **Local UI state** | Component | Open/closed, hover, input focus |
| **Lifted UI state** | Common ancestor | Selected tab shared between siblings |
| **Form state** | Form library or local | Field values, validation, submission |
| **URL state** | Router | Filters, pagination, current route, sort order |
| **Server state** | Server (cached on client) | API data, user profile, lists from DB |
| **Global app state** | Store | Auth status, theme, feature flags |
| **Derived state** | Computed | Filtered lists, totals, validation results |

These have different rules. Mixing them in one store is how state management becomes a swamp.

## The Decision Tree

When you need to add state, ask in order:

1. **Is this just for one component?** → `useState` (or equivalent local state). Done.
2. **Is it shared between siblings?** → Lift to the nearest common parent. Stop.
3. **Should it be in the URL?** (Filters, sort, pagination, tabs?) → URL params. Bookmarkable, refreshable, shareable. This is almost always right for navigation state.
4. **Is it data from a server?** → Server-state library (TanStack Query, SWR, RTK Query). Not the global store. Different problem.
5. **Is it truly cross-cutting and needed deep in the tree?** → Context (small, infrequent changes) or a global store (Zustand, Redux Toolkit, Jotai).

Most "global state" instincts are wrong. Most state is local, lifted, in the URL, or on the server.

## Derived State: Don't Store It

If a value can be computed from other state, compute it. Don't store it.

```tsx
// Bad — derived state stored
const [users, setUsers] = useState([]);
const [filteredUsers, setFilteredUsers] = useState([]);
const [filter, setFilter] = useState('');

useEffect(() => {
  setFilteredUsers(users.filter(u => u.name.includes(filter)));
}, [users, filter]);

// Good — derived state computed
const [users, setUsers] = useState([]);
const [filter, setFilter] = useState('');
const filteredUsers = users.filter(u => u.name.includes(filter));
```

Stored derived state goes out of sync. Computed derived state cannot.

## URL Is State

This is the most commonly missed category. If a user might want to:
- Refresh the page and stay where they were
- Share a link to "this view"
- Use the back button meaningfully
- Bookmark a filtered/sorted state

…then it belongs in the URL, not in component state and not in a global store.

Filter values, pagination cursors, selected tabs, sort orders, search queries, open modals tied to entities — all URL state.

## Server State Is Not Client State

Server state is a cache of someone else's truth. Treat it differently:

- Server state can become stale; client state cannot
- Server state can refetch; client state cannot
- Server state has loading and error states; client state usually doesn't
- Server state may be shared across many components; refetching for each is waste

Use a real library (TanStack Query, SWR). Do not put fetched data in a global store and treat it like client state — you'll reimplement caching, deduplication, retries, and stale-while-revalidate badly.

## Optimistic Updates

When the user takes an action that will probably succeed, update the UI immediately. Roll back on failure.

```tsx
// Optimistic update pattern (TanStack Query style)
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (newUser) => {
    await queryClient.cancelQueries(['user', newUser.id]);
    const previous = queryClient.getQueryData(['user', newUser.id]);
    queryClient.setQueryData(['user', newUser.id], newUser);
    return { previous };
  },
  onError: (err, newUser, context) => {
    queryClient.setQueryData(['user', newUser.id], context.previous);
    toast.error('Update failed; rolled back.');
  },
  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries(['user', variables.id]);
  },
});
```

Always: snapshot before, roll back on error, refetch to reconcile. Never optimistically update for high-risk operations (payments, deletions) — the rollback experience is worse than waiting.

## State Machines for Complex Flows

When a piece of UI has more than ~3 states and they're not boolean-combinable (loading + error + success isn't really 3 booleans — many combinations are invalid), reach for a state machine:

```
idle → submitting → (success | error)
                    error → idle
                    success → done
```

XState is the heavyweight option. A discriminated union and a reducer covers most cases without the dependency:

```ts
type State =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: Result }
  | { status: 'error'; error: Error };
```

This makes invalid states unrepresentable. No more "submitting and error at the same time" bugs.

## Output Format

When designing state for a feature:

1. **List the pieces of state** the feature needs
2. **Categorize each** using the table above
3. **Place each** using the decision tree
4. **Identify derived state** that should be computed, not stored
5. **For server state**: caching strategy, invalidation triggers, optimistic update plan
6. **For complex flows**: a state diagram or discriminated union

## Hand-Offs

- Backend state and consistency → `system-design.md`
- Database schema → `data-modeling.md`
- API contracts that serve the state → `api-design.md`
