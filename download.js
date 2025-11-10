// Handle download functionality safely after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('downloadBtn');
    if(!btn) {
        console.warn('downloadBtn not found in DOM');
        return;
    }

    btn.addEventListener('click', async function() {
        console.log('Download button clicked. Debug info:', {
            lastDist: window.lastDist,
            lastNext: window.lastNext,
            lastN: window.lastN,
            parseMatrix: !!window.parseMatrix,
            getVertexNames: !!window.getVertexNames,
            reconstructPath: !!window.reconstructPath
        });

        if(!window.lastDist || !window.lastNext) {
            alert('Please run Floyd–Warshall first (click "Run Floyd–Warshall").');
            return;
        }

        const n = window.lastN;
        if(!n || typeof n !== 'number') {
            alert('Internal error: node count missing. Please re-run the algorithm.');
            return;
        }

        // Ensure helper functions exist
        const pm = window.parseMatrix || function(text,n){ return []; };
        const gv = window.getVertexNames || function(){ return []; };
        const rp = window.reconstructPath || function(){ return null };

        const inputMat = pm(document.getElementById('matrixInput').value, n);
        const names = gv(n).length ? gv(n) : Array.from({length:n}, (_,i) => String.fromCharCode(65 + i));

        // Convert current SVG graph (if present) to PNG data URL so it can be embedded in the report.
        async function svgElementToPngDataUrl(svgEl){
            try{
                if(!svgEl) return null;
                const rect = svgEl.getBoundingClientRect();
                const width = parseInt(svgEl.getAttribute('width') || rect.width || 700, 10);
                const height = parseInt(svgEl.getAttribute('height') || rect.height || 400, 10);
                const serializer = new XMLSerializer();
                let svgString = serializer.serializeToString(svgEl);
                // Ensure namespace
                if(!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
                    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                // Add xml declaration
                svgString = '<?xml version="1.0" standalone="no"?>\n' + svgString;

                const imgSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

                // Create image and draw onto canvas
                const img = new Image();
                // Avoid tainting: set crossOrigin if needed (if external images are embedded, this may fail)
                img.crossOrigin = 'anonymous';
                const p = new Promise((resolve, reject) => {
                    img.onload = () => {
                        try{
                            // use devicePixelRatio for better resolution
                            const ratio = window.devicePixelRatio || 1;
                            const canvas = document.createElement('canvas');
                            canvas.width = Math.max(1, Math.floor(width * ratio));
                            canvas.height = Math.max(1, Math.floor(height * ratio));
                            const ctx = canvas.getContext('2d');
                            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0,0,canvas.width,canvas.height);
                            ctx.drawImage(img, 0, 0, width, height);
                            const dataUrl = canvas.toDataURL('image/png');
                            resolve(dataUrl);
                        }catch(e){
                            resolve(null);
                        }
                    };
                    img.onerror = (err) => resolve(null);
                });
                img.src = imgSrc;
                return await p;
            }catch(err){
                return null;
            }
        }

        // Build HTML content for a Word-compatible .doc file. Word can open HTML documents saved with
        // the .doc extension when the blob MIME is application/msword. We'll include inline styles
        // so formatting and alignment are preserved when the user opens the file.
        function cellText(v){
            if(v === Infinity) return 'INF';
            if(v === -Infinity) return '-INF';
            if(v === null) return '---';
            return String(v);
        }

        function matrixToTable(mat, rowNames, colNames){
            let html = '<table class="matrix">';
            // header
            html += '<tr><th></th>' + (colNames || rowNames).map(h => '<th>' + escapeHtml(h) + '</th>').join('') + '</tr>';
            for(let i=0;i<mat.length;i++){
                html += '<tr>';
                html += '<th>' + escapeHtml(rowNames[i]) + '</th>';
                const row = mat[i] || [];
                for(let j=0;j<(colNames || rowNames).length;j++){
                    const v = row[j];
                    html += '<td>' + escapeHtml(cellText(v)) + '</td>';
                }
                html += '</tr>';
            }
            html += '</table>';
            return html;
        }

        function escapeHtml(s){
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\"/g, '&quot;');
        }

        const hasNeg = (()=>{ for(let i=0;i<n;i++) if(window.lastDist && window.lastDist[i] && window.lastDist[i][i] < 0) return true; return false; })();

    // Capture the SVG visualization (if present) and convert to PNG for embedding
    const svgEl = document.getElementById('graphSvg');
    const graphDataUrl = await svgElementToPngDataUrl(svgEl);

        // Collect user inputs so we can include them in the report
        const nodeCountEl = document.getElementById('nodeCount');
        const vertexNamesEl = document.getElementById('vertexNames');
        const edgeTypeEl = document.getElementById('edgeType');
        const weightModeEl = document.getElementById('weightMode');
        const allowNegativeEl = document.getElementById('allowNegative');
        const matrixInputEl = document.getElementById('matrixInput');

        const userInputs = {
            nodeCount: nodeCountEl ? nodeCountEl.value : (n || ''),
            vertexNames: vertexNamesEl ? vertexNamesEl.value : names.join(', '),
            edgeType: edgeTypeEl ? edgeTypeEl.value : '',
            weightMode: weightModeEl ? weightModeEl.value : '',
            allowNegative: allowNegativeEl ? (allowNegativeEl.checked ? 'Yes' : 'No') : 'Unknown',
            rawMatrixText: matrixInputEl ? matrixInputEl.value : ''
        };

        let htmlParts = [];
        htmlParts.push('<!doctype html><html><head><meta charset="utf-8" />');
        htmlParts.push('<title>Floyd–Warshall Report</title>');
        htmlParts.push('<style> body{font-family:Segoe UI, Arial, sans-serif; margin:20px;} h1{color:#1f2937;} table.matrix{border-collapse:collapse; margin:8px 0 16px 0;} table.matrix th, table.matrix td{border:1px solid #9ca3af; padding:6px 10px; text-align:center;} table.matrix th{background:#f3f4f6; font-weight:600;} .section{margin-top:20px;} .meta{color:#374151; font-size:0.95em; margin-bottom:8px;} ul.paths{margin:6px 0 16px 18px;} .note{font-size:0.95em; color:#111827;} </style>');
        htmlParts.push('</head><body>');
        htmlParts.push('<h1>Floyd–Warshall Execution Report</h1>');
        htmlParts.push('<div class="meta">Generated: ' + escapeHtml((new Date()).toLocaleString()) + '</div>');

        // Step 1: Input
        htmlParts.push('<div class="section"><h2>Step 1 — Input Matrix</h2>');
        htmlParts.push('<div class="meta">Matrix size: ' + n + ' × ' + n + ' &nbsp;|&nbsp; Node labels: ' + escapeHtml(names.join(', ')) + '</div>');

        // User-specified options
        htmlParts.push('<div class="meta"><strong>User Inputs</strong><br>');
        htmlParts.push('Number of nodes: ' + escapeHtml(userInputs.nodeCount) + '<br>');
        htmlParts.push('Vertex names: ' + escapeHtml(userInputs.vertexNames) + '<br>');
        htmlParts.push('Edge type: ' + escapeHtml(userInputs.edgeType) + '<br>');
        htmlParts.push('Weight mode: ' + escapeHtml(userInputs.weightMode) + '<br>');
        htmlParts.push('Allow negative weights: ' + escapeHtml(userInputs.allowNegative) + '</div>');

        // (Raw adjacency matrix input removed from report by request)
        htmlParts.push('<h3>Original adjacency matrix</h3>');
        htmlParts.push(matrixToTable(inputMat, names));
        htmlParts.push('</div>');

        // Step 2: Final distance
        htmlParts.push('<div class="section"><h2>Step 2 — Final Distance Matrix</h2>');
        htmlParts.push(matrixToTable(window.lastDist, names));
        htmlParts.push('</div>');

        // Step 3: Next matrix
        htmlParts.push('<div class="section"><h2>Step 3 — Next Vertex Matrix (for path reconstruction)</h2>');
        // convert lastNext into printable matrix
        const nextPrintable = (function(){
            const out = [];
            for(let i=0;i<n;i++){
                out[i] = [];
                for(let j=0;j<n;j++){
                    const v = window.lastNext && window.lastNext[i] ? window.lastNext[i][j] : null;
                    if(v === null) out[i][j] = null;
                    else if(v === 'NEG CYCLE') out[i][j] = 'NEG CYCLE';
                    else if(typeof v === 'number') out[i][j] = names[v];
                    else out[i][j] = String(v);
                }
            }
            return out;
        })();
        htmlParts.push(matrixToTable(nextPrintable, names));
        htmlParts.push('</div>');

        // Step 4: Sample shortest paths
        htmlParts.push('<div class="section"><h2>Step 4 — Sample Shortest Paths</h2>');
        htmlParts.push('<ul class="paths">');
        for(let i=0;i<n;i++){
            for(let j=i+1;j<n;j++){
                if(window.lastNext && window.lastNext[i] && window.lastNext[i][j] === 'NEG CYCLE'){
                    htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': <strong>[NEGATIVE CYCLE AFFECTS PATH]</strong></li>');
                    continue;
                }
                if(!(window.lastNext && window.lastNext[i] && window.lastNext[i][j] !== undefined)){
                    htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': <em>[UNAVAILABLE]</em></li>');
                    continue;
                }
                if(window.lastNext[i][j] === null){
                    htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': <em>[NO PATH]</em></li>');
                    continue;
                }

                try{
                    const path = rp(i,j,window.lastNext);
                    if(path && Array.isArray(path)){
                        const safePath = path.filter(p => typeof p === 'number').map(x => escapeHtml(names[x]));
                        const cost = (window.lastDist && window.lastDist[i]) ? (window.lastDist[i][j] === -Infinity ? '-INF' : escapeHtml(cellText(window.lastDist[i][j]))) : 'N/A';
                        htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': ' + safePath.join(' → ') + ' (cost: ' + cost + ')</li>');
                    } else {
                        htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': <em>[UNAVAILABLE]</em></li>');
                    }
                } catch(err){
                    console.warn('Path reconstruction failed for', i, j, err);
                    htmlParts.push('<li>Path ' + escapeHtml(names[i]) + ' → ' + escapeHtml(names[j]) + ': <em>[RECONSTRUCTION ERROR]</em></li>');
                }
            }
        }
        htmlParts.push('</ul>');
        htmlParts.push('</div>');

        // Include Graph image (if we were able to render it)
        if(graphDataUrl){
            htmlParts.push('<div class="section"><h2>Graph Visualization</h2>');
            htmlParts.push('<div class="meta">This image reflects the graph visualization generated in the demo.</div>');
            htmlParts.push('<img src="' + graphDataUrl + '" style="max-width:100%;height:auto;border:1px solid #ddd;padding:4px;background:#fff;" alt="Graph visualization" />');
            htmlParts.push('</div>');
        } else {
            htmlParts.push('<div class="section"><h2>Graph Visualization</h2>');
            htmlParts.push('<div class="meta">Graph image unavailable (SVG may contain external resources or be empty). You can copy the visualization manually if required.</div>');
            htmlParts.push('</div>');
        }

        // Notes
        htmlParts.push('<div class="section"><h3>Notes</h3>');
        htmlParts.push('<p class="note">• Negative cycles present: <strong>' + (hasNeg? 'Yes' : 'No') + '</strong></p>');
        htmlParts.push('<p class="note">• File generated by local Floyd–Warshall demo</p>');
        htmlParts.push('</div>');

        htmlParts.push('</body></html>');

        const content = htmlParts.join('\n');
        const blob = new Blob([content], {type: 'application/msword'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'floyd_warshall_report.doc';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
});