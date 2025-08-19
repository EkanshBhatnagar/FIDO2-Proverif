// background.js
importScripts('lib/fido2-lib.min.js');

const f2l = new Fido2Lib();

//
// in-memory state to match calls
//
const challenges = {};  // requestId → { options, origin }

//
// listen for create/get
//
chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse)=>{
  if (msg.type==='webauthn-create') {
    try {
      const rp = msg.publicKey.rp;
      const user = msg.publicKey.user;
      const pubParams = msg.publicKey.pubKeyCredParams;
      const challenge = msg.publicKey.challenge;  // ArrayBuffer

      // 1) build our attestationOptions
      const opts = await f2l.attestationOptions({
        challenge,
        rp: { name: rp.name, id: rp.id },
        user: {
          id: new Uint8Array(user.id),  // must be BufferSource
          name: user.name,
          displayName: user.displayName
        },
        attestation: 'none',
        cryptoParams: pubParams.map(p=>p.alg)
      });

      // store for the finish step
      challenges[opts.challenge] = { options: opts, origin: new URL(msg.origin||'').hostname };

      // return options for the page to “sign” (we’ll do it ourselves)
      sendResponse({ options: serializeArrayBuffers(opts) });
    }
    catch(e) {
      sendResponse({ error: e.message });
    }
    return true; // async
  }

  else if (msg.type==='webauthn-get') {
    try {
      const challenge = msg.publicKey.challenge;
      const allowList = msg.publicKey.allowCredentials || [];
      // build assertionOptions
      const opts = await f2l.assertionOptions({
        challenge,
        timeout: msg.publicKey.timeout,
        allowCredentials: allowList.map(c=>({
          id: new Uint8Array(c.id),
          type: c.type,
          transports: c.transports
        }))
      });
      challenges[opts.challenge] = { options: opts };
      sendResponse({ options: serializeArrayBuffers(opts) });
    }
    catch(e) {
      sendResponse({ error: e.message });
    }
    return true;
  }

  else if (msg.type==='webauthn-create-response') {
    // page “creates” → we actually process attestation with f2l.attestationResult()
    const challenge = msg.response.requestPublicKey.challenge;
    const st = challenges[challenge];
    if (!st) {
      return sendResponse({ error: 'Unknown request' });
    }
    try {
      const attResp = msg.response; // { id, rawId, response: {attestationObject, clientDataJSON}, type }
      const result = await f2l.attestationResult(
        {
          rawId: new Uint8Array(attResp.rawId),
          response: {
            attestationObject: new Uint8Array(attResp.response.attestationObject),
            clientDataJSON: new Uint8Array(attResp.response.clientDataJSON)
          }
        },
        st.options
      );
      // result contains clientData, authnrData, publicKey, etc.
      // store the publicKey by credential ID:
      const credId = arrayBufferToBase64(new Uint8Array(attResp.rawId).buffer);
      const pubKey = result.authnrData.get("credentialPublicKeyPem");
      await chrome.storage.local.set({ [credId]: pubKey });

      sendResponse({ success: true, publicKey: pubKey });
    } catch(e) {
      sendResponse({ error: e.message });
    }
    return true;
  }

  else if (msg.type==='webauthn-get-response') {
    // page “gets” → we verify with f2l.assertionResult()
    const challenge = msg.response.requestPublicKey.challenge;
    const st = challenges[challenge];
    if (!st) {
      return sendResponse({ error: 'Unknown request' });
    }
    try {
      const asm = msg.response; // {id, rawId, response:{authenticatorData, clientDataJSON, signature, userHandle}}
      const credIdB64 = arrayBufferToBase64(new Uint8Array(asm.rawId).buffer);
      const stored = await chrome.storage.local.get(credIdB64);
      const pubkeyPem = stored[credIdB64];
      const result = await f2l.assertionResult(
        {
          rawId: new Uint8Array(asm.rawId),
          response: {
            clientDataJSON: new Uint8Array(asm.response.clientDataJSON),
            authenticatorData: new Uint8Array(asm.response.authenticatorData),
            signature: new Uint8Array(asm.response.signature),
            userHandle: asm.response.userHandle
              ? new Uint8Array(asm.response.userHandle)
              : undefined
          }
        },
        {
          challenge: st.options.challenge,
          origin: st.origin,
          factor: "either",
          publicKey: pubkeyPem
        }
      );
      sendResponse({ success: true });
    }
    catch(e) {
      sendResponse({ error: e.message });
    }
    return true;
  }
});

//––– helpers –––
function serializeArrayBuffers(obj) {
  if (obj instanceof ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(obj)))
           .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  if (Array.isArray(obj)) return obj.map(serializeArrayBuffers);
  if (obj && typeof obj==="object") {
    const o2 = {};
    for (let k in obj) o2[k] = serializeArrayBuffers(obj[k]);
    return o2;
  }
  return obj;
}

function arrayBufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
         .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}