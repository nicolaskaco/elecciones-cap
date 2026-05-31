---
name: no-useEffect
description: |
  Enforce the no-useEffect rule when writing or reviewing React code.
  ACTIVATE when writing React components, refactoring existing useEffect calls,
  reviewing PRs with useEffect, or when an agent adds useEffect "just in case."
  Provides the five replacement patterns and the useMountEffect escape hatch.
---

# No useEffect

Never call `useEffect` directly. Use derived state, event handlers, data-fetching libraries, or `useMountEffect` instead.

## Quick Reference

- Lint rule: `no-restricted-syntax` (configured to ban `useEffect`)
- React docs: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

| Instead of useEffect for... | Use |
|----------------------------|-----|
| Deriving state from other state/props | Inline computation (Rule 1) |
| Fetching data | `useQuery` / data-fetching library (Rule 2) |
| Responding to user actions | Event handlers (Rule 3) |
| One-time external sync on mount | `useMountEffect` (Rule 4) |
| Resetting state when a prop changes | `key` prop on parent (Rule 5) |

## When to Use This Skill

- Writing new React components
- Refactoring existing `useEffect` calls
- Reviewing PRs that introduce `useEffect`
- An agent adds `useEffect` "just in case"

## Workflow

### 1. Identify the useEffect

Determine what the effect is doing -- deriving state, fetching data, responding to an event, syncing with an external system, or resetting state.

### 2. Apply the Correct Replacement Pattern

Use the five rules below to pick the right replacement.

### 3. Verify

```bash
npm run lint
npm run build
```

## The Escape Hatch: useMountEffect

For the rare case where you need to sync with an external system on mount:

The implementation wraps `useEffect` with an empty dependency array to make intent explicit:

```jsx
export function useMountEffect(effect) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
```

## Replacement Patterns

### Rule 1: Derive state, do not sync it

Most effects that set state from other state are unnecessary and add extra renders.

```jsx
// BAD: Two render cycles - first stale, then filtered
const [products, setProducts] = useState([]);
const [filteredProducts, setFilteredProducts] = useState([]);
useEffect(() => {
  setFilteredProducts(products.filter((p) => p.inStock));
}, [products]);

// GOOD: Compute inline in one render
const [products, setProducts] = useState([]);
const filteredProducts = products.filter((p) => p.inStock);
```

**Smell test:** You are about to write `useEffect(() => setX(deriveFromY(y)), [y])`, or you have state that only mirrors other state or props.

### Rule 2: Use data-fetching libraries

Effect-based fetching creates race conditions and duplicated caching logic.

```jsx
// BAD: Race condition risk
useEffect(() => {
  fetchProduct(productId).then(setProduct);
}, [productId]);

// GOOD: Query library handles cancellation/caching/staleness
const { data: product } = useQuery(['product', productId], () =>
  fetchProduct(productId)
);
```

**Smell test:** Your effect does `fetch(...)` and then `setState(...)`, or you are re-implementing caching, retries, cancellation, or stale handling.

### Rule 3: Event handlers, not effects

If a user clicks a button, do the work in the handler.

```jsx
// BAD: Effect as an action relay
const [liked, setLiked] = useState(false);
useEffect(() => {
  if (liked) { postLike(); setLiked(false); }
}, [liked]);

// GOOD: Direct event-driven action
<button onClick={() => postLike()}>Like</button>
```

**Smell test:** State is used as a flag so an effect can do the real action.

### Rule 4: useMountEffect for one-time external sync

Good uses: DOM integration (focus, scroll), third-party widget lifecycles, browser API subscriptions.

```jsx
// BAD: Guard inside effect
useEffect(() => {
  if (!isLoading) playVideo();
}, [isLoading]);

// GOOD: Mount only when preconditions are met, use useMountEffect
function VideoPlayer() {
  useMountEffect(() => playVideo());
}
```

**Smell test:** You are synchronizing with an external system, and the behavior is naturally "setup on mount, cleanup on unmount."

### Rule 5: Reset with key, not dependency choreography

```jsx
// BAD: Effect attempts to emulate remount behavior
useEffect(() => { loadVideo(videoId); }, [videoId]);

// GOOD: key forces clean remount
<VideoPlayer key={videoId} videoId={videoId} />
```

**Smell test:** You are writing an effect whose only job is to reset local state when an ID/prop changes.

## Component Structure Convention

Computed values come after hooks and local state, never via `useEffect`:

```jsx
export function FeatureComponent({ featureId }) {
  // Hooks first
  const { data, isLoading } = useQueryFeature(featureId);

  // Local state
  const [isOpen, setIsOpen] = useState(false);

  // Computed values (NOT useEffect + setState)
  const displayName = user?.name ?? 'Unknown';

  // Event handlers
  const handleClick = () => { setIsOpen(true); };

  // Early returns
  if (isLoading) return <Loading />;

  // Render
  return <div>...</div>;
}
```
