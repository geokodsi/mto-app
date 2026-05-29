(function () {
  console.log('MTO widget loaded');
  var cfg = window.mtoWidgetConfig || {};
  var scriptEl = document.currentScript || document.querySelector('script[data-job-id]');
  var jobId = cfg.jobId || (scriptEl && scriptEl.getAttribute('data-job-id'));
  var color = cfg.color || (scriptEl && scriptEl.getAttribute('data-color')) || '#6366f1';
  var jobTitle = cfg.jobTitle || (scriptEl && scriptEl.getAttribute('data-job-title')) || '';
  var baseUrl = cfg.baseUrl || (scriptEl && scriptEl.src ? scriptEl.src.replace('/widget.js', '') : window.location.origin);
  if (!jobId) return;

  function getEmoji(title) {
    var t = (title || '').toLowerCase();
    if (/engineer|developer|software|frontend|backend|fullstack|devops|sre/.test(t)) return '💻';
    if (/data|analyst|scientist|ml|ai|machine/.test(t)) return '📊';
    if (/design|ux|ui|creative/.test(t)) return '🎨';
    if (/market|growth|seo|content|social|brand/.test(t)) return '📣';
    if (/sales|account|revenue|bdr|sdr|ae|business dev/.test(t)) return '💼';
    if (/finance|account|cfo|bookkeep|controller/.test(t)) return '💰';
    if (/hr|recruit|people|talent|culture/.test(t)) return '👥';
    if (/customer|support|success|cx/.test(t)) return '🎧';
    if (/legal|counsel|compli|privacy/.test(t)) return '⚖️';
    if (/ops|operation|supply|logistics|product/.test(t)) return '⚙️';
    if (/manag|director|lead|head|vp|chief|ceo|cto/.test(t)) return '🚀';
    return '💼';
  }
  var emoji = getEmoji(jobTitle);

  function playPop(freq) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq || 800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime((freq || 800) / 2, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  }

  var style = document.createElement('style');
  style.textContent = [
    '@keyframes mto-slide-up{from{opacity:0;transform:translateY(18px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@keyframes mto-pulse-ring{0%{box-shadow:0 4px 16px rgba(99,102,241,.45),0 0 0 0 rgba(99,102,241,.35)}70%{box-shadow:0 4px 16px rgba(99,102,241,.45),0 0 0 12px rgba(99,102,241,0)}100%{box-shadow:0 4px 16px rgba(99,102,241,.45),0 0 0 0 rgba(99,102,241,0)}}',
    '@keyframes mto-slide-right{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes mto-slide-left{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes mto-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}',
    '@keyframes mto-check{0%{stroke-dashoffset:50}100%{stroke-dashoffset:0}}',
    '@keyframes mto-pop-in{0%{transform:scale(0) rotate(-10deg);opacity:0}80%{transform:scale(1.12) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}',
    '@keyframes mto-fade-in{from{opacity:0}to{opacity:1}}',
    '@keyframes mto-confetti-fall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(540deg);opacity:0}}',

    '#mto-btn{position:fixed;bottom:24px;right:24px;width:58px;height:58px;border-radius:50%;background:' + color + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s;animation:mto-pulse-ring 2.8s ease-out infinite;}',
    '#mto-btn:hover{transform:scale(1.1);animation:none;box-shadow:0 6px 24px rgba(99,102,241,.55)}',
    '#mto-btn svg{width:25px;height:25px;fill:white;pointer-events:none}',

    '#mto-modal{position:fixed;bottom:96px;right:24px;width:380px;max-height:590px;background:#fff;border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:2147483645;overflow:hidden;border:1px solid rgba(0,0,0,.07);transform-origin:bottom right}',
    '#mto-modal.mto-open{display:flex;animation:mto-slide-up .28s cubic-bezier(.22,1,.36,1) forwards}',

    '#mto-header{background:' + color + ';padding:14px 16px 0;color:#fff;flex-shrink:0}',
    '#mto-header-row{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px}',
    '#mto-header-left{display:flex;align-items:center;gap:10px}',
    '#mto-logo{width:32px;height:32px;background:rgba(255,255,255,.22);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;font-family:sans-serif}',
    '#mto-header-text h3{margin:0;font-size:14px;font-weight:700;font-family:sans-serif}',
    '#mto-header-text p{margin:0;font-size:11px;opacity:.65;font-family:sans-serif}',
    '#mto-close{background:rgba(255,255,255,.2);border:none;color:#fff;cursor:pointer;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;transition:background .15s;flex-shrink:0}',
    '#mto-close:hover{background:rgba(255,255,255,.32)}',

    '#mto-progress-wrap{padding:6px 0 10px}',
    '#mto-progress-track{height:3px;background:rgba(255,255,255,.22);border-radius:2px;overflow:hidden}',
    '#mto-progress-fill{height:100%;background:rgba(255,255,255,.85);border-radius:2px;width:0%;transition:width .55s ease}',
    '#mto-progress-label{font-size:10px;color:rgba(255,255,255,.7);font-family:sans-serif;margin-top:5px;letter-spacing:.3px}',

    '#mto-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px;font-family:sans-serif;scroll-behavior:smooth}',
    '#mto-messages::-webkit-scrollbar{width:4px}',
    '#mto-messages::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:2px}',

    '.mto-msg{max-width:85%;padding:10px 14px;font-size:13.5px;line-height:1.55;word-wrap:break-word}',
    '.mto-msg.ai{background:#f4f4f5;color:#111;align-self:flex-start;border-radius:4px 16px 16px 16px;animation:mto-slide-left .2s ease-out}',
    '.mto-msg.user{background:' + color + ';color:#fff;align-self:flex-end;border-radius:16px 4px 16px 16px;animation:mto-slide-right .2s ease-out}',

    '.mto-typing-wrap{align-self:flex-start;animation:mto-slide-left .2s ease-out}',
    '.mto-typing-lbl{font-size:10px;color:#aaa;font-family:sans-serif;margin-bottom:4px;padding-left:2px}',
    '.mto-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#f4f4f5;border-radius:4px 16px 16px 16px;width:fit-content}',
    '.mto-typing span{width:6px;height:6px;background:#ccc;border-radius:50%;animation:mto-bounce 1.2s infinite}',
    '.mto-typing span:nth-child(2){animation-delay:.2s}',
    '.mto-typing span:nth-child(3){animation-delay:.4s}',

    '#mto-input-area{padding:11px 13px;border-top:1px solid #f0f0f0;display:flex;gap:8px;background:#fff;flex-shrink:0}',
    '#mto-input{flex:1;border:1.5px solid #e5e7eb;border-radius:11px;padding:9px 13px;font-size:14px;outline:none;font-family:sans-serif;background:#fafafa;transition:border-color .15s,background .15s;min-width:0}',
    '#mto-input:focus{border-color:' + color + ';background:#fff}',
    '#mto-send{background:' + color + ';color:#fff;border:none;border-radius:11px;padding:9px 15px;cursor:pointer;font-size:13px;font-weight:600;font-family:sans-serif;transition:opacity .15s;flex-shrink:0}',
    '#mto-send:hover{opacity:.88}',
    '#mto-send:disabled{opacity:.35;cursor:not-allowed}',

    '#mto-end-screen,#mto-slots-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 28px;text-align:center;gap:0;animation:mto-fade-in .4s ease-out;overflow-y:auto}',
    '#mto-slots{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:18px}',
    '.mto-slot-btn{width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;background:#fff;border-radius:12px;font-size:13.5px;font-weight:600;color:#111;font-family:sans-serif;cursor:pointer;transition:border-color .15s,background .15s,color .15s}',
    '.mto-slot-btn:hover{border-color:' + color + ';background:' + color + ';color:#fff}',
    '.mto-slot-btn:disabled{opacity:.45;cursor:not-allowed}',
    '#mto-end-icon{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;animation:mto-pop-in .5s cubic-bezier(.22,1,.36,1)}',
    '#mto-end-icon.passed{background:#ecfdf5}',
    '#mto-end-icon.declined{background:#f8fafc;font-size:38px}',
    '.mto-check-svg{width:38px;height:38px}',
    '.mto-check-path{stroke:#10b981;stroke-width:3.5;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:50;stroke-dashoffset:50;animation:mto-check .5s ease-out .35s forwards}',
    '#mto-end-title{font-size:19px;font-weight:700;color:#111;margin:0 0 10px;font-family:sans-serif}',
    '#mto-end-sub{font-size:13px;color:#666;line-height:1.65;margin:0;font-family:sans-serif;max-width:270px}',

    '.mto-confetti{position:absolute;width:8px;height:8px;border-radius:2px;animation:mto-confetti-fall linear forwards;pointer-events:none}',

    '@media(max-width:480px){#mto-modal{width:calc(100vw - 20px);right:10px;bottom:82px;max-height:72vh;border-radius:18px}',
    '#mto-btn{right:14px;bottom:14px;width:52px;height:52px}',
    '.mto-msg{font-size:14.5px;max-width:90%}',
    '#mto-input{font-size:16px}}'
  ].join('');
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'mto-btn';
  btn.setAttribute('aria-label', 'Apply via MTO');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  document.body.appendChild(btn);

  var modal = document.createElement('div');
  modal.id = 'mto-modal';
  modal.innerHTML =
    '<div id="mto-header">' +
      '<div id="mto-header-row">' +
        '<div id="mto-header-left">' +
          '<div id="mto-logo">' + (emoji) + '</div>' +
          '<div id="mto-header-text"><h3>Apply for this role</h3><p>Powered by MTO AI</p></div>' +
        '</div>' +
        '<button id="mto-close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div id="mto-progress-wrap">' +
        '<div id="mto-progress-track"><div id="mto-progress-fill"></div></div>' +
        '<div id="mto-progress-label"></div>' +
      '</div>' +
    '</div>' +
    '<div id="mto-messages"></div>' +
    '<div id="mto-input-area">' +
      '<input id="mto-input" type="text" placeholder="Type your answer…" autocomplete="off" />' +
      '<button id="mto-send">Send</button>' +
    '</div>';
  document.body.appendChild(modal);

  var messages = [];
  var step = 'name';
  var candidateName = '';
  var candidateEmail = '';
  var candidateId = null;
  var isOpen = false;
  var isWaiting = false;

  function updateProgress(current, total) {
    if (!total) return;
    var pct = Math.round(Math.min((current - 1) / total * 100, 100));
    var fill = document.getElementById('mto-progress-fill');
    var label = document.getElementById('mto-progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = 'Question ' + current + ' of ' + total;
  }

  function spawnConfetti() {
    var colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    for (var i = 0; i < 18; i++) {
      (function (idx) {
        setTimeout(function () {
          var c = document.createElement('div');
          c.className = 'mto-confetti';
          c.style.cssText = [
            'left:' + (20 + Math.random() * 60) + '%',
            'top:' + (10 + Math.random() * 30) + '%',
            'background:' + colors[idx % colors.length],
            'animation-duration:' + (0.7 + Math.random() * 0.6) + 's',
            'animation-delay:' + (Math.random() * 0.3) + 's',
            'transform:rotate(' + (Math.random() * 360) + 'deg)'
          ].join(';');
          modal.appendChild(c);
          setTimeout(function () { c.remove(); }, 1500);
        }, idx * 55);
      })(i);
    }
  }

  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'mto-msg ' + (role === 'user' ? 'user' : 'ai');
    div.textContent = text;
    var msgs = document.getElementById('mto-messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    playPop(role === 'user' ? 700 : 600);
    return div;
  }

  function showTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'mto-typing-wrap';
    wrap.id = 'mto-typing';
    wrap.innerHTML = '<div class="mto-typing-lbl">MTO AI is typing…</div><div class="mto-typing"><span></span><span></span><span></span></div>';
    var msgs = document.getElementById('mto-messages');
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('mto-typing');
    if (t) t.remove();
  }

  function setInputDisabled(disabled) {
    var inp = document.getElementById('mto-input');
    var snd = document.getElementById('mto-send');
    if (inp) inp.disabled = disabled;
    if (snd) snd.disabled = disabled;
    if (!disabled && inp) setTimeout(function () { inp.focus(); }, 50);
  }

  function showEndScreen(passed) {
    var inputArea = document.getElementById('mto-input-area');
    if (inputArea) inputArea.style.display = 'none';

    var label = document.getElementById('mto-progress-label');
    var fill = document.getElementById('mto-progress-fill');
    if (fill) fill.style.width = '100%';
    if (label) label.textContent = passed ? 'Screening complete ✓' : 'Screening complete';

    var end = document.createElement('div');
    end.id = 'mto-end-screen';
    if (passed) {
      end.innerHTML =
        '<div id="mto-end-icon" class="passed">' +
          '<svg class="mto-check-svg" viewBox="0 0 40 40">' +
            '<path class="mto-check-path" d="M8 20 L16 28 L32 12"/>' +
          '</svg>' +
        '</div>' +
        '<p id="mto-end-title">You\'re through! 🎉</p>' +
        '<p id="mto-end-sub">Great news — you\'ve passed the initial screening. Our team will be in touch shortly to discuss next steps.</p>';
      setTimeout(spawnConfetti, 400);
    } else {
      end.innerHTML =
        '<div id="mto-end-icon" class="declined">🙏</div>' +
        '<p id="mto-end-title">Thank you!</p>' +
        '<p id="mto-end-sub">We\'ve received your application and will review it carefully. We\'ll reach out if there\'s a great fit.</p>';
    }

    var inputAreaRef = document.getElementById('mto-input-area');
    modal.insertBefore(end, inputAreaRef);
  }

  async function sendToAI(userMessage) {
    messages.push({ role: 'user', content: userMessage });
    setInputDisabled(true);
    showTyping();
    isWaiting = true;

    try {
      var res = await fetch(baseUrl + '/api/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: jobId, candidateId: candidateId, messages: messages })
      });
      var data = await res.json();
      removeTyping();

      if (data.questionNumber && data.totalQuestions) {
        updateProgress(data.questionNumber, data.totalQuestions);
      }

      if (data.message) {
        messages.push({ role: 'assistant', content: data.message });
        addMessage(data.message, 'ai');
      }

      if (data.done) {
        setInputDisabled(true);
        setTimeout(async function () { await scoreConversation(); }, 1400);
      } else {
        setInputDisabled(false);
      }
    } catch (e) {
      removeTyping();
      addMessage('Sorry, something went wrong. Please try again.', 'ai');
      setInputDisabled(false);
    }
    isWaiting = false;
  }

  async function scoreConversation() {
    console.log('Calling score API with candidateId:', candidateId);
    try {
      var res = await fetch(baseUrl + '/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: jobId, candidateId: candidateId, conversation: messages })
      });
      var data = await res.json();
      if (data.passed) {
        showSlotPicker();
      } else {
        showEndScreen(false);
      }
    } catch (e) {
      showEndScreen(false);
    }
  }

  function buildSlots() {
    function at(daysAhead, hour) {
      var d = new Date();
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, 0, 0, 0);
      return d;
    }
    return [at(1, 10), at(1, 14), at(2, 11)];
  }

  function formatSlot(d) {
    var datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    var timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return datePart + ' · ' + timePart;
  }

  function showSlotPicker() {
    var inputArea = document.getElementById('mto-input-area');
    if (inputArea) inputArea.style.display = 'none';

    var label = document.getElementById('mto-progress-label');
    var fill = document.getElementById('mto-progress-fill');
    if (fill) fill.style.width = '100%';
    if (label) label.textContent = 'Screening complete ✓';

    var slots = buildSlots();
    var wrap = document.createElement('div');
    wrap.id = 'mto-slots-screen';
    var html =
      '<div id="mto-end-icon" class="passed">' +
        '<svg class="mto-check-svg" viewBox="0 0 40 40"><path class="mto-check-path" d="M8 20 L16 28 L32 12"/></svg>' +
      '</div>' +
      '<p id="mto-end-title">You\'re through! 🎉</p>' +
      '<p id="mto-end-sub">Great news — you passed the screening. Pick a time for your interview:</p>' +
      '<div id="mto-slots">';
    for (var i = 0; i < slots.length; i++) {
      html += '<button class="mto-slot-btn" data-iso="' + slots[i].toISOString() + '">' + formatSlot(slots[i]) + '</button>';
    }
    html += '</div>';
    wrap.innerHTML = html;

    var inputAreaRef = document.getElementById('mto-input-area');
    modal.insertBefore(wrap, inputAreaRef);
    setTimeout(spawnConfetti, 400);

    var btns = wrap.querySelectorAll('.mto-slot-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener('click', function () {
        bookSlot(this.getAttribute('data-iso'), this.textContent);
      });
    }
  }

  async function bookSlot(iso, timeLabel) {
    var container = document.getElementById('mto-slots');
    if (container) {
      var btns = container.querySelectorAll('.mto-slot-btn');
      for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    }
    try {
      var res = await fetch(baseUrl + '/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidateId, jobId: jobId, slot: iso })
      });
      if (!res.ok) throw new Error('booking failed');
      showBookingConfirmed(timeLabel);
    } catch (e) {
      if (container) {
        var btns2 = container.querySelectorAll('.mto-slot-btn');
        for (var k = 0; k < btns2.length; k++) btns2[k].disabled = false;
      }
      var err = document.getElementById('mto-slot-err');
      if (!err && container) {
        err = document.createElement('p');
        err.id = 'mto-slot-err';
        err.style.cssText = 'color:#ef4444;font-size:12px;font-family:sans-serif;margin:10px 0 0';
        err.textContent = 'Could not book that slot. Please try again.';
        container.parentNode.appendChild(err);
      }
    }
  }

  function showBookingConfirmed(timeLabel) {
    var slotsScreen = document.getElementById('mto-slots-screen');
    if (slotsScreen) slotsScreen.remove();

    var end = document.createElement('div');
    end.id = 'mto-end-screen';
    end.innerHTML =
      '<div id="mto-end-icon" class="passed">' +
        '<svg class="mto-check-svg" viewBox="0 0 40 40"><path class="mto-check-path" d="M8 20 L16 28 L32 12"/></svg>' +
      '</div>' +
      '<p id="mto-end-title">Interview booked! 🎉</p>' +
      '<p id="mto-end-sub">Your interview is booked for ' + timeLabel + '. You will receive a confirmation email shortly.</p>';
    var inputAreaRef = document.getElementById('mto-input-area');
    modal.insertBefore(end, inputAreaRef);
    setTimeout(spawnConfetti, 300);
  }

  async function handleInput() {
    var input = document.getElementById('mto-input');
    var text = input.value.trim();
    if (!text || isWaiting) return;
    input.value = '';
    addMessage(text, 'user');

    if (step === 'name') {
      candidateName = text;
      step = 'email';
      setTimeout(function () {
        addMessage('Nice to meet you, ' + candidateName + '! What\'s your email address?', 'ai');
      }, 320);
    } else if (step === 'email') {
      candidateEmail = text;
      step = 'screening';
      setInputDisabled(true);
      showTyping();
      try {
        var res = await fetch(baseUrl + '/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: jobId, name: candidateName, email: candidateEmail })
        });
        var data = await res.json();
        candidateId = data.id;
        removeTyping();
        setInputDisabled(false);
        await sendToAI('Hello, my name is ' + candidateName + ' and my email is ' + candidateEmail + '. I am ready to start the screening.');
      } catch (e) {
        removeTyping();
        addMessage('Sorry, something went wrong. Please refresh and try again.', 'ai');
      }
    } else {
      await sendToAI(text);
    }
  }

  btn.addEventListener('click', function () {
    isOpen = !isOpen;
    if (isOpen) {
      modal.classList.add('mto-open');
      if (messages.length === 0) {
        setTimeout(function () {
          addMessage("Hi! I'm here to learn more about you for this role. What's your full name?", 'ai');
        }, 320);
      }
    } else {
      modal.classList.remove('mto-open');
    }
  });

  document.getElementById('mto-close').addEventListener('click', function () {
    isOpen = false;
    modal.classList.remove('mto-open');
  });

  document.getElementById('mto-send').addEventListener('click', handleInput);
  document.getElementById('mto-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') handleInput();
  });

  window.mtoOpenWidget = function() {
    isOpen = true;
    modal.style.display = 'flex';
    if (messages.length === 0) {
      setTimeout(() => addMessage('Hi! I am here to learn more about you for this role. What is your full name?', 'ai'), 300);
    }
  };
  console.log('mtoOpenWidget ready:', typeof window.mtoOpenWidget);
})();
