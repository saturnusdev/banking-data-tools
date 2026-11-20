import { redirect } from '@sveltejs/kit';

// The old YAML↔JSON converter is now part of the full YAML Tools toolbox.
// Keep this route working for existing links / bookmarks.
export function load() {
	throw redirect(302, '/yaml-tools');
}
