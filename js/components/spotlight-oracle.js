/* ==========================================================================
   SPOTLIGHT ON ORACLE - NOC TOPOLOGY & ARCHITECTURAL MONITOR
   Provides full-screen animated NOC architectural topology:
   Clients -> Net8 -> Oracle SGA/PGA & Background Processes -> Disk I/O
   Includes real-time polling to /api/spotlight-metrics when connected.
   ========================================================================== */

class SpotlightOracle {
  constructor() {
    this.container = document.getElementById('view-spotlight');
    this.pollInterval = null;
    this.render();
    this.startLiveMonitoring();
  }

  startLiveMonitoring() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      const isVisible = this.container?.classList.contains('active');
      if (isVisible && window.TracesApp && window.TracesApp.isRealDatabase) {
        this.fetchLiveMetrics();
      }
    }, 2000);
  }

  async fetchLiveMetrics() {
    try {
      const resp = await fetch('/api/spotlight-metrics');
      if (!resp.ok) return;
      const data = await resp.json();
      this.updateWithLiveData(data);
    } catch (e) {
      // offline or disconnected
    }
  }

  updateWithLiveData(data) {
    // 1. Sessions
    const act = document.getElementById('spotlight-active-sess');
    if (act) {
      act.textContent = `${data.activeSessions || 1} Sessions`;
      act.style.color = (data.activeSessions > 20) ? '#ef4444' : '#34d399';
    }
    const inact = document.getElementById('spotlight-idle-sess');
    if (inact) inact.textContent = `${Math.max(0, (data.totalSessions || 10) - (data.activeSessions || 1))} Sessions`;
    const hwm = document.getElementById('spotlight-hwm-sess');
    if (hwm) hwm.textContent = `${data.totalSessions || 12} Sessions`;

    // 2. PGA
    const pgaAlloc = document.getElementById('spotlight-pga-alloc');
    if (pgaAlloc) pgaAlloc.textContent = `${data.pgaAllocatedMb || 120} MB`;

    // 3. SGA
    const bufRatio = document.getElementById('spot-buf-ratio');
    if (bufRatio) bufRatio.textContent = `${data.bufferHitRatio || 99.2}%`;
    const libRatio = document.getElementById('spot-lib-ratio');
    if (libRatio) libRatio.textContent = `${data.libraryHitRatio || 98.5}%`;
    const redoBuf = document.getElementById('spot-redo-buf');
    if (redoBuf) redoBuf.textContent = `${data.redoLogBufferMb || 32} MB`;

    // 4. Wait Events
    if (data.topWaitEvents && data.topWaitEvents.length > 0) {
      const tbody = document.getElementById('spotlight-events-tbody');
      if (tbody) {
        tbody.innerHTML = data.topWaitEvents.map(e => {
          const safeEv = String(e.event || '').replace(/'/g, "\\'");
          return `
          <tr style="border-bottom: 1px solid #1f2937; cursor: pointer;" title="Clique para inspecionar o Wait Event '${e.event}' e ver sessões impactadas" onclick="window.TracesApp.smartInspect('${safeEv}', 'wait_event')">
            <td style="padding: 4px; color: ${e.timeWaitedMs > 5000 ? '#f87171' : '#e2e8f0'};"><span class="toad-clickable-token">⚡ ${e.event}</span></td>
            <td style="padding: 4px; text-align: right;">${Number(e.waits).toLocaleString()}</td>
            <td style="padding: 4px; text-align: right;">${(e.timeWaitedMs / 1000).toFixed(1)}</td>
            <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:${e.timeWaitedMs > 5000 ? '#fee2e2' : '#dcfce7'}; color:${e.timeWaitedMs > 5000 ? '#b91c1c' : '#15803d'};">${e.timeWaitedMs > 5000 ? 'WARN' : 'OK'}</span></td>
          </tr>
        `;
        }).join('');
      }
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="spotlight-container">
        <!-- Top Toolbar -->
        <div class="spotlight-toolbar">
          <div class="spotlight-title">
            <span style="font-size: 16px;">💡</span>
            <span>Spotlight on Oracle - Live Architectural Topology &amp; NOC Monitor</span>
            <span class="spotlight-badge">REAL-TIME MONITOR</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; font-size: 11px;">
            <span style="color: #9ca3af;">Refresh Rate: <b>2 sec</b></span>
            <button class="btn btn-primary" onclick="window.TracesApp.spotlightOracle.simulateSpike();">Simulate Load Spike</button>
            <button class="btn" onclick="window.TracesApp.switchDockView('editor');">Back to Editor</button>
          </div>
        </div>

        <!-- 3-Column Architecture Canvas -->
        <div class="spotlight-canvas">
          
          <!-- Column 1: Client Connections & Net8 -->
          <div class="spotlight-column">
            <div class="spotlight-panel toad-interactive-card" title="Clique para abrir o Session Browser (V$SESSION)" onclick="window.TracesApp.openWindow('sessions')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">👥 User Sessions (V$SESSION)</span>
                <span class="animated-pulse-dot"></span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                <div class="sga-pool-row" onclick="event.stopPropagation(); window.TracesApp.openWindow('sessions'); window.TracesApp.sessionMonitor?.setFilter?.('active');">
                  <span class="toad-clickable-token">Active Sessions:</span>
                  <span id="spotlight-active-sess" style="font-weight: 700; color: #34d399;">5 Sessions</span>
                </div>
                <div class="sga-pool-row" onclick="event.stopPropagation(); window.TracesApp.openWindow('sessions'); window.TracesApp.sessionMonitor?.setFilter?.('inactive');">
                  <span class="toad-clickable-token">Inactive / Idle:</span>
                  <span id="spotlight-idle-sess">43 Sessions</span>
                </div>
                <div class="sga-pool-row" onclick="event.stopPropagation(); window.TracesApp.smartInspect('sessions', 'parameter');">
                  <span class="toad-clickable-token">Session High Water:</span>
                  <span id="spotlight-hwm-sess">58 Sessions</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel toad-interactive-card" title="Clique para inspecionar estatísticas SQL*Net / Net8 no Database Monitor" onclick="window.TracesApp.openWindow('dba', 'dbmonitor')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">🌐 Net8 Client Network</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>Throughput:</span>
                  <span style="color: #60a5fa; font-weight: 700;">14.2 MB/s</span>
                </div>
                <div class="sga-pool-row">
                  <span>Roundtrips / sec:</span>
                  <span>148 / s</span>
                </div>
                <div class="sga-pool-row" onclick="event.stopPropagation(); window.TracesApp.smartInspect('SQL*Net message from client', 'wait_event');">
                  <span class="toad-clickable-token">Client Message Wait:</span>
                  <span style="color: #34d399;">0.8 ms</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel toad-interactive-card" title="Clique para inspecionar PGA_AGGREGATE_TARGET e memória PGA" onclick="window.TracesApp.smartInspect('pga_aggregate_target', 'parameter')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">🧠 PGA Memory Allocation (V$PGASTAT)</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>Total Allocated:</span>
                  <span id="spotlight-pga-alloc" style="font-weight: 700; color: #a78bfa;">1,420 MB</span>
                </div>
                <div class="sga-pool-row">
                  <span class="toad-clickable-token">PGA Target:</span>
                  <span>4,096 MB (34% Used)</span>
                </div>
                <div class="sga-pool-row" onclick="event.stopPropagation(); window.TracesApp.smartInspect('workarea_size_policy', 'parameter');">
                  <span class="toad-clickable-token">In-Memory Sorts:</span>
                  <span style="color: #34d399;">100% (0 Disk Sorts)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Oracle Instance (SGA & Background Processes) -->
          <div class="spotlight-column" style="flex: 1;">
            <!-- SGA Box -->
            <div class="spotlight-panel sga-box">
              <div class="spotlight-panel-header" style="color: #93c5fd; border-bottom: 1px solid #1e40af; padding-bottom: 4px; cursor: pointer;" onclick="window.TracesApp.smartInspect('sga_target', 'parameter')">
                <span class="toad-clickable-token">🏛 System Global Area (SGA)</span>
                <span class="toad-clickable-token" style="font-size: 10px; color: #60a5fa;">SGA_TARGET</span>
              </div>

              <!-- SGA 3 Core Buffers -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div class="toad-interactive-card" style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;" title="Clique para inspecionar DB_CACHE_SIZE e Buffer Cache Hit Ratio" onclick="window.TracesApp.smartInspect('db_cache_size', 'parameter')">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Buffer Cache</div>
                  <div style="font-size: 18px; font-weight: 800; color: #34d399;" id="spot-buf-ratio">99.4%</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">Hit Ratio (Clique)</div>
                </div>

                <div class="toad-interactive-card" style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;" title="Clique para inspecionar SHARED_POOL_SIZE e session_cached_cursors" onclick="window.TracesApp.smartInspect('shared_pool_size', 'parameter')">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Shared Pool</div>
                  <div style="font-size: 18px; font-weight: 800; color: #60a5fa;" id="spot-lib-ratio">98.9%</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">Library Hit (Clique)</div>
                </div>

                <div class="toad-interactive-card" style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;" title="Clique para inspecionar LOG_BUFFER e Redo Waits" onclick="window.TracesApp.smartInspect('log_buffer', 'parameter')">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Redo Log Buffer</div>
                  <div style="font-size: 18px; font-weight: 800; color: #f59e0b;" id="spot-redo-buf">64 MB</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">0 Latches Waited</div>
                </div>
              </div>
            </div>

            <!-- Background Processes -->
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Oracle Background Engine Processes (Clique em um processo para inspecionar)</span>
                <span style="font-size: 10px; color: #34d399;">ALL HEALTHY</span>
              </div>
              <div class="processes-grid">
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo PMON" onclick="window.TracesApp.smartInspect('PMON', 'process')">
                  <div class="process-name">PMON</div>
                  <div class="process-status">ONLINE</div>
                </div>
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo SMON" onclick="window.TracesApp.smartInspect('SMON', 'process')">
                  <div class="process-name">SMON</div>
                  <div class="process-status">ONLINE</div>
                </div>
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo DBW0" onclick="window.TracesApp.smartInspect('DBW0', 'process')">
                  <div class="process-name">DBW0</div>
                  <div class="process-status">ONLINE (4 SLAVES)</div>
                </div>
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo LGWR" onclick="window.TracesApp.smartInspect('LGWR', 'process')">
                  <div class="process-name">LGWR</div>
                  <div class="process-status">FLUSHING</div>
                </div>
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo CKPT" onclick="window.TracesApp.smartInspect('CKPT', 'process')">
                  <div class="process-name">CKPT</div>
                  <div class="process-status">STANDBY</div>
                </div>
                <div class="process-node healthy toad-interactive-card" title="Clique para ver detalhes do processo ARC0 / RMAN" onclick="window.TracesApp.smartInspect('ARC0', 'process')">
                  <div class="process-name">ARC0</div>
                  <div class="process-status">IDLE</div>
                </div>
              </div>
            </div>

            <!-- Wait Events & Alarms -->
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Top System Wait Events (V$SYSTEM_EVENT — Clique em qualquer evento)</span>
                <span style="font-size: 10px; color: #f59e0b;">Live Contention Feed</span>
              </div>
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <thead>
                  <tr style="color: #94a3b8; border-bottom: 1px solid #374151; text-align: left;">
                    <th style="padding: 4px;">Wait Event</th>
                    <th style="padding: 4px; text-align: right;">Total Waits</th>
                    <th style="padding: 4px; text-align: right;">Time (s)</th>
                    <th style="padding: 4px;">Alarm</th>
                  </tr>
                </thead>
                <tbody id="spotlight-events-tbody">
                  <tr style="border-bottom: 1px solid #1f2937; cursor: pointer;" onclick="window.TracesApp.smartInspect('enq: TX - row lock contention', 'wait_event')">
                    <td style="padding: 4px; color: #f87171;"><span class="toad-clickable-token">⚡ enq: TX - row lock contention</span></td>
                    <td style="padding: 4px; text-align: right;">4</td>
                    <td style="padding: 4px; text-align: right;">45.2</td>
                    <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">WARN</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1f2937; cursor: pointer;" onclick="window.TracesApp.smartInspect('db file sequential read', 'wait_event')">
                    <td style="padding: 4px;"><span class="toad-clickable-token">⚡ db file sequential read</span></td>
                    <td style="padding: 4px; text-align: right;">14,209</td>
                    <td style="padding: 4px; text-align: right;">12.4</td>
                    <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:#dcfce7; color:#15803d;">OK</span></td>
                  </tr>
                  <tr style="cursor: pointer;" onclick="window.TracesApp.smartInspect('log file sync', 'wait_event')">
                    <td style="padding: 4px;"><span class="toad-clickable-token">⚡ log file sync</span></td>
                    <td style="padding: 4px; text-align: right;">840</td>
                    <td style="padding: 4px; text-align: right;">1.8</td>
                    <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:#dcfce7; color:#15803d;">OK</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Column 3: Storage & Disk I/O -->
          <div class="spotlight-column">
            <div class="spotlight-panel toad-interactive-card" title="Clique para abrir o ASM Storage Manager no DBA Hub" onclick="window.TracesApp.openWindow('dba', 'asm')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">💽 Disk I/O Subsystem (ASM)</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>+DATA (Datafiles):</span>
                  <span style="font-weight: 700; color: #38bdf8;">8.4 MB/s read</span>
                </div>
                <div class="sga-pool-row">
                  <span>+RECO (Archive/Redo):</span>
                  <span>1.2 MB/s write</span>
                </div>
                <div class="sga-pool-row">
                  <span>Avg I/O Latency:</span>
                  <span style="color: #34d399;">0.9 ms (Exadata NVMe)</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel toad-interactive-card" title="Clique para abrir Exadata Smart Scan & Storage Index no DBA Hub" onclick="window.TracesApp.openWindow('dba', 'exadata')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">⚡ Exadata Cell Offloading</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>Smart Scan Efficiency:</span>
                  <span style="font-weight: 700; color: #34d399;">92.4%</span>
                </div>
                <div class="sga-pool-row">
                  <span>Flash Cache Hit Ratio:</span>
                  <span style="color: #38bdf8;">98.1%</span>
                </div>
                <div class="sga-pool-row">
                  <span>Storage Index Savings:</span>
                  <span>842.6 GB</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel toad-interactive-card" title="Clique para abrir o Data Guard Manager no DBA Hub" onclick="window.TracesApp.openWindow('dba', 'dataguard')">
              <div class="spotlight-panel-header">
                <span class="toad-clickable-token">🛡 Standby Replication (Data Guard)</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>Data Guard Status:</span>
                  <span style="color: #34d399; font-weight: 700;">SYNCED</span>
                </div>
                <div class="sga-pool-row">
                  <span>Transport Lag:</span>
                  <span>0 seconds</span>
                </div>
                <div class="sga-pool-row">
                  <span>Apply Lag:</span>
                  <span>2.4 seconds</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  simulateSpike() {
    const act = document.getElementById('spotlight-active-sess');
    if (act) {
      act.textContent = '38 Sessions (SPIKE)';
      act.style.color = '#ef4444';
      window.TracesApp.notify('Simulated workload spike: 38 active sessions generated.', 'warning');
      setTimeout(() => {
        act.textContent = '5 Sessions';
        act.style.color = '#34d399';
      }, 4000);
    }
  }
}

window.SpotlightOracle = SpotlightOracle;
