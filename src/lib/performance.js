// Performance monitoring utilities

export class PerformanceMonitor {
	constructor() {
		this.metrics = {};
		this.observers = [];
	}

	// Start timing a performance metric
	start(name) {
		this.metrics[name] = { start: performance.now() };
	}

	// End timing a performance metric
	end(name) {
		if (this.metrics[name]) {
			this.metrics[name].end = performance.now();
			this.metrics[name].duration = this.metrics[name].end - this.metrics[name].start;
			console.log(`⏱️ ${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
			return this.metrics[name].duration;
		}
		return 0;
	}

	// Measure async function execution time
	async measure(name, fn) {
		this.start(name);
		try {
			const result = await fn();
			this.end(name);
			return result;
		} catch (error) {
			this.end(name);
			throw error;
		}
	}

	// Get all metrics
	getMetrics() {
		return this.metrics;
	}

	// Clear all metrics
	clear() {
		this.metrics = {};
	}

	// Monitor page load performance
	observePageLoad() {
		if (typeof window !== 'undefined') {
			// Navigation timing
			const navigation = performance.getEntriesByType('navigation')[0];
			if (navigation) {
				console.log('🚀 Page Load Metrics:');
				console.log(`  DNS: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
				console.log(`  TCP: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
				console.log(`  Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`);
				console.log(`  Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`);
				console.log(`  DOM: ${(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toFixed(2)}ms`);
				console.log(`  Load: ${(navigation.loadEventEnd - navigation.loadEventStart).toFixed(2)}ms`);
				console.log(`  Total: ${(navigation.loadEventEnd - navigation.navigationStart).toFixed(2)}ms`);
			}

			// Resource timing
			const resources = performance.getEntriesByType('resource');
			const slowResources = resources.filter(r => r.duration > 100);
			if (slowResources.length > 0) {
				console.log('🐌 Slow Resources:');
				slowResources.forEach(resource => {
					console.log(`  ${resource.name}: ${resource.duration.toFixed(2)}ms`);
				});
			}
		}
	}
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance hooks for Svelte
export function usePerformance() {
	return {
		start: (name) => performanceMonitor.start(name),
		end: (name) => performanceMonitor.end(name),
		measure: (name, fn) => performanceMonitor.measure(name, fn),
		getMetrics: () => performanceMonitor.getMetrics(),
		clear: () => performanceMonitor.clear()
	};
}
