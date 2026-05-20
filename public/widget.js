(function() {
  var jobId = document.currentScript.getAttribute('data-job-id');
  var color = document.currentScript.getAttribute('data-color') || '#6366f1';
  var baseUrl = document.currentScript.src.replace('/widget.js', '');

  var style = document.createElement('style');
  style.textContent = `
    #mto-btn { position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(99,102,241,0.4); display:flex; align-items:center; justify-content:center; z-index:9999; transition:transform 0.2s,box-shadow 0.2s; }
    #mto-btn:hover { transform:scale(1.05); box-shadow:0 6px 20px rgba(99,102,241,0.5); }
    #mto-btn svg { width:24px; height:24px; fill:white; }
    #mto-modal { position:fixed; bottom:90px; right:24px; width:360px; max-height:560px; background:white; border-radius:20px; box-shadow:0 12px 40px rgba(0,0,0,0.15); display:none; flex-direction:column; z-index:9999; overflow:hidden; border:1px solid rgba(0,0,0,0.06); }
    #mto-header { background:${color}; padding:16px 18px; color:white; display:flex; align-items:center; justify-content:space-between; }
    #mto-header-left { display:flex; align-items:center; gap:10px; }
    #mto-logo { width:28px; height:28px; background:rgba(255,255,255,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; color:white; font-family:sans-serif; }
    #mto-header-text h3 { margin:0; font-size:14px; font-weight:700; font-family:sans-serif; }
    #mto-header-text p { margin:0; font-size:11px; opacity:0.7; font-family:sans-serif; }
    #mto-close { background:rgba(255,255,255,0.2); border:none; color:white; cursor:pointer; font-size:16px; padding:0; width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
    #mto-close:hover { background:rgba(255,255,255,0.3); }
    #mto-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; font-family:sans-serif; }
    .mto-msg { max-width:82%; padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.55; }
    .mto-msg.ai { background:#f4f4f5; color:#111; align-self:flex-start; border-bottom-left-radius:4px; }
    .mto-msg.user { background:${color}; color:white; align-self:flex-end; border-bottom-right-radius:4px; }
    #mto-input-area { padding:12px 14px; border-top:1px solid #f0f0f0; display:flex; gap:8px; background:white; }
    #mto-input { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:9px 13px; font-size:13px; outline:none; font-family:sans-serif; background:#fafafa; transition:border-color 0.15s,background 0.15s; }
    #mto-input:focus { border-color:${color}; background:white; }
    #mto-send { background:${color}; color:white; border:none; border-radius:10px; padding:9px 16px; cursor:pointer; font-size:13px; font-weight:600; font-family:sans-serif; transition:opacity 0.15s; }
    #mto-send:disabled { opacity:0.4; cursor:not-allowed; }
    .mto-typing { display:flex; gap:4px; align-items:center; padding:10px 14px; background:#f4f4f5; border-radius:14px; align-self:flex-start; border-bottom-left-radius:4px; }
    .mto-typing span { width:6px; height:6px; background:#aaa; border-radius:50%; animation:mto-bounce 1.2s infinite; }
    .mto-typing span:nth-child(2) { animation-delay:0.2s; }
    .mto-typing span:nth-child(3) { animation-delay:0.4s; }
    @keyframes mto-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    @media (max-width:480px) { #mto-modal { width:calc(100vw - 24px); right:12px; bottom:80px; } #mto-btn { right:16px; bottom:16px; } }
  `;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'mto-btn';
  btn.setAttribute('aria-label', 'Apply via MTO');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  document.body.appendChild(btn);

  var modal = document.createElement('div');
  modal.id = 'mto-modal';
  modal.innerHTML = `
    <div id="mto-header">
      <div id="mto-header-left">
        <div id="mto-logo">M</div>
        <div id="mto-header-text">
          <h3>Apply for this role</h3>
          <p>Powered by MTO</p>
        </div>
      </div>
      <button id="mto-close">✕</button>
    </div>
    <div id="mto-messages"></div>
    <div id="mto-input-area">
      <input id="mto-input" type="text" placeholder="Type your answer…" />
      <button id="mto-send">Send</button>
    </div>
  `;
  document.body.appendChild(modal);

  var messages = [];
  var step = 'name';
  var candidateName = '';
  var candidateEmail = '';
  var candidateId = null;
  var isOpen = false;
  var isWaiting = false;

  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'mto-msg ' + (role === 'user' ? 'user' : 'ai');
    div.textContent = text;
    var msgs = document.getElementById('mto-messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'mto-typing';
    div.id = 'mto-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    var msgs = document.getElementById('mto-messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    var t = document.getElementById('mto-typing');
    if (t) t.remove();
  }

  function setInputDisabled(disabled) {
    document.getElementById('mto-input').disabled = disabled;
    document.getElementById('mto-send').disabled = disabled;
    if (!disabled) document.getElementById('mto-input').focus();
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

      if (data.message) {
        messages.push({ role: 'assistant', content: data.message });
        addMessage(data.message, 'ai');
      }

      if (data.done) {
        setInputDisabled(true);
        await scoreConversation();
      } else {
        setInputDisabled(false);
      }
    } catch(e) {
      removeTyping();
      addMessage('Sorry, something went wrong. Please try again.', 'ai');
      setInputDisabled(false);
    }
    isWaiting = false;
  }

  async function scoreConversation() {
    try {
      var res = await fetch(baseUrl + '/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: jobId, candidateId: candidateId, conversation: messages })
      });
      var data = await res.json();
      if (data.passed) {
        addMessage('Great news! You passed the screening. Our team will be in touch shortly to schedule next steps. 🎉', 'ai');
      } else {
        addMessage('Thank you for your time. We\'ve received your application and will review it carefully.', 'ai');
      }
    } catch(e) {
      addMessage('Thank you for completing the screening!', 'ai');
    }
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
      setTimeout(function() {
        addMessage('Nice to meet you, ' + candidateName + '! What’s your email address?', 'ai');
      }, 300);
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
      } catch(e) {
        removeTyping();
        addMessage('Sorry, something went wrong. Please refresh and try again.', 'ai');
      }
    } else {
      await sendToAI(text);
    }
  }

  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    modal.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && messages.length === 0) {
      setTimeout(function() {
        addMessage('Hi! I’m here to learn more about you for this role. What’s your full name?', 'ai');
      }, 300);
    }
  });

  document.getElementById('mto-close').addEventListener('click', function() {
    isOpen = false;
    modal.style.display = 'none';
  });

  document.getElementById('mto-send').addEventListener('click', handleInput);
  document.getElementById('mto-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleInput();
  });
})();
