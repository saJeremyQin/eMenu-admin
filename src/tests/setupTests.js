import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Global cleanup and reset hooks for tests
afterEach(async () => {
	cleanup();
	// Dynamically import setter functions to avoid importing store modules at
	// setup time (which can pull in Amplify before test-level vi.mock calls).
	try {
		const mod = await import('../store/userSlice');
		if (mod && typeof mod.setApiClient === 'function') mod.setApiClient(null);
	} catch (e) {}
	try {
		const mod2 = await import('../store/restaurantSlice');
		if (mod2 && typeof mod2.setApiClient === 'function') mod2.setApiClient(null);
	} catch (e) {}
});
