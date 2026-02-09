/**
 * Authentication Middleware for Vercel Serverless Functions
 * 
 * Provides JWT token verification using Supabase
 * Use this middleware to protect your API endpoints
 * 
 * Usage:
 * import { withAuth } from './lib/auth-middleware';
 * 
 * export default withAuth(async (req, res, user) => {
 *   // user.id is available here
 *   return res.status(200).json({ userId: user.id });
 * });
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface AuthenticatedRequest extends VercelRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string; email: string; role?: string }
) => Promise<void | VercelResponse>;

/**
 * Middleware to verify Supabase JWT token
 * Adds user object to request if token is valid
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify token with Supabase
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': serviceRoleKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token verification failed:', errorText);
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          message: 'Please sign in again'
        });
      }

      const userData = await response.json();

      // Add user to request
      const user = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      };

      (req as AuthenticatedRequest).user = user;

      // Call the original handler with user data
      return await handler(req as AuthenticatedRequest, res, user);

    } catch (error: unknown) {
      console.error('Authentication error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        message: 'An error occurred while verifying your credentials'
      });
    }
  };
}

/**
 * Middleware to verify user has PRO access
 * Use this in addition to withAuth for PRO-only endpoints
 */
export function withProAccess(handler: AuthenticatedHandler) {
  return withAuth(async (req, res, user) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      // Check PRO status in database
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_pro,subscription_status,trial_ends_at`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to verify PRO status' });
      }

      const profiles = await response.json();
      
      if (!profiles || profiles.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const profile = profiles[0];
      
      // Check if user has PRO access
      const isActive = profile.subscription_status === 'active';
      const isTrialing =
        profile.subscription_status === 'trialing' &&
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) > new Date();
      const hasPro = profile.is_pro || isActive || isTrialing;

      if (!hasPro) {
        return res.status(403).json({ 
          error: 'PRO access required',
          message: 'This feature is only available for PRO users'
        });
      }

      // User has PRO access, continue to handler
      return await handler(req as AuthenticatedRequest, res, user);

    } catch (error: unknown) {
      console.error('PRO access verification error:', error);
      return res.status(500).json({ error: 'Failed to verify PRO access' });
    }
  });
}

/**
 * Rate limiting helper
 * Tracks requests by IP address or user ID
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number = 10,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // If env vars not configured, allow by default (fail open)
    return { allowed: true, remaining: maxRequests };
  }

  try {
    // Call rate limit check function in Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_identifier: identifier,
        p_action: action,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes,
      }),
    });

    if (!response.ok) {
      console.error('Rate limit check failed');
      return { allowed: true, remaining: maxRequests }; // Fail open
    }

    const result = await response.json();
    const allowed = result === true;

    return {
      allowed,
      remaining: allowed ? maxRequests - 1 : 0,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: maxRequests }; // Fail open
  }
}
