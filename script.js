const map = L.map('map').setView([50.290, 127.540], 13);

L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap contributors'
  }
).addTo(map);

function getColor(weight) {
    return weight > 0.7 ? '#800026' :
           weight > 0.5 ? '#BD0026' :
           weight > 0.3 ? '#E31A1C' :
           weight > 0.1 ? '#FC4E2A' :
                          '#FD8D3C';
}

fetch('data/model.geojson')
  .then(response => response.json())
  .then(data => {

    L.geoJSON(data, {

      style: function(feature) {

        return {
          fillColor: getColor(feature.properties["вес"]),
          weight: 0.3,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7
        };
      },

      onEachFeature: function(feature, layer) {

        layer.on('click', function() {

          const props = feature.properties;

          document.getElementById('content').innerHTML = `
            <div class="project">
              <b>ID:</b> ${props.id}<br>
              <b>Вес:</b> ${props["вес"]}<br>
              <b>Номера:</b><br>
              ${props["Номера"]}
            </div>
          `;
        });
      }

    }).addTo(map);

  });