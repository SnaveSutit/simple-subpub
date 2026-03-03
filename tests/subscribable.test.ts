import { describe, expect, test } from 'bun:test'
import { ERROR_MESSAGE, subscribable } from '../src'

describe('subscribable', () => {
	test('publishes values to all subscribers', () => {
		const values = Array.from({ length: 5 }, (_, i) => i * 10)
		const bus = subscribable<number>()
		const seenA: number[] = []
		const seenB: number[] = []

		bus.subscribe(value => seenA.push(value))
		bus.subscribe(value => seenB.push(value))

		for (const value of values) {
			bus.publish(value)
		}

		expect(seenA).toEqual(values)
		expect(seenB).toEqual(values)
	})

	test('unsubscribe removes regular subscriber and reports status', () => {
		const bus = subscribable<string>()
		const seen: string[] = []

		const unsubscribe = bus.subscribe(value => seen.push(value))

		bus.publish('first')
		expect(unsubscribe()).toBe(true)
		expect(unsubscribe()).toBe(false)
		bus.publish('second')

		expect(seen).toEqual(['first'])
	})

	test('subscribe with once=true only fires once', () => {
		const bus = subscribable<number>()
		const seen: number[] = []

		const unsubscribe = bus.subscribe(value => seen.push(value), true)

		bus.publish(1)
		bus.publish(2)

		expect(seen).toEqual([1])
		expect(unsubscribe()).toBe(false)
	})

	test('subscribeOnce only fires once', () => {
		const bus = subscribable<number>()
		const seen: number[] = []

		const unsubscribe = bus.subscribeOnce(value => seen.push(value))

		bus.publish(1)
		bus.publish(2)

		expect(seen).toEqual([1])
		expect(unsubscribe()).toBe(false)
	})

	test('subscribing with the same callback multiple times', () => {
		const bus = subscribable<number>()
		const seen: number[] = []
		const callback = (value: number) => seen.push(value)

		bus.subscribe(callback)
		bus.subscribe(callback)
		bus.publish(5)
		bus.publish(5)

		expect(seen).toEqual([5, 5, 5, 5])
	})

	test('subscribing to same callback twice with once=true only fires once per subscription', () => {
		const bus = subscribable<number>()
		const seen: number[] = []
		const callback = (value: number) => seen.push(value)

		bus.subscribe(callback, true)
		bus.subscribe(callback, true)
		bus.publish(5)
		bus.publish(5)

		expect(seen).toEqual([5, 5])
	})

	test('throws when a subscriber tries recursive publish', () => {
		const bus = subscribable<number>()

		bus.subscribe(value => value === 1 && bus.publish(1))

		expect(() => bus.publish(1)).toThrow(ERROR_MESSAGE.RecursivePublish)
	})

	test('resets publishing state when one subscriber throws', () => {
		const bus = subscribable<number>()
		const healthySeen: number[] = []

		bus.subscribe(value => {
			if (value === 1) throw new Error('boom')
		})
		bus.subscribe(value => healthySeen.push(value))

		expect(() => bus.publish(1)).toThrow('boom')
		expect(healthySeen).toEqual([])

		bus.publish(2)
		expect(healthySeen).toEqual([2])
	})

	test('subscriberCount reflects the number of subscribers', () => {
		const bus = subscribable<number>()

		expect(bus.subscriberCount).toBe(0)

		const unsubscribeA = bus.subscribe(() => undefined)
		expect(bus.subscriberCount).toBe(1)

		const unsubscribeB = bus.subscribe(() => undefined, true)
		expect(bus.subscriberCount).toBe(2)

		unsubscribeA()
		expect(bus.subscriberCount).toBe(1)

		unsubscribeB()
		expect(bus.subscriberCount).toBe(0)
	})

	test('has reflects whether callback is subscribed', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		expect(bus.has(callback)).toBe(false)

		const unsubscribe = bus.subscribe(callback)
		expect(bus.has(callback)).toBe(true)

		unsubscribe()
		expect(bus.has(callback)).toBe(false)
	})

	test('count tracks duplicate subscriptions and removals', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		expect(bus.count(callback)).toBe(0)

		bus.subscribe(callback)
		bus.subscribe(callback)
		bus.subscribe(callback, true)
		expect(bus.count(callback)).toBe(3)

		bus.unsubscribe(callback, 2)
		expect(bus.count(callback)).toBe(1)

		bus.publish(1)
		expect(bus.count(callback)).toBe(0)
	})

	test('has and count are reset by unsubscribeAll', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		bus.subscribe(callback)
		bus.subscribe(callback)
		expect(bus.has(callback)).toBe(true)
		expect(bus.count(callback)).toBe(2)

		bus.unsubscribeAll()

		expect(bus.has(callback)).toBe(false)
		expect(bus.count(callback)).toBe(0)
	})

	test('unsubscribe removes one matching callback when count=1', () => {
		const bus = subscribable<number>()
		const seen: number[] = []
		const callback = (value: number) => seen.push(value)

		bus.subscribe(callback)
		bus.subscribe(callback)

		expect(bus.subscriberCount).toBe(2)
		expect(bus.unsubscribe(callback, 1)).toBe(true)
		expect(bus.subscriberCount).toBe(1)

		bus.publish(7)
		expect(seen).toEqual([7])

		expect(bus.unsubscribe(callback, 1)).toBe(true)
		expect(bus.unsubscribe(callback)).toBe(false)
		expect(bus.subscriberCount).toBe(0)
	})

	test('unsubscribe removes all matching callbacks when count is omitted', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		bus.subscribe(callback)
		bus.subscribe(callback)
		bus.subscribe(callback)

		expect(bus.subscriberCount).toBe(3)
		expect(bus.unsubscribe(callback)).toBe(true)
		expect(bus.subscriberCount).toBe(0)
		expect(bus.unsubscribe(callback)).toBe(false)
	})

	test('throws when unsubscribe with count<=0', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		bus.subscribe(callback)
		bus.subscribe(callback)

		expect(() => bus.unsubscribe(callback, 0)).toThrow(ERROR_MESSAGE.InvalidCount)
		expect(() => bus.unsubscribe(callback, -1)).toThrow(ERROR_MESSAGE.InvalidCount)
		expect(() => bus.unsubscribe(callback, -Infinity)).toThrow(ERROR_MESSAGE.InvalidCount)
		expect(bus.subscriberCount).toBe(2)
	})

	test('unsubscribe returns false when callback does not exist', () => {
		const bus = subscribable<number>()
		const callback = (_value: number) => undefined

		expect(bus.unsubscribe(callback)).toBe(false)
	})

	test('unsubscribeAll clears all subscribers and prevents further notifications', () => {
		const bus = subscribable<number>()
		const seen: number[] = []

		bus.subscribe(value => seen.push(value))
		bus.subscribeOnce(value => seen.push(value))

		expect(bus.subscriberCount).toBe(2)

		bus.unsubscribeAll()
		expect(bus.subscriberCount).toBe(0)

		bus.publish(123)
		expect(seen).toEqual([])
	})
})
