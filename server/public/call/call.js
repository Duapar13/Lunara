// Visio maison Lunara : WebRTC dans la WebView de l'app, signalisation via notre Socket.io,
// relais TURN (coturn) si la connexion directe entre les deux téléphones échoue.
(() => {
  'use strict';

  // --- Paramètres passés par l'app dans le fragment (#), puis effacés de l'adresse ---
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  const consultationId = Number(params.get('c'));
  const token = params.get('t');
  const lang = params.get('lang') === 'fr' ? 'fr' : 'es';
  const peerName = params.get('peer') || '';
  let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  try {
    const raw = params.get('ice').replace(/-/g, '+').replace(/_/g, '/');
    iceServers = JSON.parse(atob(raw));
  } catch {
    /* STUN public seulement */
  }

  const TEXT = {
    es: {
      waiting: 'Esperando a {name}…',
      connecting: 'Conectando…',
      reconnecting: 'Conexión inestable, reconectando…',
      left: '{name} salió de la videollamada y puede volver a entrar.',
      ended: 'La videollamada terminó. ¡Gracias!',
      replaced: 'Abriste esta videollamada en otro lugar.',
      media: 'No pudimos acceder a tu cámara o micrófono. Revisa los permisos de la app.',
      invalid: 'Este enlace de videollamada ya no es válido.',
      muted: '{name} silenció su micrófono',
      camOff: '{name} apagó su cámara',
    },
    fr: {
      waiting: 'En attente de {name}…',
      connecting: 'Connexion…',
      reconnecting: 'Connexion instable, reconnexion…',
      left: '{name} a quitté la visio et peut revenir à tout moment.',
      ended: 'La visio est terminée. Merci !',
      replaced: 'Tu as ouvert cette visio ailleurs.',
      media: "Impossible d'accéder à ta caméra ou à ton micro. Vérifie les autorisations de l'app.",
      invalid: "Ce lien de visio n'est plus valide.",
      muted: '{name} a coupé son micro',
      camOff: '{name} a coupé sa caméra',
    },
  };
  const tr = (key) => TEXT[lang][key].replace('{name}', peerName);

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const remoteVideo = $('remote');
  const localVideo = $('local');
  document.documentElement.lang = lang;
  $('peer-name').textContent = peerName;
  $('peer-label').textContent = peerName;

  /** Prévient l'app React Native (fermeture de l'écran, etc.). */
  const notifyApp = (type) => {
    const message = JSON.stringify({ source: 'lunara-call', type });
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
    else if (window.parent !== window) window.parent.postMessage(message, '*'); // version web (iframe)
  };

  function setState(state, message) {
    stage.classList.remove('connected', 'ended', 'error');
    if (state !== 'waiting') stage.classList.add(state);
    $('status').textContent = message ?? '';
  }

  // --- Média local ---
  let localStream = null;
  let facing = 'user';

  async function startMedia() {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    localVideo.srcObject = localStream;
  }

  // --- Connexion WebRTC ---
  let pc = null;
  let pendingCandidates = [];
  let isInitiator = false;
  const socket = io({ auth: { token }, transports: ['websocket'] });
  const signal = (data) => socket.emit('call:signal', { consultationId, ...data });

  function closePeer() {
    if (pc) {
      pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = null;
      pc.close();
    }
    pc = null;
    pendingCandidates = [];
    remoteVideo.srcObject = null;
  }

  function createPeer() {
    closePeer();
    pc = new RTCPeerConnection({ iceServers });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    pc.ontrack = ({ streams }) => {
      if (remoteVideo.srcObject !== streams[0]) remoteVideo.srcObject = streams[0];
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signal({ candidate });
    };
    pc.onconnectionstatechange = () => {
      const state = pc?.connectionState;
      if (state === 'connected') {
        setState('connected');
        sendMediaState();
      } else if (state === 'disconnected') {
        setState('waiting', tr('reconnecting'));
      } else if (state === 'failed' && isInitiator) {
        // Relance la recherche de chemin réseau (passera par le relais TURN si besoin).
        setState('waiting', tr('reconnecting'));
        makeOffer({ iceRestart: true });
      }
    };
  }

  async function makeOffer({ fresh = false, iceRestart = false } = {}) {
    const offer = await pc.createOffer({ iceRestart });
    await pc.setLocalDescription(offer);
    signal({ description: pc.localDescription, fresh });
  }

  async function flushCandidates() {
    for (const candidate of pendingCandidates) await pc.addIceCandidate(candidate).catch(() => {});
    pendingCandidates = [];
  }

  socket.on('call:signal', async ({ description, candidate, fresh }) => {
    try {
      if (description?.type === 'offer') {
        // Nouvelle session (l'autre vient d'arriver) : on repart d'une connexion neuve.
        if (fresh || !pc) createPeer();
        isInitiator = false;
        await pc.setRemoteDescription(description);
        await flushCandidates();
        await pc.setLocalDescription(await pc.createAnswer());
        signal({ description: pc.localDescription });
      } else if (description?.type === 'answer' && pc) {
        await pc.setRemoteDescription(description);
        await flushCandidates();
      } else if (candidate) {
        if (pc?.remoteDescription) await pc.addIceCandidate(candidate).catch(() => {});
        else pendingCandidates.push(candidate);
      }
    } catch (err) {
      console.error('signal', err);
    }
  });

  // L'autre personne arrive : celle qui attendait lance la négociation.
  socket.on('call:peer-joined', async () => {
    isInitiator = true;
    setState('waiting', tr('connecting'));
    createPeer();
    await makeOffer({ fresh: true });
  });

  socket.on('call:peer-left', () => {
    closePeer();
    setState('waiting', tr('left'));
  });

  socket.on('call:media', ({ audio, video }) => {
    const banner = $('peer-muted');
    const msg = !audio ? tr('muted') : !video ? tr('camOff') : '';
    banner.textContent = msg;
    banner.classList.toggle('hidden', !msg);
  });

  socket.on('call:ended', () => finish('ended'));
  socket.on('call:replaced', () => finish('error', tr('replaced')));
  // Jeton refusé : lien expiré ou invalide. Les autres erreurs réseau se retentent toutes seules.
  socket.on('connect_error', (err) => {
    if (err?.message === 'unauthorized') finish('error', tr('invalid'));
  });

  // Reconnexion du socket (réseau coupé) : on rejoint à nouveau la salle.
  socket.on('connect', () => {
    if (localStream) join();
  });

  function join() {
    socket.emit('call:join', consultationId, (res) => {
      if (!res || res.error) return finish('error', res?.error || tr('invalid'));
      startTimer(new Date(res.endsAt).getTime() - 10 * 60_000);
      if (!res.peerPresent) setState('waiting', tr('waiting'));
      else setState('waiting', tr('connecting'));
    });
  }

  // --- Compte à rebours (la salle reste ouverte 10 min de marge côté serveur) ---
  let timerId = null;
  function startTimer(endAt) {
    clearInterval(timerId);
    const el = $('timer');
    const tick = () => {
      const left = Math.max(0, endAt - Date.now());
      const m = String(Math.floor(left / 60000)).padStart(2, '0');
      const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      el.textContent = `${m}:${s}`;
      el.classList.toggle('warn', left < 5 * 60_000);
    };
    tick();
    timerId = setInterval(tick, 1000);
  }

  let finished = false;
  function finish(state, message) {
    if (finished) return;
    finished = true;
    clearInterval(timerId);
    closePeer();
    localStream?.getTracks().forEach((t) => t.stop());
    socket.emit('call:leave');
    socket.disconnect();
    setState(state, message ?? tr('ended'));
    if (state === 'ended') setTimeout(() => notifyApp('ended'), 2500);
  }

  // --- Boutons ---
  function sendMediaState() {
    if (!localStream) return;
    socket.emit('call:media', {
      audio: localStream.getAudioTracks().some((t) => t.enabled),
      video: localStream.getVideoTracks().some((t) => t.enabled),
    });
  }

  $('mic').addEventListener('click', (e) => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    e.currentTarget.classList.toggle('off', !track.enabled);
    sendMediaState();
  });

  $('cam').addEventListener('click', (e) => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    e.currentTarget.classList.toggle('off', !track.enabled);
    localVideo.classList.toggle('off', !track.enabled);
    sendMediaState();
  });

  $('flip').addEventListener('click', async () => {
    try {
      facing = facing === 'user' ? 'environment' : 'user';
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      const newTrack = fresh.getVideoTracks()[0];
      const oldTrack = localStream.getVideoTracks()[0];
      newTrack.enabled = oldTrack?.enabled ?? true;
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
      await sender?.replaceTrack(newTrack);
      if (oldTrack) {
        localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStream.addTrack(newTrack);
      localVideo.srcObject = localStream;
      localVideo.classList.toggle('back', facing === 'environment');
    } catch (err) {
      console.error('flip', err);
    }
  });

  $('hangup').addEventListener('click', () => {
    if (!finished) {
      finished = true;
      clearInterval(timerId);
      closePeer();
      localStream?.getTracks().forEach((t) => t.stop());
      socket.emit('call:leave');
      socket.disconnect();
    }
    notifyApp('hangup');
  });

  // --- Démarrage ---
  (async () => {
    if (!consultationId || !token) return finish('error', tr('invalid'));
    setState('waiting', tr('connecting'));
    try {
      await startMedia();
    } catch (err) {
      console.error('media', err);
      return finish('error', tr('media'));
    }
    if (socket.connected) join();
  })();
})();
