let selectedLayer = null;
let projectsData = {};

const map = L.map('map').setView([50.290, 127.540], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function getColor(weight) {
  return weight > 0.7 ? '#800026' :
         weight > 0.5 ? '#BD0026' :
         weight > 0.3 ? '#E31A1C' :
         weight > 0.1 ? '#FC4E2A' :
                        '#FD8D3C';
}

function defaultStyle(feature) {
  return {
    fillColor: getColor(Number(feature.properties["вес"])),
    weight: 0.3,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
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
  if (Array.isArray(value)) {
    return value.map(String);
  }

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

function renderSidebar(props) {
  const content = document.getElementById('content');

  const numbers = parseNumbers(props["Номера"]);

  const grouped = {};

  numbers.forEach(number => {
    const groupNumber = getGroupNumber(number);

    if (!grouped[groupNumber]) {
      grouped[groupNumber] = [];
    }

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

Promise.all([
  fetch('data/projects.json').then(response => response.json()),
  fetch('data/model.geojson').then(response => response.json())
])
.then(([projects, geojson]) => {
  projectsData = projects;

  L.geoJSON(geojson, {
    style: defaultStyle,

    onEachFeature: function(feature, layer) {
      layer.on('click', function() {
        if (selectedLayer) {
          selectedLayer.setStyle(defaultStyle(selectedLayer.feature));
        }

        selectedLayer = layer;
        layer.setStyle(selectedStyle());

        renderSidebar(feature.properties);
      });
    }
  }).addTo(map);
})
.catch(error => {
  console.error('Ошибка загрузки данных:', error);
  document.getElementById('content').innerHTML = `
    <b>Ошибка загрузки данных.</b><br>
    Проверь model.geojson и projects.json.
  `;
});