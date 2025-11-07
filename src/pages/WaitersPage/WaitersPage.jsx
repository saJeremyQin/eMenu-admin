import React, { useEffect, useState } from 'react';
import styles from './WaitersPage.module.scss';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';

const client = generateClient();

const fetchWaiters = async () => {
	const query = /* GraphQL */ `
		query ListWaiters {
			listWaiters {
				id
				email
				createdAt
				status
				isDeleted
			}
		}
	`;
	const resp = await client.graphql({ query });
	return resp?.data?.listWaiters || [];
};

const inviteWaiter = async (email) => {
	const mutation = /* GraphQL */ `
		mutation InviteWaiter($email: String!) {
			inviteWaiter(email: $email) {
				id
				email
				status
			}
		}
	`;
	return client.graphql({ query: mutation, variables: { email } });
};

const WaitersPage = () => {
	const [waiters, setWaiters] = useState([]);
	const [loading, setLoading] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteLoading, setInviteLoading] = useState(false);
	const [inviteMsg, setInviteMsg] = useState('');
	const { authStatus } = useAuthenticator(context => [context.authStatus]);
	const isAuthenticated = authStatus === 'authenticated';

	const loadWaiters = async () => {
		setLoading(true);
		try {
			const data = await fetchWaiters();
			setWaiters(data);
		} catch (e) {
			// handle error
			console.error('Failed to load waiters', e);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (isAuthenticated) {
			loadWaiters();
		}
	}, [isAuthenticated]);

	const handleInvite = async (e) => {
		e.preventDefault();
		if (!inviteEmail) return;
		setInviteLoading(true);
		setInviteMsg('');
		try {
			await inviteWaiter(inviteEmail);
			setInviteMsg('Invite sent');
			setInviteEmail('');
			await loadWaiters();
		} catch (err) {
			setInviteMsg(err.message || 'Invite failed');
		}
		setInviteLoading(false);
	};

	return (
		<div className={styles.waitersPage}>
			<h2>Waiters</h2>
			<table className={styles.waitersTable}>
				<thead>
					<tr>
						<th>Email</th>
						<th>Registered At</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr><td colSpan={3}>Loading...</td></tr>
					) : waiters.length === 0 ? (
						<tr><td colSpan={3}>No waiters found.</td></tr>
					) : (
						waiters.map(w => (
							<tr key={w.id}>
								<td>{w.email}</td>
								<td>{w.createdAt ? new Date(w.createdAt).toLocaleString() : '-'}</td>
								<td>
									{w.isDeleted ? <span className={styles.statusDeleted}>Deleted</span> :
									 w.status === 'ACTIVE' ? <span className={styles.statusActive}>Active</span> :
									 <span className={styles.statusInvited}>Invited</span>}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
			<div className={styles.inviteSection}>
				<form onSubmit={handleInvite} className={styles.inviteForm}>
					<input
						type="email"
						placeholder="Input email of new waiter"
						value={inviteEmail}
						onChange={e => setInviteEmail(e.target.value)}
						disabled={inviteLoading}
						required
						className={styles.inviteInput}
					/>
					<button type="submit" disabled={inviteLoading || !inviteEmail} className={styles.inviteButton}>
						{inviteLoading ? 'Inviting...' : 'Invite'}
					</button>
				</form>
				{inviteMsg && <div className={styles.inviteMsg}>{inviteMsg}</div>}
			</div>
		</div>
	);
};

export default WaitersPage;
