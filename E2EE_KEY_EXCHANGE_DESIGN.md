# TodoMessenger E2EE Key Exchange Design

This design replaces the current browser-only demo key with a multi-device model where the server stores public key material and encrypted key envelopes, but never plaintext message keys or private keys.

## Security Goals

- Each user can have multiple devices.
- Each device has its own cryptographic identity.
- New messages are encrypted with conversation/message keys on the sender device.
- Conversation keys are wrapped separately for every recipient device.
- The backend can route key material, but cannot decrypt chat contents.
- Device rotation and revocation are explicit backend operations.

## Device Key Material

Each signed-in device creates and keeps private keys locally:

- Identity key pair: long-lived device identity.
- Signed prekey pair: medium-lived key signed by the identity key.
- One-time prekeys: single-use public keys claimed by other devices.

The backend stores only public bundles:

- `identity_key`
- `signed_prekey`
- `signed_prekey_signature`
- `one_time_prekeys`

Private keys must stay in platform secure storage:

- Android: Android Keystore plus encrypted local storage.
- iOS later: Keychain/Secure Enclave where available.
- Web: IndexedDB with non-extractable `CryptoKey` objects where possible, plus device re-verification.

## Backend API

Implemented endpoints:

- `GET /api/e2ee/devices`
  Lists the signed-in user's registered devices.

- `POST /api/e2ee/devices`
  Registers or rotates a device public bundle and uploads one-time prekeys.

- `POST /api/e2ee/prekey-bundles`
  Claims recipient public prekey bundles for one or more workspace users.

- `GET /api/e2ee/conversations/:conversationId/key-envelopes?deviceId=...`
  Fetches encrypted conversation-key envelopes for the current user/device.

- `POST /api/e2ee/conversations/:conversationId/key-envelopes`
  Stores encrypted conversation-key envelopes for recipient devices.

## Message Flow

1. Sender opens a conversation.
2. Sender fetches recipient prekey bundles.
3. Sender verifies each signed prekey against the recipient device identity key.
4. Sender derives a shared secret per recipient device.
5. Sender creates or rotates a conversation key.
6. Sender encrypts the conversation key into a key envelope for each recipient device.
7. Sender uploads key envelopes to the backend.
8. Sender encrypts message body locally and uploads ciphertext.
9. Recipient device fetches its envelope and decrypts the conversation key locally.
10. Recipient decrypts message ciphertext locally.

## Production Requirements Still Needed

- Client-side X3DH-style handshake implementation.
- Double Ratchet or message-key ratcheting for forward secrecy.
- Device verification UX, such as safety numbers or QR verification.
- Device revocation and key rotation UI.
- Recovery policy: either no server recovery, or enterprise escrow with explicit admin policy.
- E2EE-aware Blu behavior. If Blu reads chat contents, users must explicitly opt in because AI processing breaks strict end-to-end secrecy.

## Important Product Decision

TodoMessenger has an AI assistant, Blu. Strict E2EE and AI reading chats are in tension:

- Strict privacy mode: Blu cannot read encrypted chats unless invited into a conversation as a cryptographic participant.
- AI assist mode: the client decrypts selected context locally and sends only approved snippets to Blu/backend.
- Enterprise mode: companies may choose managed keys or audit policies, but that must be explicit in onboarding and admin settings.

