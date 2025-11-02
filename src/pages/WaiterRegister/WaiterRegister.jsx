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
          email
          status
          createdAt
        }
      }
    `;
    try {
      const resp = await client.graphql({ query: mutation, variables: { token, password } });
      // check for GraphQL errors
      if (resp?.errors && resp.errors.length > 0) {
        setError(resp.errors[0].message || 'Registration failed');
        setLoading(false);
        return;
      }
      const user = resp?.data?.registerWaiter;
      if (!user) {
        setError('Registration failed: no user returned');
        setLoading(false);
        return;
      }
      setSuccessMsg('Registration successful. Please log in.');
      // redirect to auth/login page after short delay
      setTimeout(() => navigate('/auth'), 1200);
    } catch (err) {
      // network / thrown errors
      setError(err.message || 'Registration failed');
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
