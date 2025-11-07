import React, { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './WaiterRegister.module.scss';

// Use API Key for unauthenticated registerWaiter mutation
const client = generateClient({
  authMode: 'apiKey'
});

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const WaiterRegister = () => {
  const query = useQuery();
  const token = query.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Helper: parse backend error string -> { code, friendly }
  const parseBackendError = (rawMsg) => {
    if (!rawMsg) return { code: '', friendly: 'Registration failed' };
    let code = '';
    let friendly = rawMsg;
    try {
      const parsed = JSON.parse(rawMsg);
      code = parsed?.code || '';
      friendly = parsed?.message || rawMsg;
    } catch {
      // Backend returns errors in format "CODE: message"
      code = rawMsg.split(':')[0];
      friendly = rawMsg.includes(':') ? rawMsg.split(':').slice(1).join(':').trim() : rawMsg;
    }
    // map codes to UX messages
    switch (code) {
      case 'INVITE_TOKEN_EXPIRED':
        return { code, friendly: 'This invite link has expired. Please ask your manager to send a new invitation.' };
      case 'INVITE_TOKEN_INVALID_OR_USED':
        return { code, friendly: 'This invite link is invalid or already used. Please ask your manager to send a new one.' };
      case 'WAITER_ALREADY_ACTIVE':
        return { code, friendly: 'You are already registered. Please sign in with your email and password.' };
      default:
        if (friendly.startsWith('Cannot register:')) {
          return { code: 'VALIDATION', friendly };
        }
        return { code: code || 'UNKNOWN', friendly: friendly || 'Registration failed' };
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link: token missing.');
    }
  }, [token]);

  const validatePasswords = () => {
    if (!password || !confirm) return 'Please enter password and confirm it.';
    if (password !== confirm) return 'Passwords do not match.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const clientSideErr = validatePasswords();
    if (clientSideErr) {
      setError(clientSideErr);
      return;
    }
    setLoading(true);
    const mutation = /* GraphQL */ `
      mutation RegisterWaiter($token: String!, $password: String!) {
        registerWaiter(token: $token, password: $password) {
          id
          cognitoId
          email
          role
          status
          createdAt
        }
      }
    `;
    try {
      // AppSync now reliably returns errors via VTL, use Amplify client directly
      const resp = await client.graphql({ query: mutation, variables: { token, password } });
      console.log('[registerWaiter] response', resp);
      
      // Check for GraphQL errors (now reliably returned by backend via VTL)
      if (resp?.errors && resp.errors.length > 0) {
        const { code, friendly } = parseBackendError(resp.errors[0]?.message);
        setError(friendly);
        if (code === 'WAITER_ALREADY_ACTIVE') setTimeout(() => navigate('/auth'), 1200);
        setLoading(false);
        return;
      }
      
      const user = resp?.data?.registerWaiter;
      if (!user) {
        setError('Registration failed: no user data returned');
        setLoading(false);
        return;
      }
      
      setSuccessMsg('Registration successful. Please log in.');
      setTimeout(() => navigate('/auth'), 1200);
    } catch (err) {
      console.error('[registerWaiter] error', err);
      // Network errors or thrown exceptions
      const first = err?.errors?.[0] || err?.data?.errors?.[0];
      const rawMsg = first?.message || err?.message || '';
      const { code, friendly } = parseBackendError(rawMsg);
      setError(friendly);
      if (code === 'WAITER_ALREADY_ACTIVE') setTimeout(() => navigate('/auth'), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>Welcome — waiter registration</div>
      {!token ? (
        <div className={styles.error}>Invalid invite link. Please check your email link.</div>
      ) : (
        <>
          <div className={styles.desc}>You were invited to register as a waiter. Please set your password to complete registration.</div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={styles.input}
                minLength={8}
              />
            </div>
            <div>
              <label className={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={styles.input}
                minLength={8}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            {successMsg && <div className={styles.success}>{successMsg}</div>}
            <div className={styles.buttonRow}>
              <button type="submit" disabled={loading} className={styles.button}>
                {loading ? 'Registering...' : 'Register'}
              </button>
              <button type="button" onClick={() => navigate('/auth')} className={styles.button + ' ' + styles.cancel}>
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default WaiterRegister;
