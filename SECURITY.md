# Security and responsible use

Kavach is an attack tool pointed at **its own** target. Keep it that way.

- Every customer, order, PAN and phone number in `data/` is invented. The target's tools are pure functions over a local mock database: no network calls, no real payments.
- Only run the red squad against agents you own or are explicitly authorised to test. The attack library and prompts exist to harden your own bots.
- Keys live in `.env` and `agent_config.yaml`, both gitignored. `make setup` never prints a full key. If you paste logs into an issue, remove keys first.

## Reporting a vulnerability

If you find a way for Kavach itself to leak keys, reach the network from the target sandbox, or execute anything outside the mock tools, email harsh@dualmindlab.tech instead of opening a public issue. You will get a reply within a few days.
