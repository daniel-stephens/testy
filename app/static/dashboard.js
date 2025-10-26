document.addEventListener("DOMContentLoaded", () => {
    const modelName = document.getElementById("modelName").textContent;
  
    // -------- State
    let themeChartInstance = null;
    let themeTrendChart = null;
    let scatterChartInstance = null;
    let docInferenceChart = null;
    let currentDocs = [];
    let dashboard = null;              // whole bundle
    let themeColorMap = {};            // { [id]: color }
  
    // -------- Utils
    function generateColors(count) {
      const colors = [];
      const golden = 137.508;
      for (let i = 0; i < count; i++) {
        const hue = (i * golden) % 360;
        const saturation = 70 + (i % 2) * 10;
        const lightness = 55 + (i % 3) * 5;
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
      return colors;
    }
  
    function lightBgFromColor(color) {
      // hsl(...) -> hsla(..., 0.12)
      if (color.startsWith("hsl(")) return color.replace("hsl(", "hsla(").replace(")", ", 0.12)");
      // rgb(...) -> rgba(..., 0.12)
      if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", ", 0.12)");
      // #hex -> simple very light gray fallback
      return "rgba(0,0,0,0.04)";
    }
  
    // -------- Chart helpers
    function createThemeChartData(themes) {
      return {
        labels: themes.map(t => t.label),
        ids: themes.map(t => t.id),
        meta: themes.map(t => ({ id: t.id, color: t.color, keywords: t.keywords })), // keywords: string
        datasets: [{
          data: themes.map(t => t.document_count),
          backgroundColor: themes.map(t => t.color || "#0d6efd")
        }]
      };
    }
  
    function renderThemeChart(chartData) {
      // color map for all other charts
      themeColorMap = {};
      chartData.meta.forEach(m => { themeColorMap[m.id] = m.color || "#0d6efd"; });
  
      const ctx = document.getElementById("themeChart").getContext("2d");
      if (themeChartInstance) themeChartInstance.destroy();
  
      themeChartInstance = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const i = ctx.dataIndex;
                  const count = ctx.parsed.y;
                  const meta = chartData.meta?.[i];
                  const raw = meta?.keywords || "—";
                  if (typeof raw !== "string") return [`${count} documents`, "Keywords: —"];
                  const words = raw.split(", ").map(w => w.trim());
                  const lines = [];
                  for (let j = 0; j < words.length; j += 5) lines.push(words.slice(j, j + 5).join(", "));
                  return [`${count} documents`, "Keywords:"].concat(lines);
                }
              }
            }
          },
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 30 } },
            y: { beginAtZero: true, title: { display: true, text: "Documents" } }
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const meta = chartData.meta?.[idx];
            if (!meta) return;
            openThemeModal(meta.id, meta.color || "#0d6efd");
          }
        }
      });
    }
  
    function renderDocInferenceChart(topThemes = [], modelName = "") {
      const canvas = document.getElementById("docInferenceChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (docInferenceChart) docInferenceChart.destroy();
  
      const getColor = id => themeColorMap[Number(id)] || "#0d6efd";
      const backgroundColors = topThemes.map(t => getColor(t.theme_id));
  
      docInferenceChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topThemes.map(t => t.label),
          datasets: [{ data: topThemes.map(t => t.score), backgroundColor: backgroundColors }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, max: 1 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const t = topThemes[ctx.dataIndex];
                  const pct = (ctx.parsed.y * 100).toFixed(1);
                  const kws = (t.keywords || "No keywords").split(", ").map(k => k.trim());
                  const lines = [];
                  for (let i = 0; i < kws.length; i += 5) lines.push(kws.slice(i, i + 5).join(", "));
                  return [`Score: ${pct}%`, "Keywords:"].concat(lines);
                }
              }
            }
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const theme = topThemes[idx];
            openThemeModal(theme.theme_id, themeColorMap[theme.theme_id] || "#0d6efd");
          }
        }
      });
    }
  
    function plotScatterChart(data) {
      const ctx = document.getElementById("themeChartGrid").getContext("2d");
      if (scatterChartInstance) scatterChartInstance.destroy();
  
      const minSize = Math.min(...data.map(d => d.size));
      const maxSize = Math.max(...data.map(d => d.size));
      const normalize = s => {
        const minR = 10, maxR = 40;
        if (maxSize === minSize) return (minR + maxR) / 2;
        return ((s - minSize) / (maxSize - minSize)) * (maxR - minR) + minR;
      };
  
      const points = data.map(d => {
        const solid = themeColorMap[d.id] || "rgb(66,133,244)";
        const fill = solid.startsWith("hsl(")
          ? solid.replace("hsl(", "hsla(").replace(")", ", 0.2)")
          : solid.replace("rgb(", "rgba(").replace(")", ", 0.2)");
        return {
          x: d.x, y: d.y, r: normalize(d.size),
          label: d.label, id: d.id, keywords: d.keywords || [],
          color: solid, backgroundColor: fill, borderColor: solid
        };
      });
  
      const labelPlugin = {
        id: "themeLabels",
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((pt, i) => {
            const { x, y } = pt.getCenterPoint();
            ctx.fillStyle = "#000";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(points[i].label, x, y);
          });
          ctx.restore();
        }
      };
  
      scatterChartInstance = new Chart(ctx, {
        type: "scatter",
        data: {
          datasets: [{
            label: "Themes",
            data: points,
            backgroundColor: points.map(p => p.backgroundColor),
            borderColor: points.map(p => p.borderColor),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: 20 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const p = points[ctx.dataIndex];
                  const kws = Array.isArray(p.keywords) ? p.keywords : [];
                  const lines = [];
                  for (let i = 0; i < kws.length; i += 5) lines.push(kws.slice(i, i + 5).join(", "));
                  return [p.label, "Keywords:"].concat(lines);
                }
              }
            }
          },
          elements: {
            point: {
              radius: ctx => points[ctx.dataIndex].r || 20,
              hoverRadius: ctx => (points[ctx.dataIndex].r || 20) * 1.2
            }
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const p = points[idx];
            openThemeModal(p.id, p.color || "#0d6efd");
          },
          scales: {
            x: { ticks: { display: false }, grid: { color: "rgba(0,0,0,0.1)" } },
            y: { ticks: { display: false }, grid: { color: "rgba(0,0,0,0.1)" } }
          }
        },
        plugins: [labelPlugin]
      });
    }
  
    function renderThemeSimilarityChart(similarThemes) {
      const canvas = document.getElementById("similarityDotPlot");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
  
      const processed = (similarThemes || [])
        .map(t => ({ id: t.ID, theme: `Theme ${t.ID}`, similarity: parseFloat(t.Similarity) }))
        .sort((a, b) => Math.abs(b.similarity) - Math.abs(a.similarity));
  
      const labels = processed.map(t => t.theme);
      const values = processed.map(t => t.similarity);
      const colors = processed.map(t => themeColorMap[t.id] || "#4B8DF8");
  
      if (window.similarityDotPlot instanceof Chart) window.similarityDotPlot.destroy();
  
      window.similarityDotPlot = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets: [{ label: "Similarity Score", data: values, backgroundColor: colors, borderRadius: 4 }] },
        options: {
          indexAxis: "y",
          responsive: true,
          scales: { x: { min: -1, max: 1, ticks: { stepSize: 0.2 }, title: { display: true, text: "Similarity Score - Correlation Between Main theme and other themes" } } },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `Similarity: ${ctx.raw.toFixed(3)}` } }
          },
          onClick: (e, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const t = processed[idx];
            openThemeModal(t.id, themeColorMap[t.id] || "#0d6efd");
          }
        }
      });
    }
  
    // -------- Tables & filters
    function renderDocumentTable(docs = []) {
      currentDocs = docs;
  
      const thead = document.getElementById("docTableHead");
      const tbody = document.getElementById("docTableBody");
      thead.innerHTML = "";
      tbody.innerHTML = "";
  
      if (docs.length === 0) {
        thead.innerHTML = `<tr><th>No data</th></tr>`;
        tbody.innerHTML = `<tr><td class="text-muted">No documents to display.</td></tr>`;
        return;
      }
  
      const hasRationale = docs.some(doc => "rationale" in doc);
      const columns = hasRationale ? ["id", "text", "theme", "rationale", "score"] : ["id", "text", "theme", "score"];
  
      const columnWidths = hasRationale ? {
        id: "12%", text: "38%", theme: "20%", rationale: "20%", score: "3%"
      } : {
        id: "10%", text: "70%", theme: "10%", score: "3%"
      };
  
      const headerRow = document.createElement("tr");
      columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, " ");
        th.classList.add("small-text", "align-middle", "text-nowrap");
        th.style.width = columnWidths[col] || "auto";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
  
      docs.forEach(doc => {
        const row = document.createElement("tr");
        const searchBlob = [doc.id, doc.text, doc.theme, doc.rationale ?? "", String(doc.score ?? "")]
          .join(" ").toLowerCase();
        row.dataset.search = searchBlob;
        row.classList.add("small-text");
        row.addEventListener("click", () => showInferenceModal(doc));
  
        columns.forEach(col => {
          const td = document.createElement("td");
          let value = doc[col];
          if (col === "score" && typeof value === "number") {
            td.textContent = value.toFixed(3);
            td.title = value.toFixed(3);
          } else {
            td.textContent = value !== undefined && value !== null ? String(value) : "—";
            td.title = td.textContent;
          }
          td.classList.add("truncate-cell", "small-text");
          td.style.width = columnWidths[col] || "auto";
          row.appendChild(td);
        });
  
        tbody.appendChild(row);
      });
    }
  
    function populateThemeFilter(docs) {
      const themeFilter = document.getElementById("themeFilter");
      themeFilter.innerHTML = `<option value="">All</option>`;
      const set = [...new Set(docs.map(d => d.theme).filter(Boolean))];
      set.forEach(theme => {
        const opt = document.createElement("option");
        opt.value = theme;
        opt.textContent = theme;
        themeFilter.appendChild(opt);
      });
    }
  
    function applyFilters() {
      const theme = document.getElementById("themeFilter").value;
      const minScore = parseFloat(document.getElementById("scoreMin").value);
      const maxScore = parseFloat(document.getElementById("scoreMax").value);
  
      const filtered = currentDocs.filter(doc => {
        const matchTheme = !theme || doc.theme === theme;
        const matchMin = isNaN(minScore) || doc.score >= minScore;
        const matchMax = isNaN(maxScore) || doc.score <= maxScore;
        return matchTheme && matchMin && matchMax;
      });
  
      renderDocumentTable(filtered);
      const searchEvent = new Event("input");
      document.getElementById("docSearchInput").dispatchEvent(searchEvent);
    }
  
    document.getElementById("docSearchInput").addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      const rows = document.querySelectorAll("#docTableBody tr");
      rows.forEach(row => {
        const content = row.dataset.search || "";
        row.style.display = content.includes(query) ? "" : "none";
      });
    });
    document.getElementById("filteredSearchInput").addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#filteredTableBody tr");
      rows.forEach(row => {
        const content = row.dataset.search || "";
        row.style.display = content.includes(term) ? "" : "none";
      });
    });
    document.getElementById("filterBtn").onclick = applyFilters;
  
    function populateThemeDiagnosticsTable(themes = []) {
      const tableHead = document.querySelector("#themeStatsTable thead");
      const tableBody = document.querySelector("#themeStatsTable tbody");
      const wrapper = document.querySelector("#themeStatsTable").parentElement;
      if (!tableHead || !tableBody || !wrapper) return console.error("Diagnostics table elements not found");
  
      tableHead.innerHTML = "";
      tableBody.innerHTML = "";
  
      if (themes.length === 0) {
        tableHead.innerHTML = `<tr><th>No Data</th></tr>`;
        tableBody.innerHTML = `<tr><td class="text-muted">No diagnostics available.</td></tr>`;
        return;
      }
  
      const allKeys = Object.keys(themes[0]);
      const dynamicKeys = allKeys.filter(k => k !== "theme");
      const columns = ["theme", ...dynamicKeys];
  
      const headerRow = document.createElement("tr");
      columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        th.style.position = "sticky"; th.style.top = "0"; th.style.backgroundColor = "#fff"; th.style.zIndex = "1";
        headerRow.appendChild(th);
      });
      tableHead.appendChild(headerRow);
  
      themes.forEach(theme => {
        const row = document.createElement("tr");
        columns.forEach(col => {
          let value = theme[col];
          if (typeof value === "number") {
            value = col.toLowerCase().includes("prevalence") ? `${(value * 100).toFixed(1)}%` : value.toFixed(3);
          }
          const td = document.createElement("td");
          td.title = value ?? "—";
          td.textContent = value ?? "—";
          row.appendChild(td);
        });
        tableBody.appendChild(row);
      });
    }
  
    function renderThemeMetrics(metrics = []) {
      const container = document.getElementById("themeInsightsGrid");
      container.innerHTML = "";
      metrics.forEach(metric => {
        const col = document.createElement("div");
        col.className = "col-md-6";
        col.innerHTML = `
          <div class="d-flex justify-content-between align-items-center p-3 rounded bg-light shadow-sm">
            <div class="text-muted small fw-semibold">${metric.label}</div>
            <div class="fw-bold text-dark small">${typeof metric.value === "number" ? metric.value.toFixed(2) : metric.value}</div>
          </div>
        `;
        container.appendChild(col);
      });
    }
  
    // -------- Theme modal (from bundle)
    function openThemeModal(themeId, themeColor) {
      const t = dashboard.themes.find(x => x.id === Number(themeId));
      if (!t) return;
  
      const modalContent = document.getElementById("themeModalContent");
      modalContent.style.backgroundColor = lightBgFromColor(themeColor);
  
      const modalTitle = document.getElementById("selectedThemeLabel");
      modalTitle.style.color = themeColor;
      modalTitle.style.borderLeft = `6px solid ${themeColor}`;
      modalTitle.style.paddingLeft = "0.5rem";
  
      document.querySelectorAll("#themeDetailModal .panel").forEach(panel => {
        panel.style.borderColor = themeColor;
        panel.style.boxShadow = `0 0 0 1px ${themeColor}`;
      });
  
      document.getElementById("selectedThemeLabel").textContent = t.label;
      document.getElementById("selectedThemeSummary").textContent = t.summary || "—";
  
      // small diagnostics card set from bundle if present (fallback to zeros)
      const diag = (dashboard.diagnostics || []).find(d => d.theme === t.label) || {};
      const diagContainer = document.getElementById("themeDiagnosticsGrid");
      diagContainer.innerHTML = "";
      const diagnostics = {
        "Prevalence": (typeof diag.prevalence === "number") ? `${(diag.prevalence * 100).toFixed(3)}%` : "—",
        "Coherence": (typeof diag.coherence === "number") ? diag.coherence.toFixed(3) : "—",
        "Keyword Uniqueness": (typeof diag.uniqueness === "number") ? diag.uniqueness.toFixed(3) : "—",
        "Document Matches": (typeof diag.theme_matches === "number") ? String(diag.theme_matches) : "—"
      };
      Object.entries(diagnostics).forEach(([label, value]) => {
        const div = document.createElement("div");
        div.innerHTML = `<div class="border rounded p-2 bg-light-subtle h-100 small">
          <strong>${label}:</strong> <span class="text-muted">${value}</span>
        </div>`;
        diagContainer.appendChild(div);
      });
  
      // keywords (themes.keywords is a string for bar tooltip; split to badges)
      const kwContainer = document.getElementById("selectedThemeKeywords");
      kwContainer.innerHTML = "";
      const kwArr = typeof t.keywords === "string" ? t.keywords.split(", ").map(k => k.trim()) : (t.keywords || []);
      kwArr.forEach(k => {
        const badge = document.createElement("span");
        badge.className = "badge bg-light text-dark border me-1 mb-1";
        badge.textContent = k;
        kwContainer.appendChild(badge);
      });
  
      // docs filtered by theme label
      const themedDocs = (dashboard.documents || []).filter(d => d.theme === t.label);
      renderFilteredTable(themedDocs);
  
      // similarities from bundle
      renderThemeSimilarityChart(dashboard.similarities?.[String(themeId)] || []);
  
      const modalEl = document.getElementById("themeDetailModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  
    function renderFilteredTable(filters = []) {
      const thead = document.getElementById("filteredTableHead");
      const tbody = document.getElementById("filteredTableBody");
      thead.innerHTML = "";
      tbody.innerHTML = "";
  
      if (filters.length === 0) {
        thead.innerHTML = `<tr class="small"><th>No data</th></tr>`;
        tbody.innerHTML = `<tr class="small"><td class="text-muted">No documents to display.</td></tr>`;
        return;
      }
  
      const baseColumns = ["id", "text", "score"];
      const hasRationale = filters.some(f => f.hasOwnProperty("rationale"));
      const columns = hasRationale ? [...baseColumns, "rationale"] : baseColumns;
  
      const headerRow = document.createElement("tr");
      headerRow.classList.add("small");
      columns.forEach(col => {
        const th = document.createElement("th");
        th.classList.add("small");
        th.textContent = col.charAt(0).toUpperCase() + col.slice(1);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
  
      filters
        .slice()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .forEach(filter => {
          const row = document.createElement("tr");
          row.classList.add("small");
          row.dataset.search = [filter.id, filter.text, String(filter.score ?? ""), filter.rationale ?? ""].join(" ").toLowerCase();
          row.addEventListener("click", () => showInferenceModal?.(filter));
  
          columns.forEach(col => {
            const td = document.createElement("td");
            td.classList.add("small", "truncate-cell");
            let value = filter[col];
            if (col === "score" && typeof value === "number") value = value.toFixed(3);
            td.textContent = value ?? "—";
            td.title = td.textContent;
            row.appendChild(td);
          });
  
          tbody.appendChild(row);
        });
    }
  
    // -------- Inference (unchanged wiring)
    async function showInferenceModal(doc) {
      try {
        const response = await fetch("/text-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: doc.text, id: doc.id, model: modelName })
        });
        const result = await response.json();
  
        document.getElementById("modalFullText").textContent = doc.text || "—";
        document.getElementById("modalTheme").textContent = result.theme || "—";
  
        const topTheme = result.top_themes?.[0];
        const keywordsRaw = topTheme?.keywords || "—";
        const formatted = typeof keywordsRaw === "string"
          ? keywordsRaw.split(", ").reduce((acc, word, idx) => {
              const line = Math.floor(idx / 5);
              acc[line] = acc[line] ? acc[line] + ", " + word : word;
              return acc;
            }, []).join("\n")
          : keywordsRaw;
        document.getElementById("modalKeywords").textContent = formatted;
  
        const rationale = result.rationale?.trim();
        const rationaleDiv = document.getElementById("rationalDiv");
        if (rationale) {
          if (!rationaleDiv) {
            const newDiv = document.createElement("div");
            newDiv.id = "rationalDiv";
            newDiv.className = "mb-3";
            newDiv.innerHTML = `
              <strong>Rationale:</strong>
              <p id="modalRationale" class="fst-italic small text-muted mb-0" style="white-space: pre-wrap;"></p>`;
            document.getElementById("inferenceOutput").appendChild(newDiv);
          }
          document.getElementById("modalRationale").textContent = rationale;
        } else if (rationaleDiv) {
          rationaleDiv.remove();
        }
  
        renderDocInferenceChart(result.top_themes, modelName);
  
        const modal = new bootstrap.Modal(document.getElementById("docDetailModal"), { backdrop: true, focus: true });
        modal.show();
      } catch (error) {
        console.error("Inference failed:", error);
        alert("Failed to infer topic.");
      }
    }
  
    // -------- One fetch to rule them all
    async function fetchDashboard(modelName) {
      const res = await fetch("/get-dashboard-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Dashboard fetch failed: ${res.status} - ${txt}`);
      }
      return res.json();
    }
  
    // -------- Boot
    (async () => {
      try {
        dashboard = await fetchDashboard(modelName);
  
        // Colors: use provided or generate deterministically
        const colors = generateColors(dashboard.themes.length);
        dashboard.themes = dashboard.themes.map((t, i) => ({ ...t, color: t.color || colors[i] }));
  
        // Render charts + tables
        const chartData = createThemeChartData(dashboard.themes);
        renderThemeChart(chartData);
  
        renderDocumentTable(dashboard.documents || []);
        populateThemeFilter(dashboard.documents || []);
        populateThemeDiagnosticsTable(dashboard.diagnostics || []);
        plotScatterChart(dashboard.coordinates || []);
        renderThemeMetrics(dashboard.metrics || []);
  
        // Toggle panel wiring stays the same
        const toggleMetricBtn = document.getElementById("toggleMetricBtn");
        const themeMetricsPanel = document.getElementById("themeMetricsPanel");
        const modelMetricsPanel = document.getElementById("modelMetricsPanel");
        toggleMetricBtn.addEventListener("click", () => {
          const showingTheme = !themeMetricsPanel.classList.contains("d-none");
          themeMetricsPanel.classList.toggle("d-none", showingTheme);
          modelMetricsPanel.classList.toggle("d-none", !showingTheme);
          toggleMetricBtn.textContent = showingTheme ? "Switch to Theme Metrics" : "Switch to Model Metrics";
        });
  
        document.getElementById("themeDetailModal").addEventListener("hidden.bs.modal", () => {
          if (themeTrendChart instanceof Chart) { themeTrendChart.destroy(); themeTrendChart = null; }
        });
  
      } catch (e) {
        console.error(e);
        alert("Failed to load dashboard.");
      }
    })();
  
  });
  