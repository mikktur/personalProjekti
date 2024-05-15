"use strict";

const button = document.querySelector("#showSide");
const sidePane = document.querySelector(".sidePanel");
const menuModal = document.querySelector("#restaurantModal");
const dropBtn = document.querySelector(".dropbtn");
const dropDown = document.querySelector(".dropdown-content");
const apiUrl = "https://10.120.32.94/restaurant/api/v1/";
var map = L.map("map").setView([60.19, 24.94], 13);

async function fetchData(url, options) {
  try {
    const response = await fetch(url, options);

    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      if (response.status === 404) throw new Error("404, Not found");
      if (response.status === 500)
        throw new Error("500, internal server error");
      throw new Error(response.status);
    }
  } catch (error) {
    throw error;
  }
}
const addFilterSelections = async () => {
  const cityFilterDiv = document.querySelector("#city-filters");
  const restaurants = await fetchData(apiUrl + "restaurants");
  const cities = [
    ...new Set(restaurants.filter((r) => r.city).map((r) => r.city)),
  ];
  cities.forEach((city) => {
    const checklabelpair = document.createElement("div");
    checklabelpair.classList.add("checkbox");
    const label = document.createElement("label");
    label.setAttribute("for", city);
    label.innerText = city;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = city;
    checkbox.name = city;
    checkbox.value = city;
    checklabelpair.append(label, checkbox);
    cityFilterDiv.append(checklabelpair);
  });

  console.log(cities);
};
addFilterSelections();
const setToCurrentLocation = () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var coords = [position.coords.latitude, position.coords.longitude];
        map.setView(coords, 13);
      },
      function (error) {
        console.error("Error getting user location:", error.message);
      }
    );
  } else {
    console.error("Geolocation is not supported in this browser.");
  }
};

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
button.addEventListener("click", (e) => {
  e.preventDefault();
  sidePane.classList.toggle("active");
});
dropBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  e.preventDefault();
  dropDown.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown-content")) {
    dropDown.classList.remove("show");
  }
});
const addMarkersToMap = async () => {
  const restaurants = await fetchData(apiUrl + "restaurants");
  console.log(restaurants);
  restaurants.forEach(({ location, name, address, phone, _id, city }) => {
    if (city === "Helsinki")
      L.geoJSON(location)
        .bindPopup(
          `<h2>${name}</h2>
        <p>${address}</p>
         <p>${phone}</p>
         <a class="menu-link" data-id='${_id}'>Menu</a>
    `
        )
        .addTo(map);
  });
  map.on("popupopen", function (e) {
    const popup = e.popup;
    const menuLink = popup._contentNode.querySelector(".menu-link");
    if (menuLink) {
      menuLink.addEventListener("click", async function (event) {
        event.preventDefault();
        const id = this.getAttribute("data-id");
        await renderMenu(id);
      });
    }
  });
};
const initializeTabs = () => {
  const hideAllTabs = () => {
    const menuTabs = document.querySelectorAll(".menu-content");
    menuTabs.forEach((tab) => {
      tab.style.display = "none";
    });
    const tabs = document.querySelectorAll(".tablinks");
    tabs.forEach((button) => {
      button.classList.remove("active");
    });
  };

  const showMenuTab = (tabId) => {
    const menuTab = document.querySelector(`#${tabId}`);
    menuTab.style.display = "block";
  };

  const tabButtons = document.querySelectorAll(".tablinks");
  tabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const tabId = event.target.getAttribute("data-day") + "Menu";
      hideAllTabs();
      event.target.classList.add("active");
      showMenuTab(tabId);
    });
  });
};
initializeTabs();
const renderMenu = async (id) => {
  try {
    const { days } = await fetchData(`${apiUrl}restaurants/weekly/${id}/fi`);
    console.log(days);
    const menuTabs = document.querySelectorAll(".menu-content");
    menuTabs.forEach((tab) => {
      tab.style.display = "none";
    });
    const currentDate = new Date()
      .toLocaleDateString("fi", { weekday: "long" })
      .toLowerCase();
    days.forEach(({ date, courses }) => {
      const weekday = date.split(" ")[0].toLowerCase();
      console.log(weekday);
      const menuTab = document.querySelector(`#${weekday}Menu`);
      menuTab.innerHTML = "";
      if (courses.length === 0) {
        menuTab.innerHTML = "<span>NO MENU AVAILABLE</span>";
        menuTab.classList.add("randomclass");
      } else {
        const menuTable = document.createElement("table");
        menuTable.classList.add("menu");
        menuTab.appendChild(menuTable);
        const tr = document.createElement("tr");
        const thName = document.createElement("th");
        const thPrice = document.createElement("th");
        const thDiet = document.createElement("th");
        thDiet.innerText = "Allergeenit";
        thName.innerText = "Nimi";
        thPrice.innerHTML = "Hinta";
        tr.append(thName, thPrice, thDiet);
        menuTable.appendChild(tr);

        courses.forEach((course) => {
          const tr = document.createElement("tr");
          const mName = document.createElement("td");
          const mPrice = document.createElement("td");
          const mDiet = document.createElement("td");
          mName.innerText = course.name;

          mPrice.innerText = course.price ? course.price : "Ei tiedossa";

          mDiet.innerText = course.diets ? course.diets : "Ei tiedossa";
          tr.append(mName, mPrice, mDiet);
          menuTable.append(tr);
        });
      }
    });

    const tabs = document.querySelectorAll(".tablinks");
    tabs.forEach((button) => {
      button.classList.remove("active");
    });
    const activeButton = document.querySelector(
      `button[data-day="${currentDate}"]`
    );
    activeButton.classList.toggle("active");
    const activeTab = document.querySelector("#" + currentDate + "Menu");
    activeTab.style.display = "block";
  } catch (e) {
    menuModal.insertAdjacentHTML = `<h2>${e.message}</h2>`;
  }
  menuModal.classList.toggle("active");
};

document.addEventListener("click", (e) => {
  if (!e.target.closest("#restaurantModal")) {
    menuModal.classList.remove("active");
  }
});
addMarkersToMap();
