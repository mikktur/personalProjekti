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
  restaurants.forEach(({ location, name, address, phone, _id }) => {
    console.log(_id);
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

const renderMenu = async (id) => {
  console.log(id);
  const dailyMenu = await fetchData(`${apiUrl}restaurants/daily/${id}/fi`);
  console.log(dailyMenu);
  const menuModal = document.querySelector("#modal-content");
};
addMarkersToMap();
