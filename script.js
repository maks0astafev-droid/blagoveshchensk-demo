let selectedLayer = null;
let projectsData = {};
let activeLayers = {};
let modelFeatures = {};

const map = L.map('map').setView([50.290, 127.540], 13);

const models = [
  {
    file: 'model.geojson',
    name: 'Общая пространственная модель',
    visible: false,
    color: '#7f0000'
  },
  {
    file: 'model_1.geojson',
    name: 'Транспортно-пространственная связанность и межрегиональная доступность территории',
    visible: false,
    color: '#1f78b4'
  },
  {
    file: 'model_2.geojson',
    name: 'Природно-экологический и рекреационный потенциал территории',
    visible: false,
    color: '#33a02c'
  },
  {
    file: 'model_3.geojson',
    name: 'Социокультурный и туристско-экономический потенциал территории',
    visible: false,
    color: '#6a3d9a'
  },
  {
    file: 'model_4.geojson',
    name: 'Экономическая эффективность и масштаб туристической деятельности',
    visible: false,
    color: '#ff7f00'
  },
  {
    file: 'model_5.geojson',
    name: 'Инфраструктурное обеспечение туристической деятельности',
    visible: false,
    color: '#b15928'
  },
  {
    file: 'model_6.geojson',
    name: 'Событийно-социальная привлекательность территории',
    visible: false,
    color: '#e31a1c'
  },
  {
    file: 'model_7.geojson',
    name: 'Пространственная концентрация туристических зон',
    visible: false,
    color: '#008080'
  },
  {
    file: 'model_8.geojson',
    name: 'Экономическая результативность туристической отрасли',
    visible: true,
    color: '#ef476f'
  }
];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

document.getElementById('toggle-sidebar').addEventListener('click', function() {
  document.body.classList.toggle('sidebar-collapsed');
  setTimeout(() => map.invalidateSize(), 300);
});
document.getElementById('mobile-toggle-sidebar').addEventListener('click', function() {
  document.body.classList.toggle('sidebar-collapsed');
  setTimeout(() => map.invalidateSize(), 300);
});

document.getElementById('toggle-analysis').addEventListener('click', function() {
  document.body.classList.toggle('analysis-collapsed');
  setTimeout(() => map.invalidateSize(), 300);
});
document.getElementById('mobile-toggle-analysis').addEventListener('click', function() {
  document.body.classList.toggle('analysis-collapsed');
  setTimeout(() => map.invalidateSize(), 300);
});

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  draw: {
    polygon: true,
    polyline: true,
    marker: true,
    rectangle: true,
    circle: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems,
    remove: true
  }
});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function(event) {
  drawnItems.clearLayers();

  const drawnLayer = event.layer;
  drawnItems.addLayer(drawnLayer);

  const drawnGeoJSON = drawnLayer.toGeoJSON();

  document.getElementById('analysis-status').innerHTML = `
    Геометрия выделения создана.<br>
    Тип: <b>${drawnGeoJSON.geometry.type}</b>
  `;

  renderIntersectionAnalysis(drawnGeoJSON);
});

document.getElementById('clear-selection-btn').addEventListener('click', function() {
  drawnItems.clearLayers();

  document.getElementById('analysis-status').innerHTML = `
    Нарисуйте полигон, линию или точку на карте.
  `;
});

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');

  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}

function getColor(weight, baseColor) {

  const w = Math.max(0, Math.min(1, Number(weight) || 0));

  const base = hexToRgb(baseColor);

  const lightFactor = 0.5 - w * 0.4;

  const r = base.r + (255 - base.r) * lightFactor;
  const g = base.g + (255 - base.g) * lightFactor;
  const b = base.b + (255 - base.b) * lightFactor;

  return rgbToHex(r, g, b);
}

function defaultStyle(feature, model) {
  return {
    fillColor: getColor(Number(feature.properties["вес"]), model.color || '#800026'),
    weight: 0.25,
    opacity: 0.35,
    color: '#292323',
    fillOpacity: 0.5
  };
}

function selectedStyle() {
  return {
    weight: 2.5,
    color: '#111',
    fillOpacity: 0.95
  };
}

function parseNumbers(value) {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    return value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }

  return [];
}

function getGroupNumber(projectNumber) {
  return String(projectNumber).split('.')[0];
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

function renderSidebar(props, modelName) {
  const content = document.getElementById('content');
  const numbers = parseNumbers(props["Номера"]);
  const grouped = {};

  numbers.forEach(number => {
    const groupNumber = getGroupNumber(number);

    if (!grouped[groupNumber]) grouped[groupNumber] = [];

    if (projectsData[number]) {
      grouped[groupNumber].push({
        number,
        ...projectsData[number]
      });
    } else {
      grouped[groupNumber].push({
        number,
        territory: 'Проект не найден в projects.json'
      });
    }
  });

  let html = `
    <div class="polygon-info">
      <h3>Выбранная территория</h3>
      <div><b>Модель:</b> ${modelName}</div>
      <div><b>ID:</b> ${props.id ?? '—'}</div>
      <div><b>Вес ячейки:</b> ${formatValue(props["вес"])}</div>
    </div>
  `;

  Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(groupNumber => {
      const groupTitle = projectsData[groupNumber]?.territory || `Группа ${groupNumber}`;

      html += `
        <div class="group-block">
          <h3>${groupNumber}. ${groupTitle}</h3>
      `;

      grouped[groupNumber]
        .sort((a, b) => Number(b.final_weight || 0) - Number(a.final_weight || 0))
        .forEach(project => {
          html += `
            <details class="project-card">
              <summary>
                <span class="project-number">${project.number}</span>
                <span class="project-title">${formatValue(project.territory)}</span>
              </summary>

              <div class="project-details">
                <p><b>Описание:</b><br>${formatValue(project.description)}</p>
                <p><b>Референсная программа:</b><br>${formatValue(project.reference_programs)}</p>
                <p><b>Доп. влияние на другие факторы:</b><br>${formatValue(project.additional_characteristics)}</p>
                <p><b>Доп. вес:</b> ${formatValue(project.additional_weight)}</p>
                <p><b>Итоговый вес:</b> ${formatValue(project.final_weight)}</p>
              </div>
            </details>
          `;
        });

      html += `</div>`;
    });

  content.innerHTML = html;
}

function renderIntersectionAnalysis(drawnGeoJSON) {
  const resultsContainer = document.getElementById('analysis-results');
  let html = '';

  models.forEach(model => {
    const features = modelFeatures[model.file];
    if (!features) return;

    const projectStats = {};

    features.forEach(feature => {
      try {
        if (!turf.booleanIntersects(drawnGeoJSON, feature)) return;

        const numbers = parseNumbers(feature.properties["Номера"]);

        numbers.forEach(number => {
          const project = projectsData[number];
          if (!project) return;

          if (!projectStats[number]) {
            projectStats[number] = {
              number,
              territory: project.territory,
              description: project.description,
              reference_programs: project.reference_programs,
              additional_characteristics: project.additional_characteristics,
              additional_weight: project.additional_weight,
              final_weight: Number(project.final_weight || 0),
              count: 0
            };
          }

          projectStats[number].count++;
        });

      } catch (error) {
        console.warn('Ошибка пересечения:', error);
      }
    });

    const projects = Object.values(projectStats);

    if (projects.length === 0) return;

    const quantitative = [...projects].sort((a, b) => b.count - a.count);
    const qualitative = [...projects].sort((a, b) => b.final_weight - a.final_weight);

    html += `
      <details class="analysis-model">
        <summary>${model.name}</summary>

        <div class="analysis-tabs">
          <div class="analysis-section">
            <h4>Количественный анализ</h4>
            ${quantitative.map(p => `
              <div class="analysis-item">
                <b>${p.number}</b> — ${formatValue(p.territory)}<br>
                Количество пересечений: <b>${p.count}</b>
              </div>
            `).join('')}
          </div>

          <div class="analysis-section">
            <h4>Качественный анализ</h4>
            ${qualitative.map(p => `
              <details class="project-card">
                <summary>
                  <b>${p.number}</b> — ${formatValue(p.territory)}
                  <br>Итоговый вес: <b>${formatValue(p.final_weight)}</b>
                </summary>

                <div class="project-details">
                  <p><b>Описание:</b><br>${formatValue(p.description)}</p>
                  <p><b>Референсная программа:</b><br>${formatValue(p.reference_programs)}</p>
                  <p><b>Доп. влияние на другие факторы:</b><br>${formatValue(p.additional_characteristics)}</p>
                  <p><b>Доп. вес:</b> ${formatValue(p.additional_weight)}</p>
                  <p><b>Итоговый вес:</b> ${formatValue(p.final_weight)}</p>
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      </details>
    `;
  });

  resultsContainer.innerHTML = html || 'Пересечений с моделями не найдено.';
}

function createGeoJsonLayer(geojson, model) {
  return L.geoJSON(geojson, {
    style: function(feature) {
      return defaultStyle(feature, model);
    },

    onEachFeature: function(feature, layer) {
      layer.defaultStyle = defaultStyle(feature, model);

      layer.on('click', function() {
        if (selectedLayer) {
          selectedLayer.setStyle(selectedLayer.defaultStyle);
        }

        selectedLayer = layer;
        layer.setStyle(selectedStyle());

        renderSidebar(feature.properties, model.name);
      });
    }
  });
}

function renderLayerMenu() {
  const container = document.getElementById('layer-controls');

  container.innerHTML = models.map(model => `
    <label class="layer-item">
      <input 
        type="checkbox" 
        data-file="${model.file}" 
        ${model.visible ? 'checked' : ''}
      >
      <span>${model.name}</span>
    </label>
  `).join('');

  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', function() {
      const file = this.dataset.file;
      const layer = activeLayers[file];

      if (!layer) return;

      if (this.checked) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);

        if (selectedLayer && layer.hasLayer(selectedLayer)) {
          selectedLayer = null;
          document.getElementById('content').innerHTML = 'Нажмите на полигон';
        }
      }
    });
  });
}

Promise.all([
  fetch('data/projects.json').then(response => response.json()),
  ...models.map(model =>
    fetch(`data/${model.file}`)
      .then(response => response.json())
      .then(geojson => ({ model, geojson }))
  )
])
.then(([projects, ...loadedModels]) => {
  projectsData = projects;

  loadedModels.forEach(({ model, geojson }) => {
    modelFeatures[model.file] = geojson.features;

    const layer = createGeoJsonLayer(geojson, model);
    activeLayers[model.file] = layer;

    if (model.visible) {
      layer.addTo(map);
    }
  });

  renderLayerMenu();
})
.catch(error => {
  console.error('Ошибка загрузки данных:', error);
  document.getElementById('content').innerHTML = `
    <b>Ошибка загрузки данных.</b><br>
    Проверь наличие всех GeoJSON-файлов и projects.json.
  `;
});

window.addEventListener('load', function() {

  if (window.innerWidth <= 900) {

    document.body.classList.add('sidebar-collapsed');
    document.body.classList.add('analysis-collapsed');

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

  }

});

setTimeout(() => {
  map.invalidateSize();
}, 500);

window.addEventListener('resize', function() {
  map.invalidateSize();
});