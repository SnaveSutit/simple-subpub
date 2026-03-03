export const enum ERROR_MESSAGE {
	RecursivePublish = 'Subscribable callbacks cannot publish to the same subscribable, ignoring nested publish.',
	InvalidCount = 'Count must be a positive number.',
	NonIntegerCount = 'Count must be an integer.',
}

/**
 * An interface representing a subscribable object.
 * @template T The type of the value that is passed to the subscribers.
 */
export interface Subscribable<T> {
	/**
	 * Adds a subscriber callback that will be invoked when a value is published.
	 * @param callback Invoked when a value is published.
	 * @param once If true, removes the callback after the first invocation.
	 * @returns A function that removes the subscriber when called.
	 */
	subscribe: (callback: (value: T) => void, once?: boolean) => () => boolean
	/**
	 * Adds a subscriber callback that will be invoked once, then unsubscribed automatically.
	 * @param callback Invoked when a value is published.
	 * @returns A function that removes the subscriber when called.
	 */
	subscribeOnce: (callback: (value: T) => void) => () => boolean
	/**
	 * Publishes {@link value} to all subscribers.
	 * @throws If a subscriber of this subscribable tries to publish to this subscribable from within its callback.
	 */
	publish: (value: T) => void
	/**
	 * Removes a subscriber callback.
	 * @param callback The callback to remove.
	 * @param count The number of times to remove the callback. If not specified, removes all instances of the callback.
	 * @returns True if the callback was removed, false otherwise.
	 */
	unsubscribe: (callback: (value: T) => void, count?: number) => boolean
	/** Removes all subscriber callbacks. */
	unsubscribeAll: () => void
	/** Checks if a callback is currently subscribed. */
	has(callback: (value: T) => void): boolean
	/** Counts the number of times a callback is currently subscribed. */
	count(callback: (value: T) => void): number
	/** The number of subscribers currently registered. */
	subscriberCount: number
}

/**
 * Creates a subscribable object.
 * @template T The type of the value that is passed to the subscribers.
 */
export function subscribable<T>(): Subscribable<T> {
	const subscribers = new Set<{ callback: (value: T) => void; once: boolean }>()
	let publishing = false

	const subscribe = (callback: (value: T) => void, once = false) => {
		const subscriber = { callback, once }
		subscribers.add(subscriber)
		return () => subscribers.delete(subscriber)
	}

	const publish = (value: T) => {
		if (publishing) {
			throw new Error(ERROR_MESSAGE.RecursivePublish)
		}

		publishing = true
		try {
			for (const subscriber of subscribers) {
				subscriber.callback(value)
				if (subscriber.once) subscribers.delete(subscriber)
			}
		} finally {
			publishing = false
		}
	}

	const unsubscribe = (callback: (value: T) => void, count = Infinity) => {
		if (count <= 0) {
			throw new Error(ERROR_MESSAGE.InvalidCount)
		} else if (Number.isFinite(count) && !Number.isInteger(count)) {
			throw new Error(ERROR_MESSAGE.NonIntegerCount)
		}

		let removed = 0
		for (const subscriber of subscribers) {
			if (subscriber.callback === callback) {
				subscribers.delete(subscriber)
				if (++removed >= count) return true
			}
		}
		return removed > 0
	}

	const has = (callback: (value: T) => void) => {
		for (const subscriber of subscribers) {
			if (subscriber.callback === callback) return true
		}
		return false
	}

	const count = (callback: (value: T) => void) => {
		let result = 0
		for (const subscriber of subscribers) {
			if (subscriber.callback === callback) result++
		}
		return result
	}

	return {
		subscribe,
		subscribeOnce: callback => subscribe(callback, true),
		publish,
		unsubscribe,
		unsubscribeAll: () => subscribers.clear(),
		has,
		count,
		get subscriberCount() {
			return subscribers.size
		},
	}
}

export default subscribable
