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
	 * Publishes a {@link value} to all subscribers.
	 */
	publish: (value: T) => void
}

/**
 * Creates a subscribable object.
 * @template T The type of the value that is passed to the subscribers.
 */
export function subscribable<T>(): Subscribable<T> {
	const subscribers = new Set<(value: T) => void>()
	// Used to prevent recursive publishing
	let publishing = false

	const subscribeOnce = (callback: (value: T) => void) => {
		const wrappedCallback = (value: T) => {
			callback(value)
			subscribers.delete(wrappedCallback)
		}
		subscribers.add(wrappedCallback)
		return () => subscribers.delete(wrappedCallback)
	}

	const subscribe = (callback: (value: T) => void, once = false) => {
		if (once) return subscribeOnce(callback)

		subscribers.add(callback)
		return () => subscribers.delete(callback)
	}

	const publish = (value: T) => {
		if (publishing) {
			console.warn('Detected recursive subscription, ignoring nested publish.')
			console.trace('Detected recursive subscription')
			return
		}
		publishing = true
		subscribers.forEach(callback => callback(value))
		publishing = false
	}

	return { subscribe, subscribeOnce, publish }
}

export default subscribable
