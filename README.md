# simple-subpub

A simple subscribable event system.

```ts
import subscribable from 'simple-subpub'
// OR
import { subscribable } from 'simple-subpub'

const event = subscribable<number>()
const unsubscribe = event.subscribe(data => {
	console.log('Received data:', data)
})
event.publish(42) // Logs: Received data: 42
unsubscribe()
```
