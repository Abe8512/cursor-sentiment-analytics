
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '@/services/ErrorHandlingService';

const SUPABASE_URL = "https://yfufpcxkerovnijhodrr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdWZwY3hrZXJvdm5pamhvZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNjI3ODYsImV4cCI6MjA1NzgzODc4Nn0.1x7WAfVIvlm-KPy2q4eFylaVtdc5_ZJmlis5AMJ-Izc";

// Store connection status
let isSupabaseConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Create a supabase client with auto-refresh and retries
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    global: {
      fetch: async (url, options) => {
        console.log(`Supabase request to: ${url}`);
        
        // Check if we're offline before attempting the request
        if (errorHandler.isOffline) {
          console.warn(`Offline: Skipping request to ${url}`);
          throw new Error('You are currently offline');
        }
        
        try {
          // Implement retries with exponential backoff
          const maxRetries = 3;
          let retryCount = 0;
          let lastError;
          
          while (retryCount < maxRetries) {
            try {
              const response = await fetch(url, options);
              
              // Log successful requests
              if (response.ok) {
                console.log(`Supabase request successful: ${url}`);
                if (!isSupabaseConnected) {
                  isSupabaseConnected = true;
                  connectionAttempts = 0; // Reset connection attempts on success
                  // Dispatch a connection restored event
                  window.dispatchEvent(new CustomEvent('supabase-connection-restored'));
                }
                return response;
              } else {
                console.warn(`Supabase request failed with status ${response.status}: ${url}`);
                // Only log the first few characters of the response for debugging
                const responseText = await response.clone().text();
                console.warn(`Response preview: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
                
                // Handle invalid UUID format errors specifically
                if (responseText.includes("invalid input syntax for type uuid")) {
                  errorHandler.handleError({
                    message: 'Data format error',
                    technical: `UUID format error: ${responseText}`,
                    severity: 'error',
                    code: 'UUID_FORMAT_ERROR'
                  });
                  // Don't retry UUID errors as they require code fixes
                  throw new Error(`UUID format error: ${responseText}`);
                }
                
                // Handle specific error status codes
                if (response.status === 401 || response.status === 403) {
                  errorHandler.handleError({
                    message: 'Authentication error',
                    technical: `Status ${response.status}: ${responseText}`,
                    severity: 'warning',
                    code: 'AUTH_ERROR'
                  });
                } else if (response.status >= 500) {
                  errorHandler.handleError({
                    message: 'Server error',
                    technical: `Status ${response.status}: ${responseText}`,
                    severity: 'error',
                    code: 'SERVER_ERROR'
                  });
                }
                
                // If we get a 429 (too many requests), wait longer before retrying
                if (response.status === 429) {
                  await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
                  retryCount++;
                  continue;
                }
                
                // Return the error response to be handled by the caller
                return response;
              }
            } catch (error) {
              console.error(`Supabase fetch attempt ${retryCount + 1} failed:`, error);
              lastError = error;
              isSupabaseConnected = false;
              
              // Dispatch a connection lost event
              window.dispatchEvent(new CustomEvent('supabase-connection-lost', { 
                detail: { error, retryCount } 
              }));
              
              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
            }
          }
          
          // If we've exhausted retries, throw the last error
          connectionAttempts++; // Increment overall connection attempts
          
          // If we've exceeded max attempts, show a more permanent error
          if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            errorHandler.handleError({
              message: 'Unable to connect to the server',
              technical: lastError instanceof Error ? lastError.message : String(lastError),
              severity: 'critical',
              code: 'CONNECTION_FAILED',
              actionable: true,
              retry: async () => {
                connectionAttempts = 0; // Reset counter when user manually retries
                return checkSupabaseConnection();
              }
            });
          }
          
          throw lastError;
        } catch (error) {
          console.error(`Supabase request failed after retries: ${url}`, error);
          
          errorHandler.handleError({
            message: 'Database connection failed',
            technical: error instanceof Error ? error.message : String(error),
            severity: 'error',
            code: 'SUPABASE_CONNECTION',
            actionable: true,
            retry: async () => {
              // Try to ping the database again
              return checkSupabaseConnection();
            }
          });
          
          throw error;
        }
      }
    },
    db: {
      schema: 'public',
    },
  }
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  // Subscribe to connection status changes from the error handler
  errorHandler.onConnectionChange((online) => {
    if (online && !isSupabaseConnected) {
      // Try reconnecting when coming back online
      checkSupabaseConnection();
    }
  });
  
  // Also listen for visibility changes to retry connection when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isSupabaseConnected) {
      console.log('Tab became visible, checking connection...');
      checkSupabaseConnection();
    }
  });
}

// Improved helper to detect if Supabase is available
export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    
    // First try a simple ping query that should be fast and has minimal data transfer
    const { data: pingData, error: pingError } = await supabase
      .from('call_transcripts')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (pingError) {
      console.error('Supabase connection error (ping):', pingError);
      isSupabaseConnected = false;
      errorHandler.handleError({
        message: 'Unable to connect to the database',
        technical: pingError.message,
        severity: 'warning',
        code: 'DB_PING_FAILED',
      });
      return { connected: false, error: pingError };
    }
    
    // Connection is successful
    console.log('Supabase connection successful, found data:', pingData);
    isSupabaseConnected = true;
    connectionAttempts = 0; // Reset counter on successful connection
    
    // Notify the UI that connection is restored
    window.dispatchEvent(new CustomEvent('supabase-connection-restored'));
    
    // If we've successfully connected, show a success toast but only once
    if (!sessionStorage.getItem('connection-success-shown')) {
      toast.success("Connected to database", {
        description: "Data will now be saved and retrieved from the server.",
        duration: 3000,
      });
      sessionStorage.setItem('connection-success-shown', 'true');
    }
    
    return { connected: true, error: null };
  } catch (err) {
    console.error('Supabase connection error (exception):', err);
    isSupabaseConnected = false;
    
    // Show a toast notification when connection fails
    errorHandler.handleError({
      message: 'Database connection failed',
      technical: err instanceof Error ? err.message : String(err),
      severity: 'error',
      code: 'SUPABASE_CONNECTION',
      actionable: true,
      retry: checkSupabaseConnection
    });
    
    return { connected: false, error: err };
  }
};

// Check connection status
export const isConnected = () => isSupabaseConnected;

// Generate a proper anonymous user ID using the uuid library
export const generateAnonymousUserId = () => {
  // Generate a unique identifier using UUID v4
  const anonymousId = `anonymous-${uuidv4()}`;
  console.log('Generated anonymous user ID:', anonymousId);
  return anonymousId;
};

// Initialize connection check on module load
if (typeof window !== 'undefined') {
  // Don't block the app initialization, run connection check asynchronously
  setTimeout(() => {
    checkSupabaseConnection();
  }, 300);
}
