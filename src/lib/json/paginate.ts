export interface PaginationResult {
	items: any[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export function paginateArray(data: any, page: number, pageSize: number): PaginationResult {
	const arr = Array.isArray(data) ? data : [];
	const total = arr.length;
	const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
	const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
	const start = (safePage - 1) * pageSize;
	const items = arr.slice(start, start + pageSize);
	return { items, total, page: safePage, pageSize, totalPages };
}
