function createWordlistWidget(containerId) {
  const container = document.getElementById(containerId);
  
  // Data structure
  let wordlist = {
    words: {},  // word -> {timestamps:[], recall:0-5, production:0-5, groups:[], lemma:null}
    version: 1
  };
  
  const STORAGE_KEY = 'zh_known_wordlist';
  
  // --- Storage functions ---
  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wordlist));
  }
  
  function loadLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) wordlist = JSON.parse(data);
    render();
  }
  
  function saveFile() {
    const blob = new Blob([JSON.stringify(wordlist, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wordlist_' + Date.now() + '.json';
    a.click();
  }
  
  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      wordlist = JSON.parse(e.target.result);
      saveLocal();
      render();
    };
    reader.readAsText(file);
  }
  
  // --- Word operations ---
  function addWord(word, group = 'default') {
    if (!word.trim()) return;
    word = word.trim();
    if (!wordlist.words[word]) {
      wordlist.words[word] = {
        timestamps: [Date.now()],
        recall: 0,
        production: 0,
        groups: [group],
        lemma: null
      };
    } else {
      wordlist.words[word].timestamps.push(Date.now());
    }
    saveLocal();
    render();
  }
  
  function updateRating(word, type, value) {
    if (wordlist.words[word]) {
      wordlist.words[word][type] = Math.max(0, Math.min(5, value));
      saveLocal();
      render();
    }
  }
  
  function removeWord(word) {
    delete wordlist.words[word];
    saveLocal();
    render();
  }
  
  function setLemma(word, lemma) {
    if (wordlist.words[word]) {
      wordlist.words[word].lemma = lemma || null;
      saveLocal();
    }
  }
  
  function toggleGroup(word, group) {
    const w = wordlist.words[word];
    if (!w) return;
    const idx = w.groups.indexOf(group);
    if (idx === -1) w.groups.push(group);
    else w.groups.splice(idx, 1);
    saveLocal();
    render();
  }
  
  // --- Render ---
  function render() {
    const words = Object.entries(wordlist.words);
    
    container.innerHTML = '';
    container.style.cssText = 'position:absolute;top:10px;left:10px;width:400px;background:#fff;border:1px solid #999;padding:10px;font-family:sans-serif;font-size:14px;';
    
    // Controls
    const controls = document.createElement('div');
    controls.innerHTML = `
      <input type="text" id="wl_input" placeholder="添加生词" style="width:200px;font-size:16px;">
      <button id="wl_add">+</button>
      <button id="wl_save">💾</button>
      <label style="margin-left:10px;"><input type="file" id="wl_load" accept=".json" style="width:80px;">📂</label>
    `;
    container.appendChild(controls);
    
    // Word list
    const list = document.createElement('div');
    list.style.cssText = 'margin-top:10px;max-height:400px;overflow-y:auto;';
    
    words.forEach(([word, data]) => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:4px 0;border-bottom:1px solid #eee;';
      
      const rDots = '●'.repeat(data.recall) + '○'.repeat(5 - data.recall);
      const pDots = '●'.repeat(data.production) + '○'.repeat(5 - data.production);
      const lastSeen = data.timestamps.length ? new Date(data.timestamps[data.timestamps.length - 1]).toLocaleDateString() : '-';
      
      row.innerHTML = `
        <span style="font-size:18px;">${word}</span>
        ${data.lemma ? `<span style="color:#888;font-size:12px;">(${data.lemma})</span>` : ''}
        <span style="float:right;font-size:11px;color:#666;">${lastSeen}</span>
        <br>
        <span style="font-size:12px;color:#555;">R:<span class="wl_r" data-w="${word}">${rDots}</span> P:<span class="wl_p" data-w="${word}">${pDots}</span></span>
        <span style="font-size:11px;color:#888;margin-left:10px;">${data.groups.join(',')}</span>
        <button class="wl_del" data-w="${word}" style="float:right;font-size:10px;">✕</button>
      `;
      list.appendChild(row);
    });
    
    container.appendChild(list);
    
    // Stats
    const stats = document.createElement('div');
    stats.style.cssText = 'margin-top:8px;font-size:12px;color:#666;';
    stats.textContent = `共 ${words.length} 词`;
    container.appendChild(stats);
    
    // Event bindings
    document.getElementById('wl_add').onclick = () => {
      addWord(document.getElementById('wl_input').value);
      document.getElementById('wl_input').value = '';
    };
    document.getElementById('wl_input').onkeydown = e => {
      if (e.key === 'Enter') document.getElementById('wl_add').click();
    };
    document.getElementById('wl_save').onclick = saveFile;
    document.getElementById('wl_load').onchange = e => {
      if (e.target.files[0]) loadFile(e.target.files[0]);
    };
    
    // Rating clicks (cycle 0-5)
    container.querySelectorAll('.wl_r').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => updateRating(el.dataset.w, 'recall', (wordlist.words[el.dataset.w].recall + 1) % 6);
    });
    container.querySelectorAll('.wl_p').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => updateRating(el.dataset.w, 'production', (wordlist.words[el.dataset.w].production + 1) % 6);
    });
    container.querySelectorAll('.wl_del').forEach(el => {
      el.onclick = () => removeWord(el.dataset.w);
    });
  }
  
  // --- Account storage stubs (implement with your backend) ---
  function saveAccount(endpoint) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(wordlist)
    });
  }
  
  function loadAccount(endpoint) {
    return fetch(endpoint)
      .then(r => r.json())
      .then(data => { wordlist = data; saveLocal(); render(); });
  }
  
  // Init
  loadLocal();
  
  // Expose API
  return {
    addWord,
    removeWord,
    updateRating,
    setLemma,
    toggleGroup,
    saveFile,
    loadFile,
    saveAccount,
    loadAccount,
    getData: () => wordlist
  };
}
