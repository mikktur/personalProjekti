const button = document.querySelector('#showSide');
const sidePane = document.querySelector('.sidePanel');
const menuModal = document.querySelector('#restaurantModal');
const dropBtn = document.querySelectorAll('.dropbtn');
const dropDown = document.querySelector('.dropdown-content');
const settingsLink = document.getElementById('settings-link');
const settingsForm = document.getElementById('settingsForm');
const apiUrl = 'https://10.120.32.94/restaurant/api/v1/';
var map = L.map('map').setView([60.19, 24.94], 13);
const filters = [];
const registerLink = document.querySelector('#register');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
button.addEventListener('click', (e) => {
  e.preventDefault();
  sidePane.classList.toggle('active');
});
dropBtn.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    dropDown.classList.toggle('show');
  });
});
settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  renderSettingsForm();
  document.getElementById('settingsModal').showModal();
});
const renderSettingsForm = () => {
  const {username, email} = JSON.parse(sessionStorage.getItem('user'));
  settingsForm.innerHTML = `<input type="text" name="username" placeholder="${username}" />
  <input type="password" name="password" placeholder="password" />
  <input type="text" name="email" placeholder="${email}" />
  <button type="submit">Save</button>
  <button type="button" id="cancelButton">Cancel</button>`;
  document.getElementById('cancelButton').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('settingsModal').close();
  });
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-content')) {
    dropDown.classList.remove('show');
  }
});
registerLink.addEventListener('click', (e) => {
  e.preventDefault();
  const registerDia = document.querySelector('#register-dialog');
  registerDia.showModal();
});

const setToCurrentLocation = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var coords = [position.coords.latitude, position.coords.longitude];
        map.setView(coords, 13);
      },
      function (error) {
        console.error('Error getting user location:', error.message);
      }
    );
  } else {
    console.error('Geolocation is not supported in this browser.');
  }
};
async function fetchData(url, options) {
  try {
    const response = await fetch(url, options);
    console.log(response);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    throw error;
  }
}
const addFilterSelections = async (user) => {
  const cityFilterDiv = document.querySelector('#city-filters');
  const restaurants = await fetchData(apiUrl + 'restaurants');
  const cities = [
    ...new Set(restaurants.filter((r) => r.city).map((r) => r.city)),
  ];
  cities.forEach((city) => {
    const checklabelpair = document.createElement('div');
    checklabelpair.classList.add('checkbox');
    const label = document.createElement('label');
    label.setAttribute('for', city);
    label.innerText = city;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = city;
    checkbox.name = city;

    checkbox.addEventListener('change', function () {
      if (this.checked) {
        filters.push(city);
      } else {
        const index = filters.indexOf(city);
        if (index !== -1) {
          filters.splice(index, 1);
        }
      }
      addMarkersToMap(user);
    });
    checklabelpair.append(label, checkbox);
    cityFilterDiv.append(checklabelpair);
  });
};

const addMarkersToMap = async (logged) => {
  const restaurants = await fetchData(apiUrl + 'restaurants');
  const user = logged ? JSON.parse(sessionStorage.getItem('user')) : '';
  const favorite = logged ? user.favouriteRestaurant : '';
  console.log(restaurants);

  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  restaurants.forEach(({location, name, address, phone, _id, city}) => {
    if (filters.length === 0 || filters.includes(city)) {
      let icon = false;
      const meatIcon = L.icon({
        iconUrl: 'meat.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [-3, -76],
      });
      [location.coordinates[0], location.coordinates[1]] = [
        location.coordinates[1],
        location.coordinates[0],
      ];
      if (user) {
        if (_id === favorite) {
          console.log('test');
          icon = true;
        }
      }
      const marker = L.marker(
        location.coordinates,
        icon ? {icon: meatIcon} : {}
      )
        .bindPopup(
          `<h2>${name}</h2>
          <p>${address}</p>
          <p>${phone}</p>
          <a class="menu-link" data-id='${_id}'>Menu</a><br>
          <a  id="favorite" data-id='${_id}'>add to favorites!</a>`
        )
        .addTo(map);

      marker.on('popupopen', function (e) {
        const popup = e.popup;
        const menuLink = popup._contentNode.querySelector('.menu-link');
        const favoriteLink = popup._contentNode.querySelector('#favorite');
        if (menuLink) {
          menuLink.addEventListener('click', async function (event) {
            event.preventDefault();
            const id = this.getAttribute('data-id');
            await renderMenu(id);
          });
        }
        favoriteLink.addEventListener('click', async function (event) {
          event.preventDefault();
          if (user) {
            const id = this.getAttribute('data-id');
            console.log(id);
            const token = sessionStorage.getItem('token');
            try {
              const newUser = await updateInfo(token, id);
              sessionStorage.setItem('user', JSON.stringify(newUser.data));
              addMarkersToMap(user);
            } catch (e) {
              console.error(e.message);
            }
          }
        });
      });
    }
  });
};

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const formData = new FormData(e.target);
  const username = formData.get('username');
  const password = formData.get('password');
  const email = formData.get('email');
  const token = sessionStorage.getItem('token');
  try {
    await updateInfo(token, undefined, username, password, email);
    location.reload();
  } catch (e) {
    console.error(e.message);
  }
});
// not sure if this is a good approach but it works...
const updateInfo = async (token, restaurant, username, password, email) => {
  const bodyContent = {
    username: username ? username : undefined,
    favouriteRestaurant: restaurant ? restaurant : undefined,
    password: password ? password : undefined,
    email: email ? email : undefined,
  };
  const options = {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyContent),
  };
  try {
    const result = await fetchData(apiUrl + `users`, options);
    return result;
  } catch (e) {
    throw e;
  }
};
document
  .getElementById('register-form')
  .addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    register(formData);
    event.target.reset();
  });
const register = async (formData) => {
  const bodyContent = {
    username: formData.get('username'),
    password: formData.get('password'),
    email: formData.get('email'),
  };
  console.log(bodyContent);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyContent),
  };
  try {
    const result = await fetchData(apiUrl + `users`, options);
    console.log(result);
  } catch (e) {
    console.log(e);
  }
};
document
  .getElementById('loginForm')
  .addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const username = formData.get('username');
    const password = formData.get('password');
    login(username, password);
    event.target.reset();
  });

const login = async (userName, password) => {
  const bodyContent = {
    username: userName,
    password: password,
  };
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyContent),
  };
  try {
    const result = await fetchData(apiUrl + `auth/login`, options);
    if (result) {
      console.log(result.data);
      sessionStorage.setItem('token', result.token);
      sessionStorage.setItem('user', JSON.stringify(result.data));
      console.log(sessionStorage.getItem('token'));
      location.reload();
    }
  } catch (e) {
    const loginerror = document.querySelector('#login-error');
    loginerror.innerText = e.message;
  }
};

const logout = () => {
  sessionStorage.clear();
  location.reload();
};
document.getElementById('logout-btn').addEventListener('click', (e) => {
  logout();
});
const initializeTabs = () => {
  const hideAllTabs = () => {
    const menuTabs = document.querySelectorAll('.menu-content');
    menuTabs.forEach((tab) => {
      tab.style.display = 'none';
    });
    const tabs = document.querySelectorAll('.tablinks');
    tabs.forEach((button) => {
      button.classList.remove('active');
    });
  };

  const showMenuTab = (tabId) => {
    const menuTab = document.querySelector(`#${tabId}`);
    menuTab.style.display = 'block';
  };

  const tabButtons = document.querySelectorAll('.tablinks');
  tabButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const tabId = event.target.getAttribute('data-day') + 'Menu';
      hideAllTabs();
      event.target.classList.add('active');
      showMenuTab(tabId);
    });
  });
};
initializeTabs();

const renderMenu = async (id) => {
  console.log(id);
  try {
    let processedDays = new Set();
    const {days} = await fetchData(`${apiUrl}restaurants/weekly/${id}/fi`);
    const menuTabs = document.querySelectorAll('.menu-content');
    menuTabs.forEach((tab) => {
      tab.style.display = 'none';
    });
    const currentDate = new Date()
      .toLocaleDateString('fi', {weekday: 'long'})
      .toLowerCase();
    days.forEach(({date, courses}) => {
      const weekday = date.split(' ')[0].toLowerCase();
      const menuTab = document.querySelector(`#${weekday}Menu`);
      menuTab.innerHTML = '';

      if (courses && courses.length > 0) {
        const menuTable = document.createElement('table');
        menuTable.classList.add('menu');
        menuTab.appendChild(menuTable);

        const tr = document.createElement('tr');
        const thName = document.createElement('th');
        const thPrice = document.createElement('th');
        const thDiet = document.createElement('th');
        thDiet.innerText = 'Allergeenit';
        thName.innerText = 'Nimi';
        thPrice.innerHTML = 'Hinta';
        tr.append(thName, thPrice, thDiet);
        menuTable.appendChild(tr);

        courses.forEach((course) => {
          const tr = document.createElement('tr');
          const mName = document.createElement('td');
          const mPrice = document.createElement('td');
          const mDiet = document.createElement('td');
          mName.innerText = course.name;
          mPrice.innerText = course.price ? course.price : 'Ei tiedossa';
          mDiet.innerText = course.diets ? course.diets : 'Ei tiedossa';
          tr.append(mName, mPrice, mDiet);
          menuTable.append(tr);
        });

        processedDays.add(weekday);
      } else {
        menuTab.innerHTML = '<span>NO MENU AVAILABLE</span>';
        menuTab.classList.add('randomclass');
      }
    });

    //backup if some days are missing ie. weekends
    [
      'maanantai',
      'tiistai',
      'keskiviikko',
      'torstai',
      'perjantai',
      'lauantai',
      'sunnuntai',
    ].forEach((day) => {
      if (!processedDays.has(day)) {
        const menuTab = document.querySelector(`#${day}Menu`);
        menuTab.innerHTML = '<span>NO MENU AVAILABLE</span>';
        menuTab.classList.add('randomclass');
      }
    });

    const tabs = document.querySelectorAll('.tablinks');
    tabs.forEach((button) => {
      button.classList.remove('active');
    });
    const activeButton = document.querySelector(
      `button[data-day="${currentDate}"]`
    );
    activeButton.classList.toggle('active');
    const activeTab = document.querySelector('#' + currentDate + 'Menu');
    activeTab.style.display = 'block';
  } catch (e) {
    menuModal.insertAdjacentHTML = `<h2>${e.message}</h2>`;
  }
  menuModal.classList.toggle('active');
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('#restaurantModal')) {
    menuModal.classList.remove('active');
  }
});

const checkSession = async () => {
  if (sessionStorage.getItem('token') && sessionStorage.getItem('user')) {
    try {
      const fetchOptions = {
        headers: {
          Authorization: 'Bearer ' + sessionStorage.getItem('token'),
        },
      };
      const response = await fetch(apiUrl + 'users/token', fetchOptions);
      const json = await response.json();
      if (!response.ok) {
        return false;
      } else {
        return json;
      }
    } catch (e) {
      console.log(e.message);
    }
  } else {
    return false;
  }
};

(async () => {
  await setToCurrentLocation();
  const user = await checkSession();
  console.log(user);
  if (user) {
    sessionStorage.setItem('user', JSON.stringify(user));
    document.getElementById('avatar-container').style.display = 'block';
    document.getElementById('logged').style.display = 'block';
    addMarkersToMap(true);
    addFilterSelections(true);
  } else {
    document.getElementById('loginBtn').style.display = 'flex';
    document.getElementById('logged-out').style.display = 'flex';
    addMarkersToMap();
    addFilterSelections();
  }
})();

