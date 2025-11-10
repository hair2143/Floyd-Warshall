// fw.js — Floyd–Warshall implementation with simple UI wiring and SVG visualization
(function(){
  const INF = Number.POSITIVE_INFINITY;

  // DOM
  const nodeCountEl = document.getElementById('nodeCount');
  const applySizeBtn = document.getElementById('applySize');
  const randomFillBtn = document.getElementById('randomFill');
  const runBtn = document.getElementById('runFW');
  const clearBtn = document.getElementById('clear');
  const matrixInput = document.getElementById('matrixInput');
  const distTable = document.getElementById('distTable');
  const nextTable = document.getElementById('nextTable');
  const fromNode = document.getElementById('fromNode');
  const toNode = document.getElementById('toNode');
  const showPathBtn = document.getElementById('showPath');
  const pathResult = document.getElementById('pathResult');
  const svg = document.getElementById('graphSvg');

  // new controls (may be undefined in older HTML until added)
  const vertexNamesInput = document.getElementById('vertexNames');
  const edgeTypeSelect = document.getElementById('edgeType');
  const weightModeSelect = document.getElementById('weightMode');
  const allowNegativeCheckbox = document.getElementById('allowNegative');
  const fileInput = document.getElementById('fileInput');
  const exportCsvBtn = document.getElementById('exportCsv');

  let lastDist=null, lastNext=null, lastN=0;

  // Helpers
  function parseMatrix(text,n){
    const rows = text.trim().split(/[\n\r]+/).map(r => r.trim()).filter(Boolean);
    const mat = Array.from({length:n},()=>Array(n).fill(INF));
    for(let i=0;i<n;i++){
      if(i<rows.length){
        const cols = rows[i].split(/[,\s]+/).filter(Boolean);
        for(let j=0;j<Math.min(n,cols.length);j++){
          const v = cols[j].toUpperCase();
          if(v===''||v==='INF' || v==='-') { mat[i][j]=INF; }
          else { const num = Number(cols[j]); mat[i][j] = Number.isFinite(num)?num:INF; }
        }
      }
    }
    // default diagonal 0
    for(let i=0;i<n;i++) mat[i][i]=0;
    return mat;
  }

  function matrixToText(mat){
    return mat.map(r=>r.map(x=> x===INF? 'INF' : String(x)).join(' ')).join('\n');
  }

  // Floyd–Warshall with next matrix for path reconstruction
  // Handles negative weights and marks paths affected by negative cycles as 'NEG CYCLE'.
  function floydWarshall(n, mat, allowNegative) {
    // Step 1: Initialize dist and next matrices
    const dist = Array.from({length: n}, (_, i) => Array(n).fill(INF));
    const next = Array.from({length: n}, () => Array(n).fill(null));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          dist[i][j] = 0;
          // set next on diagonal to self index for clarity; UI will show '0' for diagonal
          next[i][j] = i;
        } else if (mat[i][j] !== INF) {
          dist[i][j] = mat[i][j];
          next[i][j] = j;
        }
      }
    }

    // Step 2: Iteratively improve shortest paths using each node k as intermediate
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] !== INF && dist[k][j] !== INF) {
            if (dist[i][k] + dist[k][j] < dist[i][j]) {
              dist[i][j] = dist[i][k] + dist[k][j];
              next[i][j] = next[i][k];
            }
          }
        }
      }
    }

    // Step 3: Detect negative cycles
    let negativeCycle = false;
    const negCycleNodes = [];
    for (let i = 0; i < n; i++) {
      if (dist[i][i] < 0) {
        negativeCycle = true;
        negCycleNodes.push(i);
      }
    }

    // Step 4: Mark all pairs affected by negative cycles
    // If there is a path from i to a negative cycle node and from that node to j, then dist[i][j] = -Infinity and next[i][j] = 'NEG CYCLE'
    if (allowNegative && negativeCycle) {
      for (let k of negCycleNodes) {
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (dist[i][k] !== INF && dist[k][j] !== INF) {
              dist[i][j] = -Infinity;
              next[i][j] = 'NEG CYCLE';
            }
          }
        }
      }
    }
    return { dist, next, negativeCycle };
  }

  function reconstructPath(u,v,next){
    if(next[u][v]===null) return null;
    const path=[u];
    while(u!==v){
      u = next[u][v];
      if(u===null) return null;
      path.push(u);
      if(path.length>200) return null; // safety
    }
    return path;
  }

  // UI table render
  function renderMatrixTable(container,mat, labels, isNextMatrix){
    container.innerHTML='';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    hrow.appendChild(document.createElement('th'));
    for(let j=0;j<mat.length;j++){
      const th = document.createElement('th'); th.textContent = labels?labels[j]:j; hrow.appendChild(th);
    }
    thead.appendChild(hrow); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for(let i=0;i<mat.length;i++){
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.textContent = labels?labels[i]:i; tr.appendChild(th);
      for(let j=0;j<mat.length;j++){
        const td = document.createElement('td');
        if(isNextMatrix){
          if(i===j){
            // show 0 on diagonal of next matrix to indicate self
            td.textContent = '0';
          } else if(mat[i][j] === 'NEG CYCLE'){
            td.textContent = 'NEG CYCLE';
            td.className = 'negcycle';
          } else if(mat[i][j]===null||mat[i][j]===INF){
            td.textContent = 'INF';
            td.className = 'inf';
          } else {
            // Show vertex name or index
            const names = labels;
            td.textContent = (names && names[mat[i][j]] !== undefined) ? names[mat[i][j]] : String(mat[i][j]);
          }
        } else {
          if(mat[i][j] === -Infinity){
            td.textContent = 'NEG CYCLE';
            td.className = 'negcycle';
          } else if(mat[i][j]===INF||mat[i][j]===null){
            td.textContent = 'INF';
            td.className = 'inf';
          } else {
            td.textContent = String(mat[i][j]);
          }
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); container.appendChild(table);
  }

  // SVG drawing (simple circular layout, improved label placement to avoid overlap)
  function drawGraph(n, mat, path){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const w = svg.clientWidth, h=svg.clientHeight; const cx=w/2, cy=h/2; const r=Math.min(w,h)/2 - 50;
    const coords = [];
    for(let i=0;i<n;i++){
      const a = (i/n) * Math.PI * 2 - Math.PI/2;
      coords.push({x: cx + r*Math.cos(a), y: cy + r*Math.sin(a)});
    }
    // edges — draw lines and place readable labels
    // We'll avoid overlapping labels by placing them perpendicular to the edge.
    // For bidirectional edges we place two labels on opposite sides of the line.
    const processed = new Set();
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++){
        if(i===j) continue;
        if(mat[i][j]===INF) continue;
        const pairKey = `${i},${j}`;
        if(processed.has(pairKey)) continue;

        const x1 = coords[i].x, y1 = coords[i].y;
        const x2 = coords[j].x, y2 = coords[j].y;

        // draw the edge line
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1',x1); line.setAttribute('y1',y1);
        line.setAttribute('x2',x2); line.setAttribute('y2',y2);
        line.setAttribute('stroke','#cbd5e1'); line.setAttribute('stroke-width','1.5');
        if(path && inPathEdge(path,i,j)) { line.setAttribute('stroke','#ef4444'); line.setAttribute('stroke-width','3'); }
        svg.appendChild(line);

        // compute midpoint and perpendicular offset
        const mx = (x1 + x2)/2, my = (y1 + y2)/2;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        // perp vector (normalized)
        const px = -dy / len, py = dx / len;

        // If the reverse edge exists, draw two labels offset in opposite directions
        if(mat[j][i] !== INF){
          // mark both directions processed so we don't duplicate when j,i loop runs
          processed.add(`${i},${j}`);
          processed.add(`${j},${i}`);

          // label for i->j (offset one side)
          const off = 14; // pixels
          const tx1 = mx + px * off;
          const ty1 = my + py * off;
          const t1 = document.createElementNS('http://www.w3.org/2000/svg','text');
          t1.setAttribute('x',tx1); t1.setAttribute('y',ty1);
          t1.setAttribute('fill','#083344'); t1.setAttribute('font-size','12');
          t1.setAttribute('text-anchor','middle');
          t1.setAttribute('dominant-baseline','middle');
          t1.setAttribute('paint-order','stroke'); t1.setAttribute('stroke','#fff'); t1.setAttribute('stroke-width','3');
          t1.textContent = String(mat[i][j]);
          svg.appendChild(t1);

          // label for j->i (offset opposite side)
          const tx2 = mx - px * off;
          const ty2 = my - py * off;
          const t2 = document.createElementNS('http://www.w3.org/2000/svg','text');
          t2.setAttribute('x',tx2); t2.setAttribute('y',ty2);
          t2.setAttribute('fill','#083344'); t2.setAttribute('font-size','12');
          t2.setAttribute('text-anchor','middle');
          t2.setAttribute('dominant-baseline','middle');
          t2.setAttribute('paint-order','stroke'); t2.setAttribute('stroke','#fff'); t2.setAttribute('stroke-width','3');
          t2.textContent = String(mat[j][i]);
          svg.appendChild(t2);
        } else {
          // single directed edge — label on the perpendicular with a small offset
          processed.add(pairKey);
          const off = 8;
          const tx = mx + px * off;
          const ty = my + py * off;
          const t = document.createElementNS('http://www.w3.org/2000/svg','text');
          t.setAttribute('x',tx); t.setAttribute('y',ty);
          t.setAttribute('fill','#083344'); t.setAttribute('font-size','12');
          t.setAttribute('text-anchor','middle');
          t.setAttribute('dominant-baseline','middle');
          t.setAttribute('paint-order','stroke'); t.setAttribute('stroke','#fff'); t.setAttribute('stroke-width','3');
          t.textContent = String(mat[i][j]);
          svg.appendChild(t);
        }
      }
    }
    // nodes
    for(let i=0;i<n;i++){
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('cx',coords[i].x); circle.setAttribute('cy',coords[i].y); circle.setAttribute('r',18);
      circle.setAttribute('fill', '#fff'); circle.setAttribute('stroke','#0f172a'); circle.setAttribute('stroke-width','1.5');
      g.appendChild(circle);
      const text = document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('x',coords[i].x); text.setAttribute('y',coords[i].y+5); text.setAttribute('text-anchor','middle');
      text.setAttribute('font-size','12'); text.textContent = labelOf(i);
      g.appendChild(text);
      svg.appendChild(g);
    }
  }

  function inPathEdge(path,i,j){
    for(let k=0;k+1<path.length;k++) if(path[k]===i && path[k+1]===j) return true; return false;
  }

  // Use vertexNames everywhere, fallback to index if missing
  function labelOf(i){
    const names = getVertexNames(lastN);
    return (names && names[i]) ? names[i] : String(i);
  }

  // UI wiring
  function getVertexNames(n){
    // Build a names array of length n. If the user input is missing or contains empty
    // entries, fill them using defaults: A..Z then 1,2,3... Defaults avoid colliding
    // with any explicitly provided names.
    const arr = Array.from({length: n}, ()=>'');
    if(vertexNamesInput){
      const raw = vertexNamesInput.value || '';
      if(raw.trim()){
        const parts = raw.split(',').map(s=>s.trim());
        for(let i=0;i<Math.min(parts.length,n);i++) arr[i] = parts[i];
      }
    }

    // Prepare a generator for default labels: A..Z then 1,2,3...
    function* defaultLabels(){
      for(let i=0;i<26;i++) yield String.fromCharCode(65 + i);
      let num = 1;
      while(true) yield String(num++);
    }

    const used = new Set();
    for(const s of arr){ if(s && s.trim()) used.add(s.trim()); }

    const gen = defaultLabels();
    for(let i=0;i<n;i++){
      if(arr[i] && arr[i].trim()) continue; // keep user-provided value
      // find next default that's not already used
      let next = gen.next().value;
      while(used.has(next)) next = gen.next().value;
      arr[i] = next;
      used.add(next);
    }
    return arr.slice(0,n);
  }

  // Update node selects when vertex names change
  if(vertexNamesInput){
    vertexNamesInput.addEventListener('input', function(){
      const n = Math.max(1, Math.floor(Number(nodeCountEl.value)||1));
      populateNodeSelects(n);
    });
  }

  function populateNodeSelects(n){
    fromNode.innerHTML=''; toNode.innerHTML='';
    const names = getVertexNames(n);
    for(let i=0;i<n;i++){
      const lab = (names[i] !== undefined && names[i] !== '') ? names[i] : String(i);
      const opt1 = document.createElement('option'); opt1.value=i; opt1.textContent=lab; fromNode.appendChild(opt1);
      const opt2 = document.createElement('option'); opt2.value=i; opt2.textContent=lab; toNode.appendChild(opt2);
    }
  }

  function applySize(){
    const n = Math.max(1, Math.floor(Number(nodeCountEl.value)||1));
    nodeCountEl.value = n; populateNodeSelects(n);
    // create an empty adjacency matrix text
    const rows = [];
    for(let i=0;i<n;i++){
      const cols = []; for(let j=0;j<n;j++){ cols.push(i===j? '0' : 'INF'); }
      rows.push(cols.join(' '));
    }
    matrixInput.value = rows.join('\n');
  }

  function randomFill(){
    const n = Math.max(1, Math.floor(Number(nodeCountEl.value)||1));
    const rows = [];
    const undirected = edgeTypeSelect && edgeTypeSelect.value === 'undirected';
    // fill a temp matrix then mirror if undirected
    const tmp = Array.from({length:n},()=>Array(n).fill('INF'));
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++){
        if(i===j) tmp[i][j] = '0';
        else if(Math.random() < 0.5) tmp[i][j] = 'INF';
        else {
          const v = Math.floor(Math.random()*10)+1;
          tmp[i][j] = String((allowNegativeCheckbox && Math.random()<0.2) ? -v : v);
        }
      }
    }
    if(undirected){
      for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
        const a = tmp[i][j]==='INF'? INF : Number(tmp[i][j]);
        const b = tmp[j][i]==='INF'? INF : Number(tmp[j][i]);
        const pick = (a===INF && b!==INF) ? b : (b===INF && a!==INF ? a : Math.min(a,b));
        tmp[i][j] = tmp[j][i] = (pick===INF? 'INF' : String(pick));
      }
    }
    for(let i=0;i<n;i++) rows.push(tmp[i].join(' '));
    matrixInput.value = rows.join('\n');
  }

  // Dynamic negative value warning and validation
  function checkNegativeInput(){
    const n = Math.max(1, Math.floor(Number(nodeCountEl.value)||1));
    let mat = parseMatrix(matrixInput.value, n);
    let hasNegative = false;
    for(let i=0;i<n;i++) for(let j=0;j<n;j++){
      if(mat[i][j] < 0) hasNegative = true;
    }
    if(!allowNegativeCheckbox.checked && hasNegative){
      matrixInput.classList.add('negative-warning');
      // Show a small warning popup (non-blocking)
      if(!document.getElementById('negWarnPopup')){
        const warn = document.createElement('div');
        warn.id = 'negWarnPopup';
        warn.textContent = 'Warning: Negative edge weights detected. Enable "Allow negative weights" or remove negative values.';
        warn.style.position = 'absolute';
        warn.style.background = '#fee2e2';
        warn.style.color = '#b91c1c';
        warn.style.padding = '6px 12px';
        warn.style.border = '1px solid #b91c1c';
        warn.style.borderRadius = '6px';
        warn.style.zIndex = 1000;
        warn.style.top = (matrixInput.offsetTop + matrixInput.offsetHeight + 4) + 'px';
        warn.style.left = (matrixInput.offsetLeft) + 'px';
        matrixInput.parentNode.appendChild(warn);
      }
    } else {
      matrixInput.classList.remove('negative-warning');
      const warn = document.getElementById('negWarnPopup');
      if(warn) warn.remove();
    }
  }

  matrixInput.addEventListener('input', checkNegativeInput);
  if(allowNegativeCheckbox) allowNegativeCheckbox.addEventListener('change', checkNegativeInput);

  function runFW(){
    const n = Math.max(1, Math.floor(Number(nodeCountEl.value)||1));
    let mat = parseMatrix(matrixInput.value, n);
    const unweighted = weightModeSelect && weightModeSelect.value === 'unweighted';
    const undirected = edgeTypeSelect && edgeTypeSelect.value === 'undirected';
    const allowNegative = allowNegativeCheckbox && allowNegativeCheckbox.checked;

    // Input validation: if negative weights exist and not allowed, show error and prevent run
    if(!allowNegative){
      let hasNegative = false;
      for(let i=0;i<n;i++) for(let j=0;j<n;j++){
        if(mat[i][j] < 0){
          hasNegative = true;
          break;
        }
      }
      if(hasNegative){
        alert('Error: Negative edge weights are not allowed. Please enable "Allow negative weights" or remove negative values.');
        return;
      }
      // Flag negative values as invalid input
      for(let i=0;i<n;i++) for(let j=0;j<n;j++){
        if(mat[i][j] < 0) mat[i][j] = INF;
      }
    }

    // apply unweighted mode
    if(unweighted){
      for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(i!==j && mat[i][j]!==INF) mat[i][j] = 1;
    }
    // symmetrize if undirected
    if(undirected){
      for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
        const a = mat[i][j]; const b = mat[j][i];
        const pick = (a===INF && b!==INF) ? b : (b===INF && a!==INF ? a : Math.min(a,b));
        mat[i][j] = mat[j][i] = pick;
      }
    }
    // block negative weights unless allowed
    if(!allowNegative){
      for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(mat[i][j] < 0) mat[i][j] = INF;
    }
  const res = floydWarshall(n, mat, allowNegative);
  lastDist = res.dist; lastNext = res.next; lastN = n;
  // expose latest results to global scope so other scripts (download.js) can access them
  try { window.lastDist = lastDist; window.lastNext = lastNext; window.lastN = lastN; } catch(e) {}
  const labels = getVertexNames(n);
  renderMatrixTable(distTable, lastDist, labels, false);
  renderMatrixTable(nextTable, lastNext, labels, true);
    pathResult.textContent = '(no path shown yet)';
    if(res.negativeCycle) pathResult.textContent = 'Warning: Negative cycle detected (results may be invalid)';
    drawGraph(n, mat, null);
  }

  // Show shortest path from selected source to destination
  function showPath() {
    if (!lastDist) return;
    const u = Number(fromNode.value), v = Number(toNode.value);
  const namesArr = getVertexNames(lastN);
  const nameOf = i => (namesArr && namesArr[i] !== undefined && namesArr[i] !== '') ? namesArr[i] : String(i);

    // Special case: source and destination are the same
    if (u === v) {
      pathResult.textContent = `Path: ${nameOf(u)}`;
      drawGraph(lastN, lastDist, [u]);
      return;
    }

    // If path is affected by a negative cycle, show NEG CYCLE warning
    if (lastDist[u][v] === -Infinity || lastNext[u][v] === 'NEG CYCLE') {
      pathResult.textContent = `Warning: Negative cycle detected, path may be invalid.`;
      drawGraph(lastN, lastDist, null);
      return;
    }

    // Path reconstruction using next matrix
    // If next[u][v] is null, there is no path
    if (lastNext[u][v] === null) {
      pathResult.textContent = `No path from ${nameOf(u)} to ${nameOf(v)}`;
      drawGraph(lastN, lastDist, null);
      return;
    }
    // Otherwise, reconstruct the path step-by-step
    const path = [u];
    let current = u;
    while (current !== v) {
      current = lastNext[current][v];
      if (current === null || current === 'NEG CYCLE') break; // safety
      path.push(current);
      if (path.length > lastN + 2) break; // safety against cycles
    }
    // If path ends at v, print it
    if (path[path.length - 1] === v) {
  const names = path.map(nameOf).join(' → ');
  pathResult.textContent = `Path: ${names}  (cost: ${lastDist[u][v]})`;
  drawGraph(lastN, lastDist, path);
    } else {
      pathResult.textContent = `No path from ${nameOf(u)} to ${nameOf(v)}`;
      drawGraph(lastN, lastDist, null);
    }
  }

  // file import
  if(fileInput){
    fileInput.addEventListener('change', (ev)=>{
      const f = ev.target.files && ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = e => {
        const txt = e.target.result;
        const rows = txt.trim().split(/[\n\r]+/).map(r=>r.trim()).filter(Boolean);
        const n = rows.length;
        nodeCountEl.value = n; applySize();
        matrixInput.value = txt;
        populateNodeSelects(n);
      };
      reader.readAsText(f);
    });
  }

  // Generate detailed step-by-step documentation
  function generateDetailedOutput(n, inputMat, dist, next, allowNegative) {
  const names = getVertexNames(n);
    let output = [];

    // Input Information
    output.push("Step 1: Input Matrix");
    output.push("Input adjacency matrix:");
    output.push("Result: Matrix dimensions " + n + "x" + n);
    output.push("• Input format: Adjacency Matrix");
    output.push("• Matrix size: " + n + "x" + n);
    output.push("• Node labels: " + names.join(", "));
    output.push("• Allow negative weights: " + (allowNegative ? "Yes" : "No"));
    output.push("=".repeat(60));

    // Initial Matrix State
    output.push("\nStep 2: Initial Matrix");
    output.push("Original adjacency matrix values:");
    for(let i = 0; i < n; i++) {
      let row = names[i] + ": ";
      for(let j = 0; j < n; j++) {
        row += (inputMat[i][j] === INF ? "INF" : inputMat[i][j]) + " ";
      }
      output.push(row);
    }
    output.push("=".repeat(60));

    // Intermediate Steps
    output.push("\nStep 3: Floyd-Warshall Execution");
    output.push("The algorithm processes through " + n + " iterations");
    output.push("• For each k from 0 to " + (n-1));
    output.push("• For each pair (i,j)");
    output.push("• Update dist[i][j] if path through k is shorter");
    output.push("Formula: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])");
    output.push("=".repeat(60));

    // Final Distance Matrix
    output.push("\nStep 4: Final Distance Matrix");
    output.push("Shortest path distances between all pairs:");
    for(let i = 0; i < n; i++) {
      let row = names[i] + " to: ";
      for(let j = 0; j < n; j++) {
        row += (dist[i][j] === INF ? "INF" : dist[i][j]) + " ";
      }
      output.push(row);
    }
    output.push("=".repeat(60));

    // Path Reconstruction Matrix
    output.push("\nStep 5: Path Reconstruction Matrix");
    output.push("Next vertex in shortest path between pairs:");
    for(let i = 0; i < n; i++) {
      let row = names[i] + " to: ";
      for(let j = 0; j < n; j++) {
  row += (next[i][j] === null ? "null" : 
    next[i][j] === 'NEG CYCLE' ? "NEG" : 
    (names[next[i][j]] !== undefined && names[next[i][j]] !== '' ? names[next[i][j]] : String(next[i][j]))) + " ";
      }
      output.push(row);
    }
    output.push("=".repeat(60));

    // Example Paths
    output.push("\nStep 6: Sample Path Examples");
    // Show a few example paths
    for(let i = 0; i < n; i++) {
      for(let j = i+1; j < n; j++) {
        const path = reconstructPath(i, j, next);
        if(path) {
          const pathStr = path.map(x => names[x]).join(" → ");
          output.push(`Path ${names[i]} to ${names[j]}: ${pathStr} (cost: ${dist[i][j]})`);
        }
      }
    }
    output.push("=".repeat(60));

    // Special Cases
    output.push("\nStep 7: Special Cases and Notes");
    // Check for negative cycles
    let hasNegCycle = false;
    for(let i = 0; i < n; i++) {
      if(dist[i][i] < 0) {
        hasNegCycle = true;
        break;
      }
    }
    output.push("• Negative cycles present: " + (hasNegCycle ? "Yes" : "No"));
    output.push("• Unreachable nodes present: " + (dist.some(row => row.includes(INF)) ? "Yes" : "No"));
    output.push("• Zero-weight self-loops: Yes (by definition)");
    output.push("=".repeat(60));

    return output.join("\n");
  }

  // export functionality
  if(exportCsvBtn){
    exportCsvBtn.addEventListener('click', ()=>{
      if(!lastDist) return alert('Run Floyd–Warshall first');
      
      // Generate both CSV and detailed output
  const names = getVertexNames(lastN);
      
      // CSV for the distance matrix
      let csv = ',' + names.join(',') + '\n';
      for(let i=0; i<lastN; i++){
        csv += names[i] + ',' + lastDist[i].map(x=> x===INF? 'INF' : String(x)).join(',') + '\n';
      }

      // Get the detailed step-by-step output
      const detailedOutput = generateDetailedOutput(
        lastN, 
        parseMatrix(matrixInput.value, lastN),
        lastDist, 
        lastNext,
        allowNegativeCheckbox && allowNegativeCheckbox.checked
      );

      // Create a zip file containing both
      const zip = new JSZip();
      zip.file("distance_matrix.csv", csv);
      zip.file("detailed_output.txt", detailedOutput);

      // Download the zip file
      zip.generateAsync({type:"blob"}).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'floyd_warshall_output.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    });
  }

  // Expose helper functions to window for external scripts (download.js)
  try {
    window.parseMatrix = parseMatrix;
    window.getVertexNames = getVertexNames;
    window.reconstructPath = reconstructPath;
  } catch(e) {}

  // events
  applySizeBtn.addEventListener('click', applySize);
  randomFillBtn.addEventListener('click', randomFill);
  runBtn.addEventListener('click', runFW);
  clearBtn.addEventListener('click', ()=>{ matrixInput.value=''; distTable.innerHTML=''; nextTable.innerHTML=''; pathResult.textContent=''; while(svg.firstChild) svg.removeChild(svg.firstChild); });
  showPathBtn.addEventListener('click', showPath);

  // init
  applySize();
})();
