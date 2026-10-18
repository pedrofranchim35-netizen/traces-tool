/* ==========================================================================
   SPOTLIGHT ON ORACLE - NOC TOPOLOGY & ARCHITECTURAL MONITOR
   Provides full-screen animated NOC architectural topology:
   Clients -> Net8 -> Oracle SGA/PGA & Background Processes -> Disk I/O
   ========================================================================== */

class SpotlightOracle {
  constructor() {
    this.container = document.getElementById('view-spotlight');
    this.refreshInterval = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="spotlight-container">
        <!-- Top Toolbar -->
        <div class="spotlight-toolbar">
          <div class="spotlight-title">
            <span style="font-size: 16px;">💡</span>
            <span>Spotlight on Oracle - Exadata RAC01 Architectural Topology</span>
            <span class="spotlight-badge">LIVE NOC MONITOR</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; font-size: 11px;">
            <span style="color: #9ca3af;">Refresh Rate: <b>1 sec</b></span>
            <button class="btn btn-primary" onclick="window.TracesApp.spotlightOracle.simulateSpike();">Simulate Load Spike</button>
            <button class="btn" onclick="window.TracesApp.switchDockView('editor');">Back to Editor</button>
          </div>
        </div>

        <!-- 3-Column Architecture Canvas -->
        <div class="spotlight-canvas">
          
          <!-- Column 1: Client Connections & Net8 -->
          <div class="spotlight-column">
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>User Sessions (V$SESSION)</span>
                <span class="animated-pulse-dot"></span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                <div class="sga-pool-row">
                  <span>Active Sessions:</span>
                  <span id="spotlight-active-sess" style="font-weight: 700; color: #34d399;">5 Sessions</span>
                </div>
                <div class="sga-pool-row">
                  <span>Inactive / Idle:</span>
                  <span>43 Sessions</span>
                </div>
                <div class="sga-pool-row">
                  <span>Session High Water:</span>
                  <span>58 Sessions</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Net8 Client Network</span>
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
                <div class="sga-pool-row">
                  <span>Client Message Wait:</span>
                  <span style="color: #34d399;">0.8 ms</span>
                </div>
              </div>
            </div>

            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>PGA Memory Allocation</span>
              </div>
              <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                <div class="sga-pool-row">
                  <span>Total Allocated:</span>
                  <span style="font-weight: 700; color: #a78bfa;">1,420 MB</span>
                </div>
                <div class="sga-pool-row">
                  <span>PGA Target:</span>
                  <span>4,096 MB (34% Used)</span>
                </div>
                <div class="sga-pool-row">
                  <span>In-Memory Sorts:</span>
                  <span style="color: #34d399;">100% (0 Disk Sorts)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Oracle Instance (SGA & Background Processes) -->
          <div class="spotlight-column" style="flex: 1;">
            <!-- SGA Box -->
            <div class="spotlight-panel sga-box">
              <div class="spotlight-panel-header" style="color: #93c5fd; border-bottom: 1px solid #1e40af; padding-bottom: 4px;">
                <span>System Global Area (SGA) - 16 GB Allocated</span>
                <span style="font-size: 10px; color: #60a5fa;">SGA_TARGET = 16G</span>
              </div>

              <!-- SGA 3 Core Buffers -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Buffer Cache</div>
                  <div style="font-size: 18px; font-weight: 800; color: #34d399;" id="spot-buf-ratio">99.4%</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">Hit Ratio (10.2 GB)</div>
                </div>

                <div style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Shared Pool</div>
                  <div style="font-size: 18px; font-weight: 800; color: #60a5fa;">98.9%</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">Library Hit (4.8 GB)</div>
                </div>

                <div style="background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 4px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Redo Log Buffer</div>
                  <div style="font-size: 18px; font-weight: 800; color: #f59e0b;">64 MB</div>
                  <div style="font-size: 9.5px; color: #cbd5e1;">0 Latches Waited</div>
                </div>
              </div>
            </div>

            <!-- Background Processes -->
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Oracle Background Engine Processes</span>
                <span style="font-size: 10px; color: #34d399;">ALL HEALTHY</span>
              </div>
              <div class="processes-grid">
                <div class="process-node healthy" title="Process Monitor: Cleans up failed processes">
                  <div class="process-name">PMON</div>
                  <div class="process-status">ONLINE</div>
                </div>
                <div class="process-node healthy" title="System Monitor: Instance recovery & extent coalescing">
                  <div class="process-name">SMON</div>
                  <div class="process-status">ONLINE</div>
                </div>
                <div class="process-node healthy" title="Database Writer: Writes dirty blocks from buffer cache to disk">
                  <div class="process-name">DBW0</div>
                  <div class="process-status">ONLINE (4 SLAVES)</div>
                </div>
                <div class="process-node healthy" title="Log Writer: Writes redo log buffer to online redo log files">
                  <div class="process-name">LGWR</div>
                  <div class="process-status">FLUSHING</div>
                </div>
                <div class="process-node healthy" title="Checkpoint: Signals DBWn and updates datafile headers">
                  <div class="process-name">CKPT</div>
                  <div class="process-status">STANDBY</div>
                </div>
                <div class="process-node healthy" title="Archiver: Archives online redo logs to +RECO diskgroup">
                  <div class="process-name">ARC0</div>
                  <div class="process-status">IDLE</div>
                </div>
              </div>
            </div>

            <!-- Wait Events & Alarms -->
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Top System Wait Events (V$SYSTEM_EVENT)</span>
                <span style="font-size: 10px; color: #f59e0b;">1 Contention Warning</span>
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
                <tbody>
                  <tr style="border-bottom: 1px solid #1f2937;">
                    <td style="padding: 4px; color: #f87171;">enq: TX - row lock contention</td>
                    <td style="padding: 4px; text-align: right;">4</td>
                    <td style="padding: 4px; text-align: right;">45.2</td>
                    <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">WARN</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1f2937;">
                    <td style="padding: 4px;">db file sequential read</td>
                    <td style="padding: 4px; text-align: right;">14,209</td>
                    <td style="padding: 4px; text-align: right;">12.4</td>
                    <td style="padding: 4px;"><span class="toad-conn-badge-indicator" style="background:#dcfce7; color:#15803d;">OK</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 4px;">log file sync</td>
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
            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Disk I/O Subsystem (ASM)</span>
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

            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Exadata Cell Offloading</span>
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

            <div class="spotlight-panel">
              <div class="spotlight-panel-header">
                <span>Standby Replication</span>
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
