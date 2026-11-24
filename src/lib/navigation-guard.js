import { browser } from '$app/environment';
import { beforeNavigate } from '$app/navigation';

/**
 * Prompt the user before leaving a page that has unsaved data.
 *
 * Covers every "leave" path:
 *  - in-app navigation via SvelteKit's `beforeNavigate` — this includes
 *    browser back / forward buttons, touch swipe gestures, and any history
 *    navigation (all surface as `type: 'popstate'`), plus link clicks and
 *    `goto()`. Cancelled with `navigation.cancel()`.
 *  - hard reload / closing the tab / leaving the site entirely via the
 *    browser's native `beforeunload` dialog (a full unload cannot be
 *    cancelled from `beforeNavigate`, so we let the browser prompt).
 *
 * Call this during component initialisation (top level of `<script>`), as
 * required by `beforeNavigate`. It is SSR-safe: `beforeNavigate` is a no-op
 * on the server and the `window` listener is only added in the browser.
 *
 * `hasUnsavedData` should return `true` only when there is something worth
 * warning about (a filled form, generated output, uploaded files, etc.).
 *
 * @param {() => boolean} hasUnsavedData
 * @returns {() => void} a dispose function that removes the listeners.
 */
export function confirmOnLeave(hasUnsavedData) {
	// SSR has no navigation/unload to guard — register client-side only.
	if (!browser) return () => {};

	const beforeNav = (navigation) => {
		if (!hasUnsavedData()) return;
		// Full page unload (reload / close / external) is handled by beforeunload.
		if (navigation.willUnload) return;
		if (
			!window.confirm('You have unsaved data. Are you sure you want to leave this page?')
		) {
			// Blocks browser back / forward / swipe (popstate) and link/goto navigation.
			navigation.cancel();
		}
	};

	// Registered during component init, as required by beforeNavigate.
	beforeNavigate(beforeNav);

	const beforeUnload = (event) => {
		if (!hasUnsavedData()) return;
		// Triggers the browser's native "Leave site?" dialog on reload/close.
		event.preventDefault();
		// Chrome/Edge require returnValue to be set to show the dialog.
		event.returnValue = '';
	};

	window.addEventListener('beforeunload', beforeUnload);

	return () => {
		window.removeEventListener('beforeunload', beforeUnload);
	};
}
