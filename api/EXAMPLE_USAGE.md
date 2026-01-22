# Example: Protected API Endpoint with Auth

This example shows how to create a protected API endpoint that requires authentication.

## Create `/api/example-protected.ts`

```typescript
import { withAuth } from './lib/auth-middleware';

export default withAuth(async (req, res, user) => {
  // user.id and user.email are available here
  // Only authenticated users can access this endpoint
  
  return res.status(200).json({
    message: 'This is a protected endpoint',
    userId: user.id,
    email: user.email,
  });
});
```

## Create PRO-only endpoint `/api/example-pro-only.ts`

```typescript
import { withProAccess } from './lib/auth-middleware';

export default withProAccess(async (req, res, user) => {
  // Only PRO users can access this endpoint
  
  return res.status(200).json({
    message: 'This is a PRO-only feature',
    userId: user.id,
    premiumContent: 'Exclusive PRO content here',
  });
});
```

## Client-side usage (React)

```typescript
import { supabase } from '@/integrations/supabase/client';

async function callProtectedEndpoint() {
  // Get current user session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Call your protected API
  const response = await fetch('/api/example-protected', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // your data here
    }),
  });

  if (!response.ok) {
    throw new Error('API call failed');
  }

  return await response.json();
}
```

## Rate-limited endpoint example

```typescript
import { withAuth, checkRateLimit } from './lib/auth-middleware';

export default withAuth(async (req, res, user) => {
  // Check rate limit: max 10 requests per minute per user
  const { allowed, remaining } = await checkRateLimit(
    user.id,
    'expensive-operation',
    10, // max requests
    1   // window in minutes
  );

  if (!allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
    });
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Remaining', remaining.toString());

  // Process the request
  return res.status(200).json({
    message: 'Success',
    remaining,
  });
});
```
